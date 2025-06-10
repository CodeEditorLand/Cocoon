/**
 * @module Service (NodeModuleShim)
 * @description Defines the interface and Context.Tag for the NodeModuleShim service.
 */

import { Context, Effect } from "effect";
import type { Uri } from "vscode";

import type { ModuleBlockedError, ModuleNotShimmedError } from "./Error.js";

export interface Interface {
	/**
	 * Loads a shim for a requested built-in Node.js module.
	 * This method acts as a dispatcher. It will either return a safe, shimmed
	 * version of the module, or fail with a specific error if the module is
	 * disallowed or not implemented.
	 *
	 * @param Request - The name of the module being requested (e.g., 'fs', 'node:os').
	 * @param ParentUri - The URI of the file that made the `require` call.
	 * @returns An `Effect` that resolves with the shim module object or fails.
	 */
	readonly Load: (
		Request: string,
		ParentUri?: Uri,
	) => Effect.Effect<any, ModuleBlockedError | ModuleNotShimmedError>;
}

export const Tag = Context.Tag<Interface>("Core/NodeModuleShim");
