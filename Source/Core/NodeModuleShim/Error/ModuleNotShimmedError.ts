/*
 * File: Cocoon/Source/Core/NodeModuleShim/Error/ModuleNotShimmedError.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:50 UTC
 * Dependency: effect
 * Export: ModuleNotShimmedError
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to require a built-in Node.js
 * module for which no safe, sandboxed shim has been implemented.
 */
export class ModuleNotShimmedError extends Data.TaggedError(
	"ModuleNotShimmedError",
)<{
	readonly ModuleName: string;
}> {
	constructor(properties: { readonly ModuleName: string }) {
		super(properties);
		this.message = `Module '${this.ModuleName}' was intercepted, but no shim is defined for it.`;
	}
	public override readonly message: string;
}

export default ModuleNotShimmedError;
