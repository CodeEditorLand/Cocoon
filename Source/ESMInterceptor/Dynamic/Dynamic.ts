/*
 * File: Cocoon/Source/ESMInterceptor/Dynamic/Dynamic.ts
 * Responsibility: Generates dynamic JavaScript ESM modules that expose the VS Code API to extensions running in the Cocoon sidecar, enabling compatibility with VS Code extensions while intercepting API calls for the Land editor's architecture.
 * Modified: 2025-06-07 05:37:45 UTC
 * Dependency: ./Dynamic.Template.js, vscode
 * Export: commands, createDynamicVscodeModuleScript
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Dynamic 'vscode' ESM Module Script Generator
 *
 * --------------------------------------------------------------------------------------------
 * This module is responsible for generating the full JavaScript source code for the
 * dynamic 'vscode' (and its aliases like 'land') ECMAScript Modules. These dynamic
 * modules are what an extension's `import ... from 'vscode'` statement ultimately resolves to.
 *
 * Core Functionality (`createDynamicVscodeModuleScript` function):
 * 1. Template Processing:
 *    - It utilizes a template string (`dynamicModuleTemplateContent`), which is the raw
 *      content of `dynamic.template.js`.
 *    - This template is expected to have build-time placeholders (like a global function
 *      name) substituted by a build tool (e.g., esbuild).
 *
 * 2. Dynamic Export Generation:
 *    - It inspects the provided `vscodeApiInstance` (the API object for a specific extension).
 *    - For each property, it generates an `export const` statement to make all parts of the
 *      `vscode` API available as named exports.
 *
 * 3. Runtime Placeholder Substitution:
 *    - It replaces runtime placeholders in the template:
 *      - `__RUNTIME_API_KEY__`: Replaced with the unique key for the extension's API instance.
 *      - `__RUNTIME_EXPORT_STATEMENTS__`: Replaced with the block of generated `export` statements.
 *
 * Usage by `CocoonNodeModuleESMInterceptor`:
 * - The ESM interceptor calls this function to get the script for a 'vscode' import.
 * - The interceptor then converts the returned script string into a `data:` URI, which
 *   Node.js loads, effectively materializing the 'vscode' module for the extension.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";

// Import the raw string content of the template file.
// This relies on the build tool (e.g., esbuild with the 'text' loader) being configured
// to handle `.template.js` files and to substitute any build-time placeholders within it.
import dynamicModuleTemplateContent from "./Dynamic.Template.js";

/**
 * Generates the JavaScript content for a dynamic 'vscode' (or aliased) ESM module.
 *
 * This function populates a pre-processed template with runtime-specific values: the API
 * key for retrieving the correct `vscode` API instance and the dynamically generated
 * `export` statements for all parts of that instance.
 *
 * @param apiKey - The unique key associated with the extension-specific `vscode` API instance.
 *                 This key is embedded in the script to call the global API retrieval function.
 * @param vscodeApiInstance - The actual `vscode` API object instance for which to generate named exports.
 * @returns A string containing the complete JavaScript code for the dynamic ESM module.
 */
export function createDynamicVscodeModuleScript(
	apiKey: string,
	vscodeApiInstance: typeof vscode,
): string {
	// --- Input Validation ---
	if (typeof apiKey !== "string" || apiKey.length === 0) {
		console.error(
			"[DynamicScriptGenerator] Invalid or empty API key provided. The resulting module will likely fail.",
		);
	}
	if (typeof vscodeApiInstance !== "object" || vscodeApiInstance === null) {
		console.error(
			"[DynamicScriptGenerator] Invalid API instance provided. Cannot generate export statements.",
		);
	}

	// --- Generate `export const ...` statements ---
	const exportablePropertyNames = Object.keys(vscodeApiInstance);
	const exportStatementsString = exportablePropertyNames
		.map((propertyName) => {
			// Example: `export const commands = __apiInstance['commands'];`
			return `export const ${propertyName} = __apiInstance['${propertyName}'];`;
		})
		.join("\n");

	// --- Populate the Template ---
	// The template already has the global API function name injected by the build tool.
	// Now, replace the runtime placeholders.
	let populatedScriptContent = dynamicModuleTemplateContent;

	populatedScriptContent = populatedScriptContent.replace(
		/__RUNTIME_API_KEY__/g,
		apiKey,
	);
	populatedScriptContent = populatedScriptContent.replace(
		/__RUNTIME_EXPORT_STATEMENTS__/g,
		exportStatementsString,
	);

	return populatedScriptContent;
}
