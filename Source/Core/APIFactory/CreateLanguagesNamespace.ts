/*
 * File: Cocoon/Source/Core/APIFactory/CreateLanguagesNamespace.ts
 * Responsibility: Constructs the vscode.languages namespace for the API object.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/LanguageFeature/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module CreateLanguagesNamespace
 * @description Constructs the `vscode.languages` namespace for the API object.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type LanguageFeatureService from "../../Service/LanguageFeature/Service.js";

/**
 * Creates the `vscode.languages` namespace object.
 *
 * This factory function takes the central `LanguageFeatureService` and creates
 * an object whose methods delegate to the service. These methods now return
 * composable `Effect`s.
 *
 * @param LanguageFeature The central service for language feature management.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.languages` API.
 */
const CreateLanguagesNamespace = (
	LanguageFeature: LanguageFeatureService["Type"],
	Extension: IExtensionDescription,
): typeof VSCode.languages => {
	const LanguagesNamespace: Partial<typeof VSCode.languages> = {
		// --- Provider Registration Methods (now return Effects) ---
		registerHoverProvider: (selector, provider) =>
			LanguageFeature.RegisterHoverProvider(
				selector,
				provider,
				Extension,
			) as any,
		registerCompletionItemProvider: (
			selector,
			provider,
			...triggerCharacters
		) =>
			LanguageFeature.RegisterCompletionItemProvider(
				selector,
				provider,
				triggerCharacters,
				Extension,
			) as any,
		registerDefinitionProvider: (selector, provider) =>
			LanguageFeature.RegisterDefinitionProvider(
				selector,
				provider,
				Extension,
			) as any,
		registerCodeActionsProvider: (selector, provider, metadata) =>
			LanguageFeature.RegisterCodeActionsProvider(
				selector,
				provider,
				metadata,
				Extension,
			) as any,

		// --- Other Methods (stubbed for now) ---
		getLanguages: () => {
			return Promise.resolve([]);
		},
		setTextDocumentLanguage: (document, _languageId) => {
			return Promise.resolve(document);
		},
		createDiagnosticCollection: (_name?: string) => {
			throw new Error(
				"createDiagnosticCollection not implemented in this mock. It is provided by a separate DiagnosticService.",
			);
		},
	};

	return LanguagesNamespace as typeof VSCode.languages;
};

export default CreateLanguagesNamespace;
