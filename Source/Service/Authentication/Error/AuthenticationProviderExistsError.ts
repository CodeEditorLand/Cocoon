/*
 * File: Cocoon/Source/Service/Authentication/Error/AuthenticationProviderExistsError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:20 UTC
 * Dependency: effect
 * Export: extends
 */

/**
 * @module AuthenticationProviderExistsError (Authentication/Error)
 * @description Defines custom, tagged errors for the Authentication service.
 */

import { Data } from "effect";

/**
 * An error indicating that an extension attempted to register an authentication
 * provider with an ID that is already in use.
 */
export default class extends Data.TaggedError(
	"AuthenticationProviderExistsError",
)<{
	readonly ProviderID: string;
}> {
	constructor(Properties: { readonly ProviderID: string }) {
		super(Properties);
		this.message = `Authentication provider with ID '${this.ProviderID}' is already registered.`;
	}
	public override readonly message: string;
}
