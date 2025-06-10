/**
 * @module Service (LanguageFeatures)
 * @description Defines the interface and Context.Tag for the LanguageFeatures service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	DocumentSelector,
	Hover,
	HoverProvider,
} from "vscode";

// This interface would be extremely large, listing every `register...Provider` method.
export interface Interface {
	readonly RegisterHoverProvider: (
		Selector: DocumentSelector,
		Provider: HoverProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	// ... And so on for registerCompletionItemProvider, registerDefinitionProvider, etc.
}

export const Tag = Context.Tag<Interface>("Service/LanguageFeatures");
