/**
 * @module Error (NodeModuleShim)
 * @description Defines custom, tagged errors for the Node.js module shimming service.
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to require a built-in Node.js
 * module that is explicitly blocked by the host for security or stability reasons.
 */
export class ModuleBlockedError extends Data.TaggedError("ModuleBlockedError")<{
	readonly ModuleName: string;
}> {
	override get message() {
		return `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
	}
}

/**
 * An error indicating that an extension attempted to require a built-in Node.js
 * module for which no safe, sandboxed shim has been implemented.
 */
export class ModuleNotShimmedError extends Data.TaggedError(
	"ModuleNotShimmedError",
)<{
	readonly ModuleName: string;
}> {
	override get message() {
		return `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
	}
}
