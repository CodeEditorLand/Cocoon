/*---------------------------------------------------------------------------------------------
 * Cocoon Node 'fs' Shim Factory (shims/fs-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface for the `NodeRequireInterceptor`.
 * Its purpose is to intercept calls to Node.js's built-in `require('fs')` made by
 * extension code or bundled VS Code platform code running within Cocoon.
 *
 * Responsibilities:
 * - Declaring that it handles the 'fs' module name.
 * - Implementing the `load` method, which is called by the `NodeRequireInterceptor`.
 * - Returning the `fs-shim.ts` module instance when `require('fs')` is intercepted.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` instance in `index.ts`.
 * - Returns the `fs-shim.ts` module.
 *--------------------------------------------------------------------------------------------*/

// Assuming fs-shim.ts has a default export for the shim object
import type { Uri as VscodeUri } from "vscode"; // For parentUri type, assuming from vscode API

import fsShimInstance from "./fs-shim";

// --- Type Definitions ---

// INodeModuleFactory interface should be defined centrally if used by multiple factories.
// For this file, if not imported, a local definition suffices.
// TODO: Move INodeModuleFactory to a shared types file (e.g., `types.ts` or alongside NodeRequireInterceptor).
export interface INodeModuleFactory {
	/**
	 * The name or names of the Node.js module this factory can provide.
	 */
	readonly nodeModuleName: string | readonly string[];

	/**
	 * Called by the NodeRequireInterceptor when a listed `nodeModuleName` is required.
	 * @param request The exact string passed to `require()` (e.g., "fs", "fs/promises").
	 * @param parentUri The URI of the module that made the `require()` call.
	 * @param originalLoad A function to call the original Node.js `require` mechanism.
	 * @returns The shimmed module, or the result of `originalLoad(request)`.
	 */
	load(
		request: string,
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): any;

	/**
	 * Optional method to suggest an alternative module name if the factory
	 * handles a module under a different name than requested.
	 */
	alternativeModuleName?(name: string): string | undefined;
}

export class FsModuleShimFactory implements INodeModuleFactory {
	public readonly nodeModuleName: string = "fs"; // This factory specifically handles "fs"

	public load(
		request: string, // Will be "fs" due to nodeModuleName
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any, // Not used by this specific factory, but part of interface
	): any {
		// Should return the 'fs' module shim (the default export of fs-shim.ts)
		// Log the interception, including the requesting module if available
		const requester = parentUri
			? parentUri.fsPath || parentUri.toString()
			: "unknown module";
		console.log(
			`[Cocoon FS Factory] Intercepted require('fs') from ${requester}. Providing fs-shim.`,
		);

		// Return our fs-shim implementation.
		// fsShimInstance is the default export from fs-shim.ts.
		return fsShimInstance;

		// Potential future enhancements:
		// - Check `request`: if `request` is 'fs/promises', directly return `fsShimInstance.promises`.
		//   However, `NodeRequireInterceptor` usually handles the base module name 'fs'.
		// - Conditional shimming: Based on `parentUri` (e.g., specific extensions get different shims or direct access via originalLoad).
		//   This is complex and generally not needed for 'fs'.
	}

	// alternativeModuleName is optional and not needed here as "fs" is the canonical name.
	// public alternativeModuleName(name: string): string | undefined { return undefined; }
}

// No `module.exports` needed; `export class FsModuleShimFactory` handles the export.
