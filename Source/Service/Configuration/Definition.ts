/**
 * @module Definition (Configuration)
 * @description The live implementation of the Configuration service.
 */

import { Effect, Ref } from "effect";
import type { ConfigurationChangeEvent } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPCProvider } from "../IPC.js";
import { LogProvider } from "../Log.js";
import { CreateWorkSpaceConfiguration } from "./CreateWorkSpaceConfiguration.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const Log = yield* _(LogProvider.Tag);
	const ConfigCache = yield* _(Ref.make<object>({}));
	const OnDidChangeEvent = CreateEventStream<ConfigurationChangeEvent>();

	// Register the handler for when Mountain pushes a configuration update.
	IPC.RegisterInvokeHandler(
		"$acceptConfigurationChanged",
		([change, newConfig]) =>
			Effect.gen(function* (_) {
				yield* _(Ref.set(ConfigCache, newConfig));
				yield* _(
					OnDidChangeEvent.Fire({
						affectsConfiguration: (section: string, scope?: any) =>
							change.keys.includes(section),
					}),
				);
			}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		GetConfiguration: (Section, Scope) =>
			IPC.SendRequest<object>("$getConfiguration", [Section, Scope]).pipe(
				Effect.tap((newConfig) => Ref.set(ConfigCache, newConfig)),
				Effect.map((newConfig) =>
					CreateWorkSpaceConfiguration(
						newConfig,
						Section ?? "",
						IPC,
						Log,
					),
				),
			),
		OnDidChangeConfiguration: OnDidChangeEvent.Stream,
	};

	return ServiceImplementation;
});
