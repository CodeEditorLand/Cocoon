/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim Factory (fs-module-shim-factory.ts)
 * --------------------------------------------------------------------------------------------
 * Implements a specialized version of the `INodeModuleFactory` interface, designed
 * exclusively for intercepting `require('fs')` calls within the Cocoon extension host
 * environment.
 *
 * This factory's sole responsibility is to provide the Cocoon `fs-shim.ts`
 * implementation whenever an extension or VS Code platform code (running within Cocoon)
 * attempts to `require('fs')`. The `fs-shim.ts` module, in turn, offers a proxied
 * or controlled version of the Node.js filesystem API, with a primary focus on the
 * `fs.promises` asynchronous API. This contrasts with `vscode.workspace.fs` which is
 * handled by `fs-api-shim.ts`.
 *
 * Responsibilities:
 * - Declaring that it specifically handles the 'fs' Node.js module name.
 * - Implementing the `load(request, parentUri, originalLoad)` method, which is invoked
 *   by the `NodeRequireInterceptor` when a `require('fs')` call is detected.
 * - Consistently returning the singleton instance of the Cocoon 'fs' shim (from
 *   `fs-shim.ts`) for any `require('fs')` request. It does not delegate to the
 *   `originalLoad` function for the top-level 'fs' module.
 *
 * Key Interactions:
 * - An instance of `FsModuleShimFactory` is registered with the `NodeRequireInterceptor`
 *   in `Cocoon/index.ts`. This registration ensures that this factory is consulted
 *   specifically for `require('fs')` calls.
 * - It provides the `fs-shim.ts` module, which enables controlled and/or proxied
 *   filesystem access for code that uses Node.js's native `fs` module directly.
 * - If an extension requires a sub-path like `require('fs/promises')`, the Node.js
 *   module system (or the `NodeRequireInterceptor`) will first resolve and load 'fs'
 *   (which this factory shims). The `promises` property is then accessed from the
 *   returned shimmed 'fs' object.
 *
 *--------------------------------------------------------------------------------------------*/

// For the `parentUri` parameter type in the INodeModuleFactory interface.
// This should be `vscode.Uri` from the API definition used by extensions.
// Can also be from `../Shim/out/vscode`
import type { Uri as VscodeUri } from "vscode";

// Import the default export (the fsShimInstance object) and the type structure from fs-shim.ts.
import fsShimInstanceFromFile, { type FsShimStructure } from "./fs-shim";
// The `INodeModuleFactory` interface is also defined in `node-module-shim-factory.ts` (the general one).
// For type compatibility and to show this factory conforms to a general pattern,

// we import it. Ideally, INodeModuleFactory would be in a shared types file.
import type { INodeModuleFactory } from "./node-module-shim-factory";

// --- Type Definitions ---

/**
 * A specialized version of the `INodeModuleFactory` interface, tailored specifically
 * for providing the 'fs' module shim. This interface ensures type safety for the
 * `request` parameter (always "fs") and the return type of the `load` method
 * (always `FsShimStructure`).
 *
 * This interface is compatible with the general `INodeModuleFactory`.
 */
export interface INodeModuleFactoryForFs extends INodeModuleFactory {
	/** This factory exclusively handles the "fs" module. */
	// Overrides to be more specific than string | readonly string[]
	readonly nodeModuleName: "fs";

	/**
	 * Loads the Cocoon 'fs' module shim.
	 *
	 * @param request The module name being required; will always be "fs" for this factory.
	 * @param parentUri The URI of the module that made the `require('fs')` call.
	 * @param originalLoad A function to call the original Node.js `require` mechanism
	 *                     (not used by this factory for the top-level 'fs' module, as it always provides the shim).
	 * @returns The `FsShimStructure` instance, which is Cocoon's shim for the 'fs' module.
	 */
	load(
		// Parameter `request` is specifically "fs".
		request: "fs",

		parentUri: VscodeUri | undefined,

		originalLoad: (request: string) => any,

		// Return type is the specific structure of the fs-shim.
	): FsShimStructure;
}

/**
 * A factory dedicated to providing the Cocoon shim for Node.js's built-in 'fs' module.
 * It ensures that any attempt to `require('fs')` within the Cocoon environment
 * receives the controlled `fs-shim.ts` implementation.
 */
export class FsModuleShimFactory implements INodeModuleFactoryForFs {
	/**
	 * The name of the Node.js module this factory handles, which is always "fs".
	 * The `NodeRequireInterceptor` uses this to route `require('fs')` calls to this factory.
	 */
	public readonly nodeModuleName: "fs" = "fs";

	/**
	 * Called by the `NodeRequireInterceptor` when `require('fs')` is encountered.
	 * This method *always* returns the Cocoon `fs-shim` implementation, effectively
	 * replacing the native Node.js 'fs' module for extensions.
	 *
	 * @param request The module name being required (will always be "fs" for this factory).
	 * @param parentUri The URI of the module that initiated the `require('fs')` call.
	 *                  Used here for logging purposes.
	 * @param _originalLoad The original Node.js `require` function. This is marked as unused
	 *                      (with an underscore prefix) because this factory always provides its
	 *                      own shim for 'fs' and does not delegate the top-level 'fs' request.
	 * @returns The `FsShimStructure` instance (Cocoon's shim for the 'fs' module).
	 */
	public load(
		// Parameter `request` is guaranteed to be "fs".
		request: "fs",

		parentUri: VscodeUri | undefined,

		// Marked as unused for this specific factory.
		_originalLoad: (request: string) => any,
	): FsShimStructure {
		const requesterModulePath = parentUri
			? // Prefer fsPath for readability if available.
				parentUri.fsPath || parentUri.toString()
			: "an unknown module";

		// This log can be frequent. Consider using a trace level log for production builds
		// or making it conditional via a debug flag if too verbose.
		// If this factory were to extend BaseCocoonShim, this._logService?.trace could be used.
		// For a simple factory, console.log is acceptable for this bootstrap-time information.
		console.log(
			`[Cocoon FS Module Factory] Intercepted require('fs') from '${requesterModulePath}'. Providing Cocoon's fs-shim.`,
		);

		// Return the singleton instance of our fs-shim implementation.
		return fsShimInstanceFromFile;

		// Note on sub-path requires (e.g., `require('fs/promises')`):
		// The Node.js CJS module system resolves `require('fs/promises')` by first loading the 'fs' module.
		// Since this factory shims 'fs', the extension receives our `fs-shim` object.
		// The `promises` property is then accessed from this shimmed 'fs' object, which is
		// expected to provide the `fs.promises` API.
		// This factory intercepts the top-level 'fs' module request.
	}

	// `alternativeModuleName` is an optional method from `INodeModuleFactory`.
	// It's not needed here because "fs" is the canonical and expected name.
	// If extensions were to use `require('node:fs')`, and this factory was only registered
	// for 'fs', then `alternativeModuleName` could map "node:fs" to "fs".
	// However, `NodeRequireInterceptor` typically normalizes "node:fs" to "fs" before calling factories.
	// public alternativeModuleName(requestedName: string): string | undefined {

	//    if (requestedName === 'node:fs') return 'fs';

	//    return undefined;

	// }
}
