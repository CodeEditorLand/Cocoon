/**
 * @module DynamicModuleTemplate (EsmInterceptor)
 * @description A raw text template for the dynamically generated 'vscode' module.
 * It contains placeholders that are replaced to create a module specific to one
 * extension's API instance.
 */

/**
 * The template string for the dynamic 'vscode' ESM module.
 *
 * Placeholders:
 * - `__BUILD_TIME_GLOBAL_API_FUNCTION_NAME__`: This is replaced at build time
 *   (e.g., by ESBuild's `define` option) with the actual name of the global
 *   function that retrieves the API instance.
 * - `__RUNTIME_API_KEY__`: This is replaced at runtime with the unique key for
 *   the specific extension's `vscode` API object.
 * - `__RUNTIME_EXPORT_STATEMENTS__`: This is replaced at runtime with the
 *   dynamically generated `export const ...` statements.
 */
export const DynamicModuleTemplate = `
  // This global function is defined in the main Cocoon process. The ESM loader
  // hook tells this dynamic module which key to use to retrieve its sandboxed API.
  const VscodeApiInstance = globalThis[__BUILD_TIME_GLOBAL_API_FUNCTION_NAME__]('__RUNTIME_API_KEY__');

  // This check is a critical safeguard. If it fails, something is fundamentally
  // broken in the interception or API factory process.
  if (!VscodeApiInstance) {
    throw new Error(
      'Cocoon Critical Error: Failed to retrieve vscode API instance for ESM module. ' +
      'This indicates a severe issue with the ESM interceptor or API factory.'
    );
  }

  // Dynamically generated exports are injected here.
  // e.g., export const window = VscodeApiInstance['window'];
  __RUNTIME_EXPORT_STATEMENTS__

  // The default export allows for \`import vscode from 'vscode'\`.
  export default VscodeApiInstance;
`;
