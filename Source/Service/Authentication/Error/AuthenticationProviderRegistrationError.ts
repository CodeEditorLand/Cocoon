/*
 * File: Cocoon/Source/Service/Authentication/Error/AuthenticationProviderRegistrationError.ts
 *
 * This file defines a generic error for failures during the registration of
 * an authentication provider.
 */

import { Data } from "effect";

/**
 * An error indicating a failure during the registration of an authentication provider.
 * This is a more generic error type that wraps the underlying cause.
 */
export default class extends Data.TaggedError(
	"AuthenticationProviderRegistrationError",
)<{
	readonly cause: unknown;
}> {}
