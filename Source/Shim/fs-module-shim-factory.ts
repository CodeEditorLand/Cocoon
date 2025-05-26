/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim Factory (fs-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface (or a specific variant of it),
 * 
 * 
 * specifically for intercepting `require('fs')` calls within the Cocoon environment.
 *
 * This factory's sole responsibility is to provide the Cocoon `fs-shim.ts` implementation
 * whenever an extension or VS Code platform code attempts to `require('fs')`.
 * The `fs-shim.ts` module, in turn, provides a proxied or controlled version of the
 * Node.js filesystem API, particularly `fs.promises`.
 *
 * Responsibilities:
 * - Declaring that it handles the 'fs' module name.
 * - Implementing the `load` method, which is called by the `NodeRequireInterceptor`.
 * - Returning the instance of `fs-shim.ts` when `require('fs')` is intercepted.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` in Cocoon's `index.ts`.
 * - Provides the `fs-shim.ts` module, enabling controlled/proxied filesystem access
 *   for code that directly uses Node.js's 'fs' module. It does not delegate to the
 *   original 'fs' module via `originalLoad` for top-level 'fs' requests.
 *

 *--------------------------------------------------------------------------------------------*/

// For parentUri type in INodeModuleFactory, assuming from vscode API shim or VS Code internals.
// Or `../Shim/out/vscode`
import type { Uri as VscodeUri } from "vscode";

// Import the default export (the fsShimInstance object) and the type structure from fs-shim.ts.
import fsShimInstanceFromFile, { type FsShimStructure } from "./fs-shim";
// The `INodeModuleFactory` interface is also defined in `node-module-shim-factory.ts`.
// For consistency, it should be defined in one central place and imported.
// Assuming INodeModuleFactory from the other file is compatible or this specific one is used.
// Use the general one for type compatibility
import type { INodeModuleFactory } from "./node-module-shim-factory";

// --- Type Definitions ---

/**
 * A specialized version of `INodeModuleFactory` specifically for the 'fs' module.
 * This ensures type safety for the `request` parameter and the return type of `load`.
 *
 * Note: This could extend or be compatible with a more general `INodeModuleFactory`
 * if such an interface is defined centrally.
 */
export interface INodeModuleFactoryForFs extends INodeModuleFactory {
	/** Must be "fs" for this factory. */
	// More specific than string | readonly string[]
	readonly nodeModuleName: "fs";

	/**
	 * Loads the 'fs' module shim.
	 * @param request Will always be "fs" for this factory.
	 * @param parentUri The URI of the module that made the `require('fs')` call.
	 * @param originalLoad A function to call the original Node.js `require` (not used by this factory for 'fs').
	 * @returns The `FsShimStructure` instance from `fs-shim.ts`.
	 */
	load(
		// Specifically "fs"
		request: "fs",

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,
	): FsShimStructure;
}

/**
 * A factory dedicated to providing the Cocoon shim for Node.js's 'fs' module.
 */
export class FsModuleShimFactory implements INodeModuleFactoryForFs {
	/** The name of the Node.js module this factory handles, which is always "fs". */
	public readonly nodeModuleName: "fs" = "fs";

	/**
	 * Called by the `NodeRequireInterceptor` when `require('fs')` is encountered.
	 * This method always returns the Cocoon `fs-shim` implementation.
	 *
	 * @param request The module name being required (will be "fs").
	 * @param parentUri The URI of the module making the `require('fs')` call.
	 * @param _originalLoad The original Node.js `require` function (unused by this method
	 *                      as 'fs' is always shimmed).
	 * @returns The `FsShimStructure` instance (the Cocoon 'fs' shim).
	 */
	public load(
		// Parameter `request` will always be "fs" for this factory.
		request: "fs",

		parentUri: VscodeUri | undefined,

		// Marked as unused.
		_originalLoad: (request: string) => any,
	): FsShimStructure {
		const requesterModulePath = parentUri
			? parentUri.fsPath || parentUri.toString()
			: "an unknown module";

		// This log can be frequent; consider making it a trace log in a production environment.
		console.log(
			`[Cocoon FS Module Factory] Intercepted require('fs') from '${requesterModulePath}'. Providing Cocoon's fs-shim.`,
		);

		// Return our fs-shim implementation (which is the default export of fs-shim.ts).
		return fsShimInstanceFromFile;

		// Notes:
		// - This factory *always* returns the shim for the top-level 'fs' module.
		//   It does not use `_originalLoad` for the 'fs' request itself.
		// - If an extension tries `require('fs/promises')`, the Node.js module system (or the
		//   `NodeRequireInterceptor`'s behavior for subpaths) would typically first load 'fs'
		//   (which this factory provides). The extension would then access the `promises`
		//   property from the shimmed 'fs' object returned by this factory.
		//   The `NodeRequireInterceptor` usually intercepts only top-level module names.
	}

	// `alternativeModuleName` is optional and not needed here as "fs" is the canonical name.
	// public alternativeModuleName(name: string): string | undefined { return undefined; }
}
