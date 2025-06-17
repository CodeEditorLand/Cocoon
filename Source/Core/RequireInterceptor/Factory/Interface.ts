/*
 * File: Cocoon/Source/Core/RequireInterceptor/Factory/Interface.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:38 UTC
 * Dependency: vscode
 * Export: INodeModuleFactory
 */

/**
 * @module INodeModuleFactory (RequireInterceptor/Factory)
 * @description Defines the interface for a factory that creates module instances
 * for intercepted `require` calls.
 */

import type * as VSCode from "vscode";

/**
 * The interface for a factory that can produce a module when `require(Request)`
 * is called by an extension.
 */
export default interface INodeModuleFactory {
	/**
	 * Loads or creates a module instance.
	 * @param Request The exact string passed to `require` (e.g., 'vscode').
	 * @param ParentURI The URI of the module making the `require` call.
	 * @param OriginalRequire A function that calls the original `require` function.
	 *   This can be used to load real modules if needed.
	 * @returns The module object to be returned by the patched `require`.
	 */
	Load(
		Request: string,
		ParentURI: VSCode.Uri,
		OriginalRequire: (request: string) => any,
	): any;
}
