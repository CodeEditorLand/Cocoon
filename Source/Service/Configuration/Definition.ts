/**
 * @module Definition (Configuration)
 * @description The live implementation of the Configuration service.
 */

import { Context, Effect, Ref } from "effect";
import type { ConfigurationChangeEvent } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import CreateWorkSpaceConfiguration from "./CreateWorkSpaceConfiguration.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const Log = yield* _(LogService);
	const ConfigCache = yield* _(Ref.make<object>({}));
	const OnDidChangeEvent = CreateEventStream<ConfigurationChangeEvent>();

	// Register the handler for when Mountain pushes a configuration update.
	IPC.RegisterInvokeHandler(
		"$acceptConfigurationChanged",
		([NewConfig, Change]) =>
			Effect.gen(function* (_) {
				yield* _(Ref.set(ConfigCache, NewConfig));
				yield* _(
					OnDidChangeEvent.Fire({
						affectsConfiguration: (Section: string, Scope?: any) =>
							// A real implementation would need to check the scope properly.
							Change.keys.includes(Section),
					}),
				);
			}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
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

	return ServiceImplementation;
});
