/**
 * @module Error (SecretStorage)
 * @description Defines custom errors for the SecretStorage service.
 */

import { Data } from "effect";

export class EmptyKeyError extends Data.TaggedError("EmptyKeyError")<{}> {
	get message() {
		return "Secret key cannot be empty.";
	}
}

export class InvalidValueError extends Data.TaggedError(
	"InvalidValueError",
)<{}> {
	get message() {
		return "Secret value must be a string.";
	}
}
