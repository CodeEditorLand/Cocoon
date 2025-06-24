/*
 * File: Cocoon/Source/Service/APIFactory/CreateLanguagesNamespace.ts
 * Role: Constructs the `vscode.languages` namespace for the public API object.
 * Responsibilities:
 *   - Creates a sandboxed `vscode.languages` object for a specific extension.
 *   - Adapts the `Effect`-based methods of the `LanguageFeature` service into
 *     the promise-based and disposable-based signatures expected by the VS Code API.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import { type LanguageFeature } from "../../Service/LanguageFeature/Service.js";

/**
 * Creates the `vscode.languages` namespace object.
 *
 * This factory function takes the central `LanguageFeature` service and creates
 * an object whose methods delegate to the service. It handles the necessary
 * adaptation from the internal `Effect`-based API to the public, promise-based
 * `vscode.d.ts` contract.
 *
 * @param LanguageFeatureService - The central service for language feature management.
 * @param Extension - The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.languages` API.
 */
export const CreateLanguagesNamespace = (
	LanguageFeatureService: LanguageFeature,
	Extension: IExtensionDescription,
): typeof VSCode.languages => {
	const RunEffectAndReturnPromise = <T>(
		TheEffect: Effect.Effect<T, Error>,
	) => {
		// At the API boundary, we must run the effect to return a promise.
		return Effect.runPromise(TheEffect);
	};

	const LanguagesNamespace: typeof VSCode.languages = {
		// --- Provider Registration Methods ---
		// The VS Code API expects these to return a `Disposable` synchronously.
		// Our service implementation aligns with this, returning an Effect that
		// resolves to a disposable. We must run it here.
		registerHoverProvider: (selector, provider) =>
			Effect.runSync(
				LanguageFeatureService.RegisterHoverProvider(
					selector,
					provider,
					Extension,
				),
			),
		registerCompletionItemProvider: (
			selector,
			provider,
			...triggerCharacters
		) =>
			Effect.runSync(
				LanguageFeatureService.RegisterCompletionItemProvider(
					selector,
					provider,
					triggerCharacters,
					Extension,
				),
			),
		registerDefinitionProvider: (selector, provider) =>
			Effect.runSync(
				LanguageFeatureService.RegisterDefinitionProvider(
					selector,
					provider,
					Extension,
				),
			),
		registerCodeActionsProvider: (selector, provider, metadata) =>
			Effect.runSync(
				LanguageFeatureService.RegisterCodeActionsProvider(
					selector,
					provider,
					metadata,
					Extension,
				),
			),
		registerReferenceProvider: (selector, provider) =>
			Effect.runSync(
				LanguageFeatureService.RegisterReferenceProvider(
					selector,
					provider,
					Extension,
				),
			),

		// --- Other Methods (Promise-based) ---
		getLanguages: () => {
			// A full implementation would call a method on the LanguageFeature service.
			return Promise.resolve([]);
		},
		setTextDocumentLanguage: (document, _languageId) => {
			// This would also delegate to a service method.
			return Promise.resolve(document);
		},
		createDiagnosticCollection: (_name?: string) => {
			// This is handled by the dedicated Diagnostic service.
			// The APIFactory will merge it onto the final `vscode` object.
			throw new Error(
				"createDiagnosticCollection is provided by the Diagnostic service, not the Languages namespace.",
			);
		},

		// Add stubs for any other methods on `vscode.languages`
		match: () => 0,
		getDiagnostics: () => [],
		setLanguageConfiguration: () => ({ dispose: () => {} }),
		registerCodeLensProvider: () => ({ dispose: () => {} }),
		registerDeclarationProvider: () => ({ dispose: () => {} }),
		registerImplementationProvider: () => ({ dispose: () => {} }),
		registerTypeDefinitionProvider: () => ({ dispose: () => {} }),
		registerColorProvider: () => ({ dispose: () => {} }),
		registerFoldingRangeProvider: () => ({ dispose: () => {} }),
		registerDocumentHighlightProvider: () => ({ dispose: () => {} }),
		registerDocumentLinkProvider: () => ({ dispose: () => {} }),
		registerDocumentSymbolProvider: () => ({ dispose: () => {} }),
		registerWorkspaceSymbolProvider: () => ({ dispose: () => {} }),
		registerDocumentFormattingEditProvider: () => ({ dispose: () => {} }),
		registerDocumentRangeFormattingEditProvider: () => ({
			dispose: () => {},
		}),
		registerOnTypeFormattingEditProvider: () => ({ dispose: () => {} }),
		registerRenameProvider: () => ({ dispose: () => {} }),
		registerSelectionRangeProvider: () => ({ dispose: () => {} }),
		registerSignatureHelpProvider: () => ({ dispose: () => {} }),
		registerCallHierarchyProvider: () => ({ dispose: () => {} }),
		registerTypeHierarchyProvider: () => ({ dispose: () => {} }),
		registerLinkedEditingRangeProvider: () => ({ dispose: () => {} }),
		registerInlayHintsProvider: () => ({ dispose: () => {} }),
		registerInlineCompletionItemProvider: () => ({ dispose: () => {} }),
		registerDocumentDropEditProvider: () => ({ dispose: () => {} }),
		registerPasteEditProvider: () => ({ dispose: () => {} }),
	};

	return LanguagesNamespace;
};
