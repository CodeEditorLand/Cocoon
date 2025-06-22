/*
 * File: Cocoon/Source/Service/Configuration/Definition.ts
 *
 * This file contains the live implementation of the Configuration service.
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
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Log = yield* G(LogService);

	const ConfigCache = yield* G(Ref.make<object>({}));
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
