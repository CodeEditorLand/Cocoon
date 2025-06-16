/*
 * File: Cocoon/Source/Service/Configuration/Definition.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:14 UTC
 * Dependency: ../../Utility/CreateEventStream.js, ../IPC/Service.js, ../Log/Service.js, ./CreateWorkSpaceConfiguration.js, ./Service.js, effect, vscode
 */

/**
 * @module Definition (Configuration)
 * @description The live implementation of the Configuration service.
 */

import { Effect, Ref } from "effect";
import type { ConfigurationChangeEvent } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import CreateWorkSpaceConfiguration from "./CreateWorkSpaceConfiguration.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Configuration service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Log = yield* LogService;
	const ConfigCache = yield* Ref.make<object>({});
	const OnDidChangeEvent = CreateEventStream<ConfigurationChangeEvent>();

	// Register the handler for when Mountain pushes a configuration update.
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler(
			"$acceptConfigurationChanged",
			([NewConfig, Change]) =>
				Effect.gen(function* () {
					yield* Ref.set(ConfigCache, NewConfig);
					yield* OnDidChangeEvent.Fire({
						affectsConfiguration: (Section: string, _Scope?: any) =>
							// A real implementation would need to check the scope properly.
							Change.keys.includes(Section),
					});
				}).pipe(Effect.runPromise),
		),
	);

	const ConfigurationImplementation: Service["Type"] = {
		GetConfiguration: (Section, Scope) =>
			IPC.SendRequest<object>("$getConfiguration", [Section, Scope]).pipe(
				Effect.tap((NewConfig) => Ref.set(ConfigCache, NewConfig)),
				Effect.map((NewConfig) =>
					CreateWorkSpaceConfiguration(
						NewConfig,
						Section ?? "",
						IPC,
						Log,
					),
				),
			),
		onDidChangeConfiguration: OnDidChangeEvent.event,
	};

	return ConfigurationImplementation;
});
