/*---------------------------------------------------------------------------------------------
 * Cocoon Node 'fs' Shim Factory (fs-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `INodeModuleFactory` interface, specifically for intercepting
 * `require('fs')` calls within the Cocoon environment.
 *
 * Responsibilities:
 * - Declaring that it handles the 'fs' module name.
 * - Implementing the `load` method, which is called by the `NodeRequireInterceptor`.
 * - Returning the instance of `fs-shim.ts` (which provides a proxied `fs.promises` API)
 *   when `require('fs')` is intercepted by extensions or VS Code platform code.
 *
 * Key Interactions:
 * - Registered with the `NodeRequireInterceptor` in Cocoon's `index.ts`.
 * - Provides the `fs-shim.ts` module, enabling controlled/proxied filesystem access
 *   for code that directly uses Node.js's `fs` module.
 *--------------------------------------------------------------------------------------------*/

// Import the default export from fs-shim.ts (which is the fsShimInstance object)
// For parentUri type in INodeModuleFactory
import type { Uri as VscodeUri } from "vscode";

// Assuming FsShimStructure is exported from fs-shim.ts if we want to type the return value of load()
import fsShimInstanceFromFile, { type FsShimStructure } from "./fs-shim";

// --- Type Definitions ---

// INodeModuleFactory interface.
// TODO: This interface should be defined in a central location (e.g., alongside NodeRequireInterceptor
// or in a shared `types.ts`) and imported here and in `node-module-shim-factory.ts`.
export interface INodeModuleFactoryForFs {
	// Renamed to be specific if it differs slightly
	// Specifically "fs" for this factory
	readonly nodeModuleName: string;

	load(
		// Request will always be "fs" due to nodeModuleName
		request: "fs",

		parentUri: VscodeUri | undefined,

		// Function to call original Node.js require
		originalLoad: (request: string) => any,

		// Should return the type exported by fs-shim.ts
	): FsShimStructure;

	alternativeModuleName?(name: string): string | undefined;
}

export class FsModuleShimFactory implements INodeModuleFactoryForFs {
	public readonly nodeModuleName: string = "fs";

	/**
	 * Called by the NodeRequireInterceptor when `require('fs')` is encountered.
	 * Returns the Cocoon `fs-shim` implementation.
	 */
	public load(
		// Parameter `request` will always be "fs" for this factory
		request: "fs",

		parentUri: VscodeUri | undefined,

		// `originalLoad` is not used here, as we always return the shim.
		_originalLoad: (request: string) => any,
	): FsShimStructure {
		// Type the return as the structure provided by fs-shim.ts
		const requesterModule = parentUri
			? parentUri.fsPath || parentUri.toString()
			: "an unknown module";

		console.log(
			`[Cocoon FS Module Factory] Intercepted require('fs') from ${requesterModule}. Providing Cocoon's fs-shim.`,
		);

		// Return our fs-shim implementation (which is the default export of fs-shim.ts)
		return fsShimInstanceFromFile;

		// Notes:
		// - This factory *always* returns the shim for 'fs'. It does not use `originalLoad` for 'fs'.
		// - If an extension tried `require('fs/promises')`, the Node.js module system itself would typically
		//   first load 'fs' (which this factory provides), and then access the `promises` property from it.
		//   The interceptor usually only works on the top-level module name.
	}

	// alternativeModuleName is optional and not needed here as "fs" is the canonical name.
	// public alternativeModuleName(name: string): string | undefined { return undefined; }
}
