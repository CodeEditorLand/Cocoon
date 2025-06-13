/**
 * @module Definition (LanguageFeatures)
 * @description The live implementation of the LanguageFeatures service.
 */

import { Effect, Ref } from "effect";

import { IPCProvider } from "../IPC.js";
import { RegisterProvider } from "./RegisterProvider.js";
import { ProvideHover } from "./RPCHandlers/ProvideHover.js";
import type { Interface } from "./Service.js";

// ... import other RPCHandlers

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const ProviderRegistry = yield* _(Ref.make(new Map<number, any>()));

	// --- Register all RPC Handlers ---
	IPC.RegisterInvokeHandler("$provideHover", ([handle, uri, pos, token]) =>
		Effect.runPromise(
			ProvideHover(ProviderRegistry, handle, uri, pos, token),
		),
	);
	// ... Register handlers for $provideCompletionItems, $provideDefinition, etc. ...

	const ServiceImplementation: Interface = {
		RegisterHoverProvider: (Selector, Provider, Extension) =>
			RegisterProvider(
				ProviderRegistry,
				IPC,
				"Hover",
				Selector,
				Provider,
				Extension,
			),
		// ... Implementations for all other `register...` methods ...
	};

	return ServiceImplementation;
});
