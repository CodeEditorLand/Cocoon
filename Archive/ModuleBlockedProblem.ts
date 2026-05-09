/**
 * @module ModuleBlockedProblem
 * @description Defines a custom, tagged error for when an extension attempts
 * to require a Node.js module that is explicitly blocked by the host.
 */

import { Data } from "effect";

/**
 * @class ModuleBlockedProblem
 * @description An error indicating that an extension attempted to require a
 * built-in Node.js module that is explicitly blocked by the host for security
 * or stability reasons.
 */
export class ModuleBlockedProblem extends Data.TaggedError(
	"ModuleBlockedProblem",
)<{
	readonly ModuleName: string;
}> {
	public override readonly message: string;

	constructor(Properties: { readonly ModuleName: string }) {
		super(Properties);

		this.message = `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
	}
}
