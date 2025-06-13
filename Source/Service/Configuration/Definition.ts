/**
 * @module Definition (Configuration)
 * @description The live implementation of the Configuration service.
 */

import { Effect, Ref, Stream } from "effect";
import type { ConfigurationChangeEvent } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { CreateWorkSpaceConfiguration } from "./CreateWorkSpaceConfiguration.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);
	const ConfigCache = yield* _(Ref.make<object>({}));
	const OnDidChangeEvent = CreateEventStream<ConfigurationChangeEvent>();

	// Register the handler for when Mountain pushes a configuration update.
	IPCService.RegisterInvokeHandler(
		"$acceptConfigurationChanged",
		([newConfig, change]) =>
			Effect.gen(function* (_) {
				yield* _(Ref.set(ConfigCache, newConfig));
				yield* _(
					OnDidChangeEvent.Fire({
						affectsConfiguration: (section: string, scope?: any) =>
							// A real implementation would need to check the scope properly.
							change.keys.includes(section),
					}),
				);
			}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		GetConfiguration: (Section, Scope) =>
			IPCService.SendRequest<object>("$getConfiguration", [
				Section,
				Scope,
			]).pipe(
				Effect.tap((newConfig) => Ref.set(ConfigCache, newConfig)),
				Effect.map((newConfig) =>
					CreateWorkSpaceConfiguration(
						newConfig,
						Section ?? "",
						IPCService,
						LogService,
					),
				),
			),
		onDidChangeConfiguration: OnDidChangeEvent.Stream.pipe(Stream.toEvent),
	};

	return ServiceImplementation;
});
