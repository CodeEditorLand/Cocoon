/**
 * @module ModuleNotShimmedError (NodeModuleShim/Error)
 * @description Defines a custom, tagged error for when an extension attempts
 * to require a Node.js module for which no shim exists.
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to require a built-in Node.js
 * module for which no safe, sandboxed shim has been implemented.
 */
export default class extends Data.TaggedError("ModuleNotShimmedError")<{
	readonly ModuleName: string;
}> {
	constructor(Properties: { readonly ModuleName: string }) {
		super(Properties);
		this.message = `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
	}
	public override readonly message: string;
}
