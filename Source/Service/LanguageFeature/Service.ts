/*
 * File: Cocoon/Source/Service/LanguageFeature/Service.ts
 * Role: Defines the interface and Effect.Service for the LanguageFeature service.
 * Responsibilities:
 *   - Declare the contract for the service, which allows extensions to register
 *     various language feature providers (e.g., hover, completion, definition).
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	CodeActionProvider,
	CodeActionProviderMetadata,
	CompletionItemProvider,
	DefinitionProvider,
	Disposable,
	DocumentSelector,
	HoverProvider,
	ReferenceProvider,
} from "vscode";

/**
 * The `Effect.Service` for the LanguageFeature service.
 *
 * This service acts as a central registry for all language feature providers.
 * It bridges the gap between an extension's implementation and the `Mountain`
 * host, which ultimately signals the Monaco editor to request features from
 * these providers.
 */
export class LanguageFeature extends Effect.Service<LanguageFeature>(
	"Service/LanguageFeature",
)<{
	readonly RegisterHoverProvider: (
		Selector: DocumentSelector,
		Provider: HoverProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly RegisterCompletionItemProvider: (
		Selector: DocumentSelector,
		Provider: CompletionItemProvider,
		TriggerCharacters: string[],
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly RegisterDefinitionProvider: (
		Selector: DocumentSelector,
		Provider: DefinitionProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly RegisterReferenceProvider: (
		Selector: DocumentSelector,
		Provider: ReferenceProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly RegisterCodeActionsProvider: (
		Selector: DocumentSelector,
		Provider: CodeActionProvider,
		Metadata: CodeActionProviderMetadata | undefined,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
}>() {}
