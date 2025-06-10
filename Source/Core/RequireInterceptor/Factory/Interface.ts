/**
 * @module Interface (Factory)
 * @description Defines the interface for a node module factory.
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
	 * The function that is called to load the module.
	 * @param Request - The module name being requested.
	 * @param ParentUri - The URI of the module that is making the `require` call.
	 * @param OriginalRequire - A function to call the original `require` implementation.
	 */
	Load(
		Request: string,
		ParentUri: URI,
		OriginalRequire: (Request: string) => any,
	): any;
}
