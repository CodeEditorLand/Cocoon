/**
 * @module Definition (Configuration)
 * @description The live implementation of the Configuration service.
 */

import { Effect, Ref } from "effect";
import type { ConfigurationChangeEvent } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc.js";
import { LogProvider } from "../Log.js";
import { CreateWorkspaceConfiguration } from "./CreateWorkspaceConfiguration.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const Log = yield* _(LogProvider.Tag);
	const ConfigCache = yield* _(Ref.make<object>({}));
	const OnDidChangeEvent = CreateEventStream<ConfigurationChangeEvent>();

	// Register the handler for when Mountain pushes a configuration update.
	Ipc.RegisterInvokeHandler(
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
			Ipc.SendRequest<object>("$getConfiguration", [Section, Scope]).pipe(
				Effect.tap((newConfig) => Ref.set(ConfigCache, newConfig)),
				Effect.map((newConfig) =>
					CreateWorkspaceConfiguration(
						newConfig,
						Section ?? "",
						Ipc,
						Log,
					),
				),
			),
		OnDidChangeConfiguration: OnDidChangeEvent.Stream,
	};

	return ServiceImplementation;
});
