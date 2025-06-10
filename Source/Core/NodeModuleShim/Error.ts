/**
 * @module Error (NodeModuleShim)
 * @description Defines custom errors for the module shimming service.
 */

import { Data } from "effect";

export class ModuleBlockedError extends Data.TaggedError("ModuleBlockedError")<{
	readonly moduleName: string;
}> {
	get message() {
		return `[Cocoon] require('${this.moduleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
	}
}

export class ModuleNotShimmedError extends Data.TaggedError(
	"ModuleNotShimmedError",
)<{
	readonly moduleName: string;
}> {
	get message() {
		return `Module '${this.moduleName}' was intercepted, but no shim is defined for it.`;
	}
}
