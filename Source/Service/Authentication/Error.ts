/*
 * File: Cocoon/Source/Service/Authentication/Error.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:44 UTC
 * Dependency: ./Error/AuthenticationProviderExistsError.js, effect
 * Export: AuthenticationProviderExistsError, AuthenticationProviderRegistrationError
 */

/**
 * @module Error (Authentication)
 * @description Exports all custom, tagged errors for the Authentication service.
 */

import { Data } from "effect";

import AuthenticationProviderExistsError from "./Error/AuthenticationProviderExistsError.js";

/**
 * An error indicating a failure during the registration of an authentication provider.
 * This is a more generic error type.
 */
export class AuthenticationProviderRegistrationError extends Data.TaggedError(
	"AuthenticationProviderRegistrationError",
)<{
	readonly cause: unknown;
}> {}

export { AuthenticationProviderExistsError };
