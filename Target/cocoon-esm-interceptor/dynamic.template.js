var i=`/*---------------------------------------------------------------------------------------------
 *  dynamic.template.ts
 * --------------------------------------------------------------------------------------------
 *  Purpose: Template for the dynamically generated 'vscode' (and aliased) ESM module.
 *
 *  Description:
 *  This file serves as a raw text template. It undergoes two stages of processing:
 *  1. Build-Time Processing (e.g., by esbuild):
 *     - The placeholder \`ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME\` is substituted
 *       by esbuild's \`define\` feature (or an equivalent build-time mechanism).
 *       It gets replaced with the actual string name of a global function that will
 *       be used at runtime to retrieve the extension-specific \`vscode\` API instance.
 *       Example replacement: \`_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_\`.
 *
 *  2. Runtime Processing (by \`dynamic-module-script-generator.ts\`):
 *     - The (build-time processed) template string is then further populated at runtime.
 *     - \`__RUNTIME_API_KEY__\`: This placeholder is replaced with the unique API key
 *       associated with the specific \`vscode\` API instance for the importing extension.
 *     - \`__RUNTIME_EXPORT_STATEMENTS__\`: This placeholder is replaced with a series of
 *       \`export const ...\` statements, dynamically generated based on the properties
 *       of the \`vscode\` API instance.
 *
 *  Loading Mechanism:
 *  - This file's content (after build-time processing) is imported as a raw text string
 *    into \`dynamic-module-script-generator.ts\`. This is typically achieved using a build
 *    tool's 'text' loader, configured for an extension like '.template.js'.
 *  - The resulting fully populated script string is then converted into a \`data:\` URI by
 *    \`CocoonNodeModuleESMInterceptor\` and provided to Node.js to resolve an
 *    \`import 'vscode'\` (or aliased) statement.
 *
 *  TypeScript Tooling Declarations (Developer Convenience Only):
 *  The \`declare const\` statements that might appear in a \`.template.ts\` version of this
 *  file (if one were used for authoring before being processed to \`.js\` or text) are
 *  purely for developer convenience when editing the template in a TypeScript-aware
 *  editor. They help satisfy the TypeScript parser and linters by declaring the expected
 *  placeholders. These \`declare\` statements DO NOT AFFECT the raw string content loaded by
 *  the build tool's 'text' loader and are NOT part of the final JavaScript script
 *  generated from this template.
 *
 *--------------------------------------------------------------------------------------------*/

// --- Cocoon Dynamic 'vscode' API Module (ESM loaded via data: URI) ---
// This script is the actual code that gets executed when an extension's ESM code
// performs \`import ... from 'vscode'\` (or an alias like 'land').
// It dynamically retrieves the extension-specific 'vscode' API instance that was
// prepared by the \`apiFactoryProvider\` on the main application thread.

// Retrieve the vscode API instance.
// - \`ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME\`: This was replaced by the build tool (e.g., esbuild)
//   at build time with the actual name of the global function (e.g., "_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_").
// - \`__RUNTIME_API_KEY__\`: This will be replaced by \`dynamic-module-script-generator.ts\` at runtime
//   with the unique key corresponding to the vscode API instance for the importing extension.
const __apiInstance =
	// @ts-expect-error: TypeScript doesn't know about the globally defined function name
	// that \`ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME\` resolves to, nor that \`globalThis\` can be indexed by it.
	// This is expected and acceptable for this dynamically generated script.
	globalThis[ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME](__RUNTIME_API_KEY__);

// Critical check: If the API instance cannot be retrieved, it indicates a severe issue
// with the ESM interception setup or the API factory mechanism.
if (!__apiInstance) {
	// This error message will appear in the console of the environment where the extension's
	// ESM code is running (e.g., the Node.js worker thread for the extension host).
	// The placeholders \`__RUNTIME_API_KEY__\` and \`ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME\`
	// will have been replaced with their actual string values by this point, making the
	// error message more informative for debugging.
	throw new Error(
		\`Cocoon Critical Error: Failed to retrieve vscode API instance for ESM module. \` +
			\`Attempted to use API Key: "\${__RUNTIME_API_KEY__}". \` +
			\`Tried to call global function '\${ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME}'. \` +
			\`This error usually indicates one of the following issues: \` +
			\`1. The global API retrieval function ('\${ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME}') was not correctly defined on globalThis. \` +
			\`2. The API Key ("\${__RUNTIME_API_KEY__}") is invalid or was not correctly registered with the API instance cache. \` +
			\`3. The vscode API instance itself was not properly created or cached by the API factory for this extension context. \` +
			\`Please check the Cocoon ESM interceptor setup, the API factory provider, and the global API instance caching mechanism.\`,
	);
}

// Dynamically export all properties from the retrieved \`__apiInstance\`.
// The \`__RUNTIME_EXPORT_STATEMENTS__\` placeholder will be replaced by
// \`dynamic-module-script-generator.ts\` at runtime with a block of code like:
//
// export const commands = __apiInstance['commands'];
// export const window = __apiInstance['window'];
// export const Uri = __apiInstance['Uri'];
// export const Position = __apiInstance['Position'];
// ... and so on, for every property of the \`vscode\` API object.
//
// This makes all parts of the \`vscode\` API available as named exports, e.g.:
// \`import { commands, Uri } from 'vscode';\`
__RUNTIME_EXPORT_STATEMENTS__;

// Provide a default export for convenience, allowing imports like:
// \`import vscode from 'vscode';\`
// The default export will be the entire \`__apiInstance\` object itself.
export default __apiInstance;
`;export{i as default};
