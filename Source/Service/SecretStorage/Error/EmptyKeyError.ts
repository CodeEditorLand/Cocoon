/**
 * @module EmptyKeyError (SecretStorage/Error)
 * @description Defines a custom error for when an empty key is used with secret storage.
 */

import { Data } from "effect";

/**
 * An error indicating that an empty string was provided as a key, which is invalid.
 */
export default class extends Data.TaggedError("EmptyKeyError")<{}> {
	constructor(Properties?: {}) {
		super(Properties ?? {});
		this.message = "Secret key cannot be empty.";
	}
	public override readonly message: string;
}
