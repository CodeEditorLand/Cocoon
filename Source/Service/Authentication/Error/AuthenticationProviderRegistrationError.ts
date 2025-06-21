/**
 * @module Error (Authentication)
 * @description Exports all custom, tagged errors for the Authentication service.
 */

import { Data } from "effect";

/**
 * An error indicating a failure during the registration of an authentication provider.
 * This is a more generic error type.
 */
export default class extends Data.TaggedError(
	"AuthenticationProviderRegistrationError",
)<{
	readonly cause: unknown;
}> {}
