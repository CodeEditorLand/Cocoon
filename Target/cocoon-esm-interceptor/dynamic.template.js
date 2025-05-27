var i=`/*---------------------------------------------------------------------------------------------
 *  File: src/cocoon-esm-interceptor/dynamic.template.ts
 * --------------------------------------------------------------------------------------------
 *  Purpose: Template for the dynamically generated 'vscode' ESM module.
 * 
 *  Description:
 *  This file serves as a raw text template that is processed by esbuild and then
 *  further populated at runtime by \`dynamic.ts\`.
 * 
 *  - \`ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME\`: This placeholder is substituted
 *    by esbuild's \`define\` feature during the build process. It will be replaced
 *    with the actual string name of the global function (e.g., "_COCOON_RESOLVE_ESM_VSCODE_API")
 *    that retrieves the extension-specific vscode API instance.
 * 
 *  - \`__RUNTIME_API_KEY__\`: This placeholder is replaced at runtime by \`dynamic.ts\`
 *    with the unique key associated with the specific vscode API instance for the
 *    importing extension.
 * 
 *  - \`__RUNTIME_EXPORT_STATEMENTS__\`: This placeholder is replaced at runtime by
 *    \`dynamic.ts\` with a series of \`export const ...\` statements, dynamically
 *    generated based on the properties of the vscode API instance.
 * 
 *  Loading Mechanism:
 *  This file is intended to be loaded as raw text using esbuild's 'text' loader,

 *  configured for the '.template.ts' extension. This allows TypeScript tooling
 *  (formatting, basic syntax validation if placeholders are declared) to be used
 *  on this file, while still treating its content as a string for processing.
 * 
 *  IMPORTANT:
 *  The \`declare const\` statements below are purely for developer convenience when
 *  viewing or editing this file directly in a TypeScript-aware editor. They help
 *  satisfy the TypeScript parser and linters. These declarations DO NOT AFFECT
 *  the raw string content loaded by esbuild's 'text' loader and are NOT part
 *  of the final script generated from this template.
 * 
 *--------------------------------------------------------------------------------------------*/

// Tooling-only declarations:
declare const ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME: string;

declare const __RUNTIME_API_KEY__: string;

// This will be a block of 'export const ...'
declare const __RUNTIME_EXPORT_STATEMENTS__: string;

// --- Cocoon Dynamic 'vscode' API Module (ESM loaded via data: URI) ---
// This script is executed when an extension's ESM code \`import ... from 'vscode'\`.
// It dynamically retrieves the extension-specific 'vscode' API instance.

// Retrieve the vscode API instance using the globally defined function and a unique API key.
// ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME is replaced by esbuild at build time.
// __RUNTIME_API_KEY__ is replaced by the interceptor at runtime.
const __apiInstance =
	// @ts-expect-error
	globalThis[ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME](__RUNTIME_API_KEY__);

// If the API instance cannot be retrieved, it's a critical failure.
if (!__apiInstance) {
	// This error message will appear in the extension's console if something goes wrong.
	// The placeholders will have been replaced with their actual values.
	throw new Error(
		\`Cocoon Critical Error: Failed to retrieve vscode API instance for ESM module. \` +
			\`API Key: "\${__RUNTIME_API_KEY__}". \` +
			\`Global function '\${ESBUILD_REPLACED_GLOBAL_API_FUNCTION_NAME}' might be missing, API key invalid, or API instance not cached. \` +
			\`This usually indicates an issue with the Cocoon ESM interceptor setup or the API factory.\`,
	);
}

// Dynamically export all properties from the retrieved API instance.
// __RUNTIME_EXPORT_STATEMENTS__ is replaced by the interceptor at runtime with lines like:
// export const commands = __apiInstance['commands'];

// export const window = __apiInstance['window'];

// ... etc.
__RUNTIME_EXPORT_STATEMENTS__;

// Provide a default export for convenience, e.g., \`import vscode from 'vscode'\`.
export default __apiInstance;
`;export{i as default};
