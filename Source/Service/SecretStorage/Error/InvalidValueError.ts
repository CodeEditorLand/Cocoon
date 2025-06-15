/**
 * @module InvalidValueError (SecretStorage/Error)
 * @description Defines a custom error for when a non-string value is provided to secret storage.
 */

import { Data } from "effect";

/**
 * An error indicating that a value other than a string was provided to be stored,
 * which is not allowed by the API.
 */
export default class extends Data.TaggedError("InvalidValueError")<void> {
	constructor() {
		super();
		this.message = "Secret value must be a string.";
	}
	public override readonly message: string;
}
