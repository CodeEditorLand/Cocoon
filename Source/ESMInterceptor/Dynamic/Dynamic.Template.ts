/*
 * File: Cocoon/Source/ESMInterceptor/Dynamic/Dynamic.Template.ts
 * Responsibility: Provides a dynamic ESM module that intercepts VS Code API calls from extensions and proxies them through the Vine IPC layer to the Mountain backend, enabling compatibility with existing VS Code extensions in the Cocoon sidecar for Land's MVP Path A.
 * Modified: 2025-06-07 05:37:45 UTC
 * Dependency: vscode
 * Export: commands, window
 */

/*---------------------------------------------------------------------------------------------
 *  Dynamic.Template.ts
 * --------------------------------------------------------------------------------------------
 *  Purpose: Template for the dynamically generated 'vscode' (and aliased) ESM module.
 *
 *  Description:
 *  This file serves as a raw text template. It undergoes two stages of processing:
 *  1. Build-Time Processing (e.g., by esbuild):
 *     - The placeholder `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME` is substituted
 *       with the actual string name of a global function used at runtime to retrieve
 *       the extension-specific `vscode` API instance.
 *
 *  2. Runtime Processing (by `createDynamicVscodeModuleScript`):
 *     - `__RUNTIME_API_KEY__`: Replaced with the unique API key for the importing extension.
 *     - `__RUNTIME_EXPORT_STATEMENTS__`: Replaced with dynamically generated `export` statements.
 *
 *  Loading Mechanism:
 *  - This file's content is imported as a raw text string into the script generator.
 *  - The fully populated script is then converted into a `data:` URI by the ESM
 *    interceptor and provided to Node.js to resolve an `import 'vscode'` statement.
 *
 *--------------------------------------------------------------------------------------------*/

// --- Cocoon Dynamic 'vscode' API Module (ESM loaded via data: URI) ---
// This script is the actual code that gets executed when an extension's ESM code
// performs `import ... from 'vscode'` (or an alias).
// It dynamically retrieves the extension-specific 'vscode' API instance.

// Retrieve the vscode API instance.
// - `ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME`: Replaced by the build tool.
// - `__RUNTIME_API_KEY__`: Replaced by the script generator at runtime.
const __apiInstance =
	// @ts-expect-error: TypeScript doesn't know about the globally defined function.
	globalThis[ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME](__RUNTIME_API_KEY__);

// Critical check: If the API instance cannot be retrieved, it indicates a severe issue.
if (!__apiInstance) {
	// This detailed error message will appear in the extension host console.
	throw new Error(
		`Cocoon Critical Error: Failed to retrieve vscode API instance for ESM module. ` +
			`Attempted to use API Key: "${__RUNTIME_API_KEY__}". ` +
			`Tried to call global function '${ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME}'. ` +
			`This error usually indicates one of the following issues: ` +
			`1. The global API retrieval function ('${ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME}') was not correctly defined on globalThis. ` +
			`2. The API Key ("${__RUNTIME_API_KEY__}") is invalid or was not correctly registered with the API instance cache. ` +
			`3. The vscode API instance itself was not properly created or cached by the API factory for this extension context. ` +
			`Please check the Cocoon ESM interceptor setup, the API factory provider, and the global API instance caching mechanism.`,
	);
}

// Dynamically export all properties from the retrieved `__apiInstance`.
// The `__RUNTIME_EXPORT_STATEMENTS__` placeholder is replaced at runtime with code like:
//
// export const commands = __apiInstance['commands'];
// export const window = __apiInstance['window'];
// ... and so on for every property of the `vscode` API object.
//
// This makes all parts of the `vscode` API available as named exports.
__RUNTIME_EXPORT_STATEMENTS__;

// Provide a default export for convenience, allowing imports like:
// `import vscode from 'vscode';`
export default __apiInstance;
