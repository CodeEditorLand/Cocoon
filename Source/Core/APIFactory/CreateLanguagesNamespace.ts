/**
 * @module CreateLanguagesNamespace
 * @description Constructs the `vscode.languages` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type LanguageFeatureService from "../../Service/LanguageFeature/Service.js";

/**
 * Creates the `vscode.languages` namespace object.
 *
 * This factory function takes the central `LanguageFeatureService` and creates
 * an object whose methods delegate to the service. This provides the `register...Provider`
 * functions that extensions use to contribute language features.
 *
 * @param LanguageFeature The central service for language feature management.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.languages` API.
 */
export default function (
	LanguageFeature: LanguageFeatureService,
	Extension: IExtensionDescription,
): typeof VSCode.languages {
	return {
		// --- Provider Registration Methods ---
		registerHoverProvider: (selector, provider) => {
			return Effect.runSync(
				LanguageFeature.RegisterHoverProvider(
					selector,
					provider,
					Extension,
				),
			);
		},
		registerCompletionItemProvider: (
			selector,
			provider,
			...triggerCharacters
		) => {
			return Effect.runSync(
				LanguageFeature.RegisterCompletionItemProvider(
					selector,
					provider,
					triggerCharacters,
					Extension,
				),
			);
		},
		registerDefinitionProvider: (selector, provider) => {
			return Effect.runSync(
				LanguageFeature.RegisterDefinitionProvider(
					selector,
					provider,
					Extension,
				),
			);
		},
		registerCodeActionsProvider: (selector, provider, metadata) => {
			return Effect.runSync(
				LanguageFeature.RegisterCodeActionsProvider(
					selector,
					provider,
					metadata,
					Extension,
				),
			);
		},
		// ... and so on for all other provider types (references, implementation, etc.)

		// --- Other Methods ---
		getLanguages: () => {
			// This would be delegated to the LanguageFeatureService
			return Promise.resolve([]);
		},
		setTextDocumentLanguage: (document, languageId) => {
			// This would be delegated to the LanguageFeatureService
			return Promise.resolve(document);
		},
		createDiagnosticCollection: (name?: string) => {
			// This would be delegated to the DiagnosticService
			throw new Error(
				"createDiagnosticCollection not implemented in this mock.",
			);
		},
	} as any;
}
