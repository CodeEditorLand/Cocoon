/**
 * @module LanguageFeature
 * @description Defines the service for registering language feature providers
 * such as for hovers, completions, and definitions.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import { Disposable, type CodeActionProvider, type CodeActionProviderMetadata, type CompletionItemProvider, type DefinitionProvider, type DocumentSelector, type HoverProvider, type ReferenceProvider } from "vscode";
/**
 * @interface LanguageFeature
 * @description The contract for the LanguageFeature service.
 */
export interface LanguageFeature {
    readonly RegisterHoverProvider: (selector: DocumentSelector, provider: HoverProvider, extension: IExtensionDescription) => Effect.Effect<Disposable, Error>;
    readonly RegisterCompletionItemProvider: (selector: DocumentSelector, provider: CompletionItemProvider, triggerCharacters: string[], extension: IExtensionDescription) => Effect.Effect<Disposable, Error>;
    readonly RegisterDefinitionProvider: (selector: DocumentSelector, provider: DefinitionProvider, extension: IExtensionDescription) => Effect.Effect<Disposable, Error>;
    readonly RegisterReferenceProvider: (selector: DocumentSelector, provider: ReferenceProvider, extension: IExtensionDescription) => Effect.Effect<Disposable, Error>;
    readonly RegisterCodeActionsProvider: (selector: DocumentSelector, provider: CodeActionProvider, metadata: CodeActionProviderMetadata | undefined, extension: IExtensionDescription) => Effect.Effect<Disposable, Error>;
}
declare const LanguageFeatureService_base: Effect.Service.Class<LanguageFeatureService, "Service/LanguageFeature", {
    readonly sync: () => {
        RegisterHoverProvider: () => Effect.Effect<Disposable, never, never>;
        RegisterCompletionItemProvider: () => Effect.Effect<Disposable, never, never>;
        RegisterDefinitionProvider: () => Effect.Effect<Disposable, never, never>;
        RegisterReferenceProvider: () => Effect.Effect<Disposable, never, never>;
        RegisterCodeActionsProvider: () => Effect.Effect<Disposable, never, never>;
    };
}>;
/**
 * @class LanguageFeatureService
 * @description The `Effect.Service` for managing language features.
 */
export declare class LanguageFeatureService extends LanguageFeatureService_base {
}
export {};
//# sourceMappingURL=LanguageFeature.d.ts.map