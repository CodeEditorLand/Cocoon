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
 *
 * This file is preserved temporarily for context during the refactoring process.
 *
 * Original Intended Responsibilities:
 * - Declaring that it specifically handles the 'fs' Node.js module name.
 * - Implementing the `load(request, parentUri, originalLoad)` method, which is invoked
 *   by the `NodeRequireInterceptor` when a `require('fs')` call is detected.
 * - Consistently returning the singleton instance of the Cocoon 'fs' shim (from
 *   `fs-shim.ts`) for any `require('fs')` request.
 *
 *--------------------------------------------------------------------------------------------*/

import type { Uri as VscodeUri } from "vscode"; // From API shim

import fsShimInstanceFromFile, { type FsShimStructure } from "./fs-shim"; // This import will be problematic if fs-shim.ts is removed
import type { INodeModuleFactory } from "./node-module-shim-factory"; // Assuming INodeModuleFactory is defined here or shared

console.error(
	"[Cocoon FS Module Factory] WARNING: This module (fs-module-shim-factory.ts) is OBSOLETE and should be removed. " +
		"Its corresponding shim (fs-shim.ts) relies on a deprecated backend. " +
		"Extensions should use vscode.workspace.fs.",
);

export interface INodeModuleFactoryForFs extends INodeModuleFactory {
	readonly nodeModuleName: "fs";
	load(
		request: "fs",
		parentUri: VscodeUri | undefined,
		originalLoad: (request: string) => any,
	): FsShimStructure;
}

export class FsModuleShimFactory implements INodeModuleFactoryForFs {
	public readonly nodeModuleName: "fs" = "fs";

	public load(
		request: "fs",
		parentUri: VscodeUri | undefined,
		_originalLoad: (request: string) => any, // Marked unused
	): FsShimStructure {
		const requesterModulePath = parentUri
			? parentUri.fsPath || parentUri.toString()
			: "an unknown module";

		// Log at a higher level due to obsolescence.
		console.warn(
			`[Cocoon FS Module Factory - OBSOLETE] Intercepted require('fs') from '${requesterModulePath}'. Providing Cocoon's fs-shim, which is NON-FUNCTIONAL due to a deprecated backend. Extensions MUST use vscode.workspace.fs.`,
		);
		return fsShimInstanceFromFile;
	}
}
