/**
 * @module Definition (Debug)
 * @description The live implementation of the Debug service.
 */

import { Effect, Ref, Stream } from "effect";
import type {
	DebugAdapterDescriptorFactory,
	DebugConfigurationProvider,
} from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc.js";
import { RegisterProviderEffect } from "./RegisterProvider.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const ConfigProviders = yield* _(Ref.make(new Map<number, any>()));
	const DescriptorFactories = yield* _(Ref.make(new Map<number, any>()));
	const OnDidChangeActiveDebugSessionEvent = CreateEventStream<any>();

	// --- Register RPC Handlers for calls FROM Mountain ---
	Ipc.RegisterInvokeHandler(
		"$provideDebugConfigurations",
		([handle, folder]) =>
			Effect.gen(function* (_) {
				const entry = (yield* _(Ref.get(ConfigProviders))).get(handle);
				// ... call entry.provider.provideDebugConfigurations(...) and return result
			}).pipe(Effect.runPromise),
	);

	Ipc.RegisterInvokeHandler(
		"$resolveDebugConfiguration",
		([handle, folder, config]) =>
			Effect.gen(function* (_) {
				const entry = (yield* _(Ref.get(ConfigProviders))).get(handle);
				// ... call entry.provider.resolveDebugConfiguration(...) and return result
			}).pipe(Effect.runPromise),
	);

	// ... other RPC handlers for adapter factories, etc. ...

	const ServiceImplementation: Interface = {
		// Events
		onDidChangeActiveDebugSession:
			OnDidChangeActiveDebugSessionEvent.Stream,
		get activeDebugSession() {
			return undefined;
		}, // This would be managed by state from Mountain

		// Methods
		RegisterDebugConfigurationProvider: (Type, Provider, Extension) =>
			RegisterProviderEffect(
				ConfigProviders,
				Ipc,
				"$registerDebugConfigurationProvider",
				{ Type, Provider, Extension },
			),

		RegisterDebugAdapterDescriptorFactory: (Type, Factory, Extension) =>
			RegisterProviderEffect(
				DescriptorFactories,
				Ipc,
				"$registerDebugAdapterDescriptorFactory",
				{ Type, Factory, Extension },
			),

		StartDebugging: (Folder, Config, Options) =>
			Ipc.SendRequest<boolean>("$startDebugging", [
				Folder?.uri,
				Config,
				Options,
			]).pipe(Effect.map((result) => !!result)),
	};

	return ServiceImplementation;
});
