/*
 * File: Cocoon/Source/Shim/FsModuleShimFactory.ts
 * Responsibility: Provides a deprecated Node.js shim for the 'fs' module, intercepting require('fs') calls in the Cocoon sidecar to return a non-functional fs-shim instance, which should be replaced with vscode.workspace.fs usage.
 * Modified: 2025-06-07 05:37:39 UTC
 * Dependency: ./Fs, ./NodeModuleShimFactory, fs, vscode
 * Export: FsModuleShimFactory, INodeModuleFactoryForFs
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js 'fs' Module Shim Factory  - OBSOLETE
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # WARNING: OBSOLETE MODULE - TO BE REMOVED                                               #
 * ##########################################################################################
 * This factory was designed to provide a shim for `require('fs')` calls.
 * However, the shim relies on a DEPRECATED AND NON-FUNCTIONAL backend in Mountain.
 *
 * CONSEQUENTLY, THIS FACTORY AND THE 'fs' SHIM SHOULD BE REMOVED.
 *
 * The recommended approach is:
 * 1. Delete `FsModuleShimFactory.ts` and `Fs.ts`.
 * 2. Modify `NodeModuleShimFactory.ts` to explicitly handle `require('fs')` by
 *    throwing an error that directs extensions to use `vscode.workspace.fs`.
 *
 * This file is preserved temporarily for context during the refactoring process.
 *
 * Original Intended Responsibilities:
 * - Declaring that it specifically handles the 'fs' Node.js module name.
 * - Implementing the `Load(...)` method, which is invoked when a `require('fs')` call is detected.
 * - Consistently returning the singleton instance of the Cocoon 'fs' shim.
 *
 *--------------------------------------------------------------------------------------------*/

import type { Uri as VscodeUri } from "vscode";

import FsShimInstance, { type FsShimStructure } from "./Fs";
import type { INodeModuleFactory } from "./NodeModuleShimFactory";

console.error(
	"[Cocoon FsModuleShimFactory OBSOLETE] WARNING: This module is OBSOLETE and should be removed. " +
		"Its corresponding shim relies on a deprecated and non-functional backend. " +
		"Extensions MUST use `vscode.workspace.fs` for all filesystem operations.",
);

/**
 * A specialized version of `INodeModuleFactory` for the 'fs' module.
 * NOTE: This interface and its implementing class are OBSOLETE.
 */
export interface INodeModuleFactoryForFs extends INodeModuleFactory {
	readonly NodeModuleName: "fs";
	Load(
		Request: "fs",
		ParentUri: VscodeUri | undefined,
		OriginalLoad: (Request: string) => any,
	): FsShimStructure;
}

/**
 * (OBSOLETE) A factory dedicated to providing the shim for Node.js's 'fs' module.
 * This factory should be removed, and `NodeModuleShimFactory` should handle blocking `require('fs')`.
 */
export class FsModuleShimFactory implements INodeModuleFactoryForFs {
	/**
	 * The name of the Node.js module this factory handles, which is always "fs".
	 */
	public readonly NodeModuleName: "fs" = "fs";

	/**
	 * Called when `require('fs')` is encountered.
	 * This method *always* returns the Cocoon `fs` shim, which is NON-FUNCTIONAL.
	 *
	 * @param Request The module name being required (will always be "fs").
	 * @param ParentUri The URI of the module that initiated the `require('fs')` call.
	 * @param OriginalLoad The original Node.js `require` function (unused).
	 * @returns The `FsShimStructure` instance (Cocoon's non-functional 'fs' shim).
	 */
	public Load(
		Request: "fs",
		ParentUri: VscodeUri | undefined,
		OriginalLoad: (Request: string) => any,
	): FsShimStructure {
		const RequesterModulePath = ParentUri
			? ParentUri.fsPath || ParentUri.toString()
			: "an unknown module";

		console.warn(
			`[Cocoon FsModuleShimFactory OBSOLETE] Intercepted require('fs') from '${RequesterModulePath}'. ` +
				`Providing Cocoon's fs-shim, which is NON-FUNCTIONAL due to a deprecated backend. ` +
				`The extension MUST use vscode.workspace.fs. This factory and its shim should be removed.`,
		);

		return FsShimInstance;
	}
}
