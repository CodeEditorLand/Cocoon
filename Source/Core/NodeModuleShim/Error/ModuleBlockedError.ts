/**
 * @module ModuleBlockedError (NodeModuleShim/Error)
 * @description Defines a custom, tagged error for when an extension attempts
 * to require a blocked Node.js module.
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to require a built-in Node.js
 * module that is explicitly blocked by the host for security or stability reasons.
 */
export default class ModuleBlockedError extends Data.TaggedError(
	"ModuleBlockedError",
)<{
	readonly ModuleName: string;
}> {
	constructor(Properties: { readonly ModuleName: string }) {
		super(Properties);
		this.message = `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
	}
	public override readonly message: string;
}
