// File: src/cocoon-esm-interceptor/dynamic.ts
// Purpose: Generates the script content for dynamic 'vscode' ESM modules.
//
// Description:
// This module provides a function, `createDynamicVscodeModuleScript`, which constructs
// the full JavaScript code for a 'vscode' module specific to an extension.
// It achieves this by:
// 1. Importing the raw string content of `dynamic.template.ts`. This template
//    is expected to have had its build-time placeholders (like the global API
//    function name) already substituted by esbuild's `define` feature when
//    esbuild processes this import (due to the '.template.ts' extension being
//    mapped to the 'text' loader).
// 2. Dynamically generating `export` statements based on the properties of the
//    provided `vscode.API` instance.
// 3. Replacing runtime placeholders (`__RUNTIME_API_KEY__`, `__RUNTIME_EXPORT_STATEMENTS__`)
//    in the template string with their actual values.
//
// The resulting script string is then typically converted into a `data:` URI by the
// main interceptor (`cocoon-esm-interceptor.ts`) and used by Node.js to resolve
// an `import 'vscode'` statement.
//
//--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";

// Import the raw string content of the template.
// - esbuild's `loader: { '.template.ts': 'text' }` configuration is crucial for this import.
// - esbuild's `define` feature will have already replaced
//   `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME` within this string.
//
// Note on import path:
// If your esbuild configuration resolves '.ts' extensions automatically or you prefer
// to omit them for source imports, you might adjust this path.
// Using the full '.template.ts' extension is explicit and works well with the loader config.
import dynamicModuleTemplateContent from "./dynamic.template.js";

/**
 * Generates the JavaScript content for a dynamic 'vscode' ESM module.
 *
 * This function takes a pre-processed template string (where build-time constants
 * like the global API function name have already been injected by esbuild) and
 * populates it with runtime-specific values: the API key and the dynamic export
 * statements for the vscode API.
 *
 * @param apiKey The unique key associated with the extension-specific `vscode` API instance.
 *               This key is used by the generated script to retrieve the API instance
 *               via a global function.
 * @param apiInstance The actual `vscode` API object instance for which to generate exports.
 * @returns A string containing the complete JavaScript code for the dynamic module.
 */
export function createDynamicVscodeModuleScript(
	apiKey: string,

	apiInstance: typeof vscode,
): string {
	// Validate inputs (optional but good practice)
	if (typeof apiKey !== "string" || apiKey.length === 0) {
		// This error would typically be caught by the caller, but defensive checks can be useful.
		console.error(
			"[Cocoon Dynamic Script] Invalid API key provided for dynamic module generation.",
		);

		// Depending on error handling strategy, you might throw or return a specific error script.
		// For now, we'll proceed, but the resulting module would likely fail.
	}

	if (typeof apiInstance !== "object" || apiInstance === null) {
		console.error(
			"[Cocoon Dynamic Script] Invalid API instance provided for dynamic module generation.",
		);

		// Similar to apiKey, this indicates a problem upstream.
	}

	// Generate the `export const foo = __apiInstance['foo'];` lines.
	const exportNames = Object.keys(apiInstance);

	const exportStatements = exportNames
		.map(
			(propName) =>
				// Ensure property names are valid JavaScript identifiers.
				// Object.keys should return valid ones, but this is a good place for sanitization if needed.
				// Example: `export const commands = __apiInstance['commands'];`
				`export const ${propName} = __apiInstance['${propName}'];`,
		)
		// Each export on a new line for readability in the generated script.
		.join("\n");

	// The `dynamicModuleTemplateContent` string already has the global API function name
	// (ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME) substituted by esbuild.
	// Now, replace the runtime placeholders.
	let populatedScript = dynamicModuleTemplateContent;

	populatedScript = populatedScript.replace(/__RUNTIME_API_KEY__/g, apiKey);

	populatedScript = populatedScript.replace(
		/__RUNTIME_EXPORT_STATEMENTS__/g,

		exportStatements,
	);

	return populatedScript;
}
