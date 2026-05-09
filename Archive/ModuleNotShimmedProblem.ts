/**
 * @module ModuleNotShimmedProblem
 * @description Defines a custom error for when an extension attempts to require
 * a Node.js module for which no safe shim has been implemented.
 */

import { Data } from "effect";

/**
 * @class ModuleNotShimmedProblem
 * @description An error indicating that an extension attempted to require a
 * built-in Node.js module for which no safe, sandboxed shim has been implemented.
 */
export class ModuleNotShimmedProblem extends Data.TaggedError(
	"ModuleNotShimmedProblem",
)<{
	readonly ModuleName: string;
}> {
	public override readonly message: string;

	constructor(Properties: { readonly ModuleName: string }) {
		super(Properties);

		this.message = `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
	}
}
