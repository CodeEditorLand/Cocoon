/*
 * File: Cocoon/Source/Service/LanguageFeature/Service.ts
 *
 * This file defines the interface and Context.Tag for the LanguageFeature service.
 * Its responsibilities are to declare the contract for the service, which allows
 * extensions to register various language feature providers (e.g., hover, completion).
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
	}
>() {}
