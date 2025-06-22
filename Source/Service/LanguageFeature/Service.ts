/*
 * File: Cocoon/Source/Service/LanguageFeature/Service.ts
 * Role: Defines the interface and Context.Tag for the LanguageFeature service.
 * Responsibilities:
 *   1. Declare the contract for the LanguageFeature service, which allows extensions
 *      to register various language feature providers (e.g., hover, completion).
 *   2. This is the public API surface consumed by other services or the API factory.
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
	ReferenceProvider,
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

		// ... and so on for all other language feature provider types.
	}
>() {}
