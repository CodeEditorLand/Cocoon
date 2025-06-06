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
 *    - This template string is expected to have already undergone build-time placeholder
 *      substitution by a build tool like esbuild. Specifically, the placeholder
 *      `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME` within the template string should
 *      have been replaced with the actual name of a global function (e.g.,
 *      `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`). This global function is responsible
 *      for retrieving the extension-specific `vscode` API instance.
 *
 * 2. Dynamic Export Generation:
 *    - It inspects the provided `vscodeApiInstance` (the actual `vscode` API object
 *      tailored for a specific extension).
 *    - For each property of this API instance, it generates an `export const` statement
 *      (e.g., `export const commands = __apiInstance['commands'];`). This makes all
 *      parts of the `vscode` API (like `commands`, `window`, `Uri`, `Position`, etc.)
 *      available as named exports from the dynamic module.
 *
 * 3. Runtime Placeholder Substitution:
 *    - It takes the (build-time processed) template string and replaces further
 *      runtime placeholders:
 *      - `__RUNTIME_API_KEY__`: This is replaced with the unique `apiKey` associated
 *        with the specific `vscodeApiInstance` being exposed to the importing extension.
 *        The generated script will use this key to call the global API retrieval function.
 *      - `__RUNTIME_EXPORT_STATEMENTS__`: This is replaced with the block of `export const ...`
 *        statements generated in the previous step.
 *
 * Output:
 * - The function returns a string containing the complete JavaScript code for the
 *   dynamic 'vscode' module.
 *
 * Usage by `CocoonNodeModuleESMInterceptor`:
 * - The main ESM interceptor (`CocoonNodeModuleESMInterceptor` on the main application thread)
 *   calls `createDynamicVscodeModuleScript` when the loader hook (`hook.ts`) requests
 *   resolution for a 'vscode' (or aliased) import.
 * - The interceptor then converts the returned script string into a `data:` URI.
 * - This `data:` URI is sent back to the loader hook, which provides it to Node.js.
 *   Node.js then loads and executes the script from this `data:` URI, effectively
 *   materializing the 'vscode' module for the importing extension.
 *--------------------------------------------------------------------------------------------*/

// Import the VS Code API namespace type for type checking the `apiInstance` parameter.
// This assumes that a `vscode.d.ts` or equivalent type definition is available.
import type * as vscode from "vscode";

// Import the raw string content of the template file.
// - This import relies on the build tool (e.g., esbuild) being configured with a
//   loader (like the 'text' loader) for files ending in '.template.js' (or '.template.ts').
//   This configuration ensures that `dynamicModuleTemplateContent` is a string.
// - Crucially, esbuild's `define` feature (or an equivalent mechanism) must have already
//   processed `dynamic.template.js` at build time to replace the placeholder
//   `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME` within its content.
//
// Note on the import path and extension:
// Using the full '.template.js' (or '.template.ts' if you prefer to write the template
// itself in TypeScript for better tooling, though it's treated as text) is explicit and
// aligns well with typical build tool loader configurations.
import dynamicModuleTemplateContent from "./dynamic.template.js"; // Assuming template is now .js after build processing.

/**
 * Generates the JavaScript content for a dynamic 'vscode' (or aliased) ESM module.
 *
 * This function takes a pre-processed template string (where build-time constants,
 * like the name of the global API retrieval function, have already been injected by
 * the build tool) and populates it with runtime-specific values:
 * - The API key for retrieving the correct extension-specific `vscode` API instance.
 * - The dynamically generated `export` statements for all parts of that `vscode` API instance.
 *
 * @param apiKey - The unique key associated with the extension-specific `vscode` API instance.
 *                 This key will be embedded in the generated script and used to call the
 *                 global API retrieval function (whose name was injected at build time).
 * @param vscodeApiInstance - The actual `vscode` API object instance (e.g., the one created by
 *                            the `apiFactoryProvider` for a specific extension) for which
 *                            to generate named exports.
 * @returns A string containing the complete JavaScript code for the dynamic ESM module.
 *          This script, when executed by Node.js, will provide the 'vscode' API to the
 *          importing extension.
 */
export function createDynamicVscodeModuleScript(
	apiKey: string, // Unique key to retrieve the API instance.
	vscodeApiInstance: typeof vscode, // The actual vscode API object.
): string {
	// --- Input Validation (Optional but Recommended) ---
	// These checks help catch issues early if the inputs are not as expected.
	if (typeof apiKey !== "string" || apiKey.length === 0) {
		// This error would typically indicate a problem in the calling code
		// (e.g., `CocoonNodeModuleESMInterceptor`).
		console.error(
			"[Cocoon Dynamic Script Generator] Invalid or empty API key provided for dynamic module generation. " +
				"The resulting module will likely fail to retrieve the API instance.",
		);
		// Depending on the desired error handling strategy, one might throw an error here
		// or return a specific script that itself throws an error when imported.
		// For now, proceeding, but the generated module will be faulty.
	}

	if (typeof vscodeApiInstance !== "object" || vscodeApiInstance === null) {
		console.error(
			"[Cocoon Dynamic Script Generator] Invalid API instance (null or not an object) provided for dynamic module generation. " +
				"Cannot generate export statements.",
		);
		// If the API instance is invalid, we cannot generate meaningful exports.
		// Returning a script that throws an error might be appropriate.
		// For now, proceeding will result in empty or problematic export statements.
	}

	// --- Generate `export const ...` statements ---
	// Get all property names from the `vscodeApiInstance`. These will become named exports.
	// `Object.keys()` returns an array of a given object's own enumerable string-keyed property names.
	const exportablePropertyNames = Object.keys(vscodeApiInstance);

	// Map each property name to an ESM `export const` statement.
	// Example: For a property 'commands', generates `export const commands = __apiInstance['commands'];`
	const exportStatementsString = exportablePropertyNames
		.map((propertyName) => {
			// Property names from `Object.keys` are generally valid as part of an identifier
			// if they were valid property names on the object. However, if property names could
			// contain characters invalid for `const` variable names (e.g., hyphens, though unlikely
			// for the `vscode` API object), further sanitization or different export syntax might be needed.
			// For standard JavaScript identifiers, direct interpolation is fine.
			return `export const ${propertyName} = __apiInstance['${propertyName}'];`;
		})
		// Join each export statement with a newline for readability in the generated script.
		.join("\n");

	// --- Populate the Template ---
	// The `dynamicModuleTemplateContent` string already has the global API function name
	// (e.g., `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`) substituted by the build tool (esbuild).
	// Now, replace the runtime placeholders (`__RUNTIME_API_KEY__` and `__RUNTIME_EXPORT_STATEMENTS__`)
	// with their actual values.

	let populatedScriptContent = dynamicModuleTemplateContent;

	// Replace the API key placeholder. The 'g' flag ensures all occurrences are replaced (if any).
	populatedScriptContent = populatedScriptContent.replace(
		/__RUNTIME_API_KEY__/g,
		apiKey,
	);

	// Replace the export statements placeholder.
	populatedScriptContent = populatedScriptContent.replace(
		/__RUNTIME_EXPORT_STATEMENTS__/g,
		exportStatementsString,
	);

	// Return the fully populated script content.
	return populatedScriptContent;
}
