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
export default class extends Data.TaggedError("ModuleBlockedError")<{
	readonly ModuleName: string;
}> {
	override get message() {
		return `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
	}
}
