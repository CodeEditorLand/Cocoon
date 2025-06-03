/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim Factory (fs-module-shim-factory.ts) - OBSOLETE
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # WARNING: OBSOLETE MODULE - TO BE REMOVED                                               #
 * ##########################################################################################
 * This factory was designed to provide `fs-shim.ts` for `require('fs')` calls.
 * However, `fs-shim.ts` relies on a DEPRECATED AND NON-FUNCTIONAL backend in Mountain.
 *
 * CONSEQUENTLY, THIS FACTORY AND `fs-shim.ts` SHOULD BE REMOVED.
 *
 * The recommended approach is:
 * 1. Delete `fs-module-shim-factory.ts` and `fs-shim.ts`.
 * 2. Modify `NodeModuleShimFactory.ts` to explicitly handle `require('fs')` by
 *    throwing an error that directs extensions to use `vscode.workspace.fs`.
 *    (This change has likely already been made in the synthesized NodeModuleShimFactory.ts).
 *
 * This file is preserved temporarily for context during the refactoring process and to
 * document its previous role.
 *
 * Original Intended Responsibilities:
 * - Declaring that it specifically handles the 'fs' Node.js module name.
 * - Implementing the `load(request, parentUri, originalLoad)` method, which is invoked
 *   by the `NodeRequireInterceptor` when a `require('fs')` call is detected.
 * - Consistently returning the singleton instance of the Cocoon 'fs' shim (from
 *   `fs-shim.ts`) for any `require('fs')` request.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp (reflecting obsolete status).
 *--------------------------------------------------------------------------------------------*/

import type { Uri as VscodeUri } from "vscode"; // From API shim, for parentUri type

// Import the fs-shim and its type. This import will be problematic if fs-shim.ts is (or should be) removed.
import fsShimInstanceFromFile, { type FsShimStructure } from "./fs-shim";
// The INodeModuleFactory interface is also defined in `node-module-shim-factory.ts`.
// Assuming it's defined there or in a shared types file for consistency.
import type { INodeModuleFactory } from "./node-module-shim-factory";

console.error(
	// Log as error for high visibility
	"[Cocoon FS Module Factory - OBSOLETE] WARNING: This module (fs-module-shim-factory.ts) is OBSOLETE and should be removed. " +
		"Its corresponding shim (fs-shim.ts) relies on a deprecated and non-functional backend in Mountain. " +
		"Extensions MUST use `vscode.workspace.fs` for all filesystem operations.",
);

/**
 * A specialized version of `INodeModuleFactory` specifically for the 'fs' module.
 * This ensures type safety for the `request` parameter and the return type of `load`.
 * NOTE: This interface and its implementing class are OBSOLETE.
 */
export interface INodeModuleFactoryForFs extends INodeModuleFactory {
	/** This factory exclusively handles the "fs" module. */
	readonly nodeModuleName: "fs"; // Overrides to be more specific

	/**
	 * Loads the Cocoon 'fs' module shim.
	 * @param request Will always be "fs" for this factory.
	 * @param parentUri The URI of the module that made the `require('fs')` call.
	 * @param originalLoad A function to call the original Node.js `require` (not used by this factory for 'fs').
	 * @returns The `FsShimStructure` instance from `fs-shim.ts` (which is non-functional).
	 */
	load(
		request: "fs", // Parameter `request` is specifically "fs".
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): FsShimStructure; // Return type is the specific structure of the (obsolete) fs-shim.
}

/**
 * (OBSOLETE) A factory dedicated to providing the Cocoon shim for Node.js's built-in 'fs' module.
 * This factory should be removed, and `NodeModuleShimFactory.ts` should handle blocking `require('fs')`.
 */
export class FsModuleShimFactory implements INodeModuleFactoryForFs {
	/**
	 * The name of the Node.js module this factory handles, which is always "fs".
	 */
	public readonly nodeModuleName: "fs" = "fs";

	/**
	 * Called by the `NodeRequireInterceptor` when `require('fs')` is encountered.
	 * This method *always* returns the Cocoon `fs-shim` implementation, which is NON-FUNCTIONAL.
	 *
	 * @param request The module name being required (will always be "fs" for this factory).
	 * @param parentUri The URI of the module that initiated the `require('fs')` call.
	 * @param _originalLoad The original Node.js `require` function (marked as unused).
	 * @returns The `FsShimStructure` instance (Cocoon's non-functional 'fs' shim).
	 */
	public load(
		request: "fs", // Parameter `request` is guaranteed to be "fs".
		parentUri: VscodeUri | undefined,
		_originalLoad: (request: string) => any, // Marked as unused.
	): FsShimStructure {
		const requesterModulePath = parentUri
			? parentUri.fsPath || parentUri.toString() // Prefer fsPath for local readability if available.
			: "an unknown module";

		// Log at a higher level (warn or error) due to the obsolescence and non-functional nature.
		console.warn(
			// Changed from console.log to console.warn
			`[Cocoon FS Module Factory - OBSOLETE] Intercepted require('fs') from '${requesterModulePath}'. ` +
				`Providing Cocoon's fs-shim, which is NON-FUNCTIONAL due to a deprecated backend. ` +
				`Extensions MUST use vscode.workspace.fs. This factory and fs-shim.ts should be removed.`,
		);

		// Return the singleton instance of our (obsolete and non-functional) fs-shim implementation.
		return fsShimInstanceFromFile;
	}

	// `alternativeModuleName` is an optional method from `INodeModuleFactory`.
	// It's not needed here because "fs" is the canonical and expected name.
	// public alternativeModuleName(requestedName: string): string | undefined {
	//    return undefined;
	// }
}
