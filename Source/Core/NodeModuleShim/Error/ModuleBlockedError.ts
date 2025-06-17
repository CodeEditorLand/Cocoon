/*
 * File: Cocoon/Source/Core/NodeModuleShim/Error/ModuleBlockedError.ts
 * Responsibility: Defines a custom error (ModuleBlockedError) for the Cocoon sidecar's Node.js module shim, enforcing security by blocking extensions from requiring restricted core modules and redirecting them to use the vscode.* API surface instead.
 * Modified: 2025-06-17 10:32:50 UTC
 * Dependency: ${this.ModuleName}, effect
 * Export: ModuleBlockedError
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
