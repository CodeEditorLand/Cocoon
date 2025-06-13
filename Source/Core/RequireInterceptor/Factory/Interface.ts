/**
 * @module Interface (RequireInterceptor/Factory)
 * @description Defines the interface for a node module factory. A factory is
 * responsible for handling an intercepted `require()` call for a specific module.
 */
import type { URI } from "vs/base/common/uri.js";

/**
 * An interface for a factory that can create or retrieve a module instance
 * when its corresponding `require()` call is intercepted.
 */
export interface Interface {
	/**
	 * The name of the module this factory handles (e.g., 'vscode').
	 */
	readonly NodeModuleName: string;

	/**
	 * The function that is called to load the module. It is responsible for
	 * returning the correct, sandboxed module exports.
	 *
	 * @param Request The module name being requested.
	 * @param ParentURI The URI of the module that is making the `require` call.
	 * @param OriginalRequire A function to call the original `require` implementation,
	 *   allowing for chaining or loading real dependencies.
	 * @returns The module exports.
	 */
	Load(
		Request: string,
		ParentURI: URI,
		OriginalRequire: (Request: string) => any,
	): any;
}
