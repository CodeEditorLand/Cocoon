/**
 * @module Error (SecretStorage)
 * @description Defines custom, tagged errors for the SecretStorage service.
 */

import { Data } from "effect";

/**
 * An error indicating that an empty string was provided as a key, which is invalid.
 */
export class EmptyKeyError extends Data.TaggedError("EmptyKeyError")<{}> {
	override get message() {
		return "Secret key cannot be empty.";
	}
}

/**
 * An error indicating that a value other than a string was provided to be stored,
 * which is not allowed by the API.
 */
export class InvalidValueError extends Data.TaggedError(
	"InvalidValueError",
)<{}> {
	override get message() {
		return "Secret value must be a string.";
	}
}
