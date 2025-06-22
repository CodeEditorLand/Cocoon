/*
 * File: Cocoon/Source/Core/NodeModuleShim/Error/ModuleBlockedError.ts
 *
 * This file defines a custom error for when an extension attempts to require a
 * Node.js module that is explicitly blocked by the host.
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to require a built-in Node.js
 * module that is explicitly blocked by the host for security or stability reasons.
 */
export class ModuleBlockedError extends Data.TaggedError("ModuleBlockedError")<{
	readonly ModuleName: string;
}> {
	constructor(properties: { readonly ModuleName: string }) {
		super(properties);
		this.message = `[Cocoon] require('${this.ModuleName}') is disallowed. Extensions MUST use the appropriate 'vscode.*' API for this functionality.`;
	}
	public override readonly message: string;
}

export default ModuleBlockedError;
