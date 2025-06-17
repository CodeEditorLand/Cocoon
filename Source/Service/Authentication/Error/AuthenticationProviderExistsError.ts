/*
 * File: Cocoon/Source/Service/Authentication/Error/AuthenticationProviderExistsError.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: effect
 * Export: AuthenticationProviderExistsError
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to register an authentication
 * provider with an ID that is already in use.
 */
export class AuthenticationProviderExistsError extends Data.TaggedError(
	"AuthenticationProviderExistsError",
)<{
	readonly ProviderID: string;
}> {
	constructor(properties: { readonly ProviderID: string }) {
		super(properties);
		this.message = `Authentication provider with ID '${this.ProviderID}' is already registered.`;
	}
	public override readonly message: string;
}

export default AuthenticationProviderExistsError;
