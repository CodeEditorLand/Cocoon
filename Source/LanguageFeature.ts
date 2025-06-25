/**
 * @module LanguageFeature
 * @description Defines the service for registering language feature providers
 * such as for hovers, completions, and definitions.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable } from "vscode";
import type {
	CodeActionProvider,
	CodeActionProviderMetadata,
	CompletionItemProvider,
	DefinitionProvider,
	DocumentSelector,
	HoverProvider,
	ReferenceProvider,
} from "vscode";

/**
 * @interface LanguageFeature
 * @description The contract for the LanguageFeature service.
 */
export interface LanguageFeature {
	readonly RegisterHoverProvider: (
		selector: DocumentSelector,
		provider: HoverProvider,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
	readonly RegisterCompletionItemProvider: (
		selector: DocumentSelector,
		provider: CompletionItemProvider,
		triggerCharacters: string[],
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
	readonly RegisterDefinitionProvider: (
		selector: DocumentSelector,
		provider: DefinitionProvider,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
	readonly RegisterReferenceProvider: (
		selector: DocumentSelector,
		provider: ReferenceProvider,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
	readonly RegisterCodeActionsProvider: (
		selector: DocumentSelector,
		provider: CodeActionProvider,
		metadata: CodeActionProviderMetadata | undefined,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;
}

/**
 * @class LanguageFeatureService
 * @description The `Effect.Service` for managing language features.
 */
export class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
	"Service/LanguageFeature",
	{
		// This provides a stubbed implementation to satisfy the type contract.
		// A full implementation would be synthesized from OldCocoon's Definition.ts.
		sync: () => ({
			RegisterHoverProvider: () =>
				Effect.succeed(new Disposable(() => {})),
			RegisterCompletionItemProvider: () =>
				Effect.succeed(new Disposable(() => {})),
			RegisterDefinitionProvider: () =>
				Effect.succeed(new Disposable(() => {})),
			RegisterReferenceProvider: () =>
				Effect.succeed(new Disposable(() => {})),
			RegisterCodeActionsProvider: () =>
				Effect.succeed(new Disposable(() => {})),
		}),
	},
) {}
