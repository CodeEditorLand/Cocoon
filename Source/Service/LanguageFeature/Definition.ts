/**
 * @module Definition (LanguageFeatures)
 * @description The live implementation of the LanguageFeatures service.
 */

import { Effect, Ref } from "effect";

import { IpcProvider } from "../Ipc.js";
import { RegisterProvider } from "./RegisterProvider.js";
import { ProvideHover } from "./RpcHandlers/ProvideHover.js";
import type { Interface } from "./Service.js";

// ... import other RpcHandlers

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const ProviderRegistry = yield* _(Ref.make(new Map<number, any>()));

	// --- Register all RPC Handlers ---
	Ipc.RegisterInvokeHandler("$provideHover", ([handle, uri, pos, token]) =>
		Effect.runPromise(
			ProvideHover(ProviderRegistry, handle, uri, pos, token),
		),
	);
	// ... Register handlers for $provideCompletionItems, $provideDefinition, etc. ...

	const ServiceImplementation: Interface = {
		RegisterHoverProvider: (Selector, Provider, Extension) =>
			RegisterProvider(
				ProviderRegistry,
				Ipc,
				"Hover",
				Selector,
				Provider,
				Extension,
			),
		// ... Implementations for all other `register...` methods ...
	};

	return ServiceImplementation;
});
