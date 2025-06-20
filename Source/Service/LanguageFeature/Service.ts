

/**
 * @module Service (LanguageFeature)
 * @description Defines the interface and Context.Tag for the LanguageFeature service.
 * This service manages the registration of all language feature providers, such
 * as hover providers, completion item providers, etc.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	CodeActionProvider,
	CodeActionProviderMetadata,
	CompletionItemProvider,
	DefinitionProvider,
	Disposable,
	DocumentSelector,
	HoverProvider,
} from "vscode";

export default class LanguageFeatureService extends Context.Tag(
	"Service/LanguageFeature",
)<
	LanguageFeatureService,
	{
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
			Metadata: CodeActionProviderMetadata | undefined,
			Extension: IExtensionDescription,
		) => Effect.Effect<Disposable, Error>;

		// ... and so on for all other language feature provider types.
	}
>() {}
