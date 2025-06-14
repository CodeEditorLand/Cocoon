/**
 * @module Service (LanguageFeature)
 * @description Defines the interface and Context.Tag for the LanguageFeature service.
 * This service manages the registration of all language feature providers from extensions.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	CodeActionProvider,
	CodelensProvider,
	CompletionItemProvider,
	DeclarationProvider,
	DefinitionProvider,
	Disposable,
	DocumentColorProvider,
	DocumentFormattingEditProvider,
	DocumentHighlightProvider,
	DocumentLinkProvider,
	DocumentRangeFormattingEditProvider,
	DocumentRangeSemanticTokensProvider,
	DocumentSelector,
	DocumentSemanticTokensProvider,
	DocumentSymbolProvider,
	FoldingRangeProvider,
	FormattingMode,
	HoverProvider,
	ImplementationProvider,
	OnTypeFormattingEditProvider,
	ReferenceProvider,
	RenameProvider,
	SelectionRangeProvider,
	SignatureHelpProvider,
	TypeDefinitionProvider,
	WorkspaceSymbolProvider,
} from "vscode";

// This interface would be extremely large, listing every `register...Provider` method.
export interface Interface {
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

	readonly RegisterCodeActionsProvider: (
		Selector: DocumentSelector,
		Provider: CodeActionProvider,
		Metadata: any, // CodeActionProviderMetadata
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	// ... And so on for all other provider types.
	// (Implementation, References, Highlights, Symbols, etc.)
}

export const Tag = Context.Tag<Interface>("Service/LanguageFeature");
