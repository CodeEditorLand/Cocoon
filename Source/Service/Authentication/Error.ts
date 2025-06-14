/**
 * @module Error (Authentication)
 * @description Defines custom, tagged errors for the Authentication service.
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
	override get message() {
		return `Authentication provider with ID '${this.ProviderID}' is already registered.`;
	}
}

/**
 * An error indicating a failure during the registration of an authentication provider.
 * This is a more generic error type.
 */
export class AuthenticationProviderRegistrationError extends Data.TaggedError(
	"AuthenticationProviderRegistrationError",
)<{
	readonly cause: unknown;
}> {}
