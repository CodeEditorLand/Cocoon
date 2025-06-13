/**
 * @module Definition (LanguageFeature)
 * @description The live implementation of the LanguageFeature service.
 */

import { Effect, Ref } from "effect";

import { IPC } from "../IPC.js";
import { RegisterProvider } from "./RegisterProvider.js";
import { ProvideHover } from "./RPCHandlers/ProvideHover.js";
// ... import other RPCHandlers as they are created
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const ProviderRegistry = yield* _(Ref.make(new Map<number, any>()));

	// --- Register all RPC Handlers ---
	// These handlers are the entry point for calls from Mountain to Cocoon.
	// They look up the correct provider in the registry and execute its method.
	IPCService.RegisterInvokeHandler(
		"$provideHover",
		([handle, uri, pos, tokenID]) =>
			Effect.runPromise(
				ProvideHover(ProviderRegistry, handle, uri, pos, tokenID),
			),
	);
	// ... Register handlers for $provideCompletionItems, $provideDefinition, etc. ...

	const ServiceImplementation: Interface = {
		RegisterHoverProvider: (Selector, Provider, Extension) =>
			RegisterProvider(
				ProviderRegistry,
				IPCService,
				"Hover",
				Selector,
				Provider,
				Extension,
			),
		RegisterCompletionItemProvider: (
			Selector,
			Provider,
			TriggerCharacters,
			Extension,
		) =>
			RegisterProvider(
				ProviderRegistry,
				IPCService,
				"CompletionItem",
				Selector,
				Provider,
				Extension,
				{ triggerCharacters: TriggerCharacters }, // Additional options
			),
		RegisterDefinitionProvider: (Selector, Provider, Extension) =>
			RegisterProvider(
				ProviderRegistry,
				IPCService,
				"Definition",
				Selector,
				Provider,
				Extension,
			),
		RegisterCodeActionsProvider: (
			Selector,
			Provider,
			Metadata,
			Extension,
		) =>
			RegisterProvider(
				ProviderRegistry,
				IPCService,
				"CodeAction",
				Selector,
				Provider,
				Extension,
				Metadata,
			),
		// ... Implementations for all other `register...` methods would follow this pattern ...
	};

	return ServiceImplementation;
});
