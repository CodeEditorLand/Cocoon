/*
 * File: Cocoon/Source/Service/SecretStorage/Error/EmptyKeyError.ts
 *
 * This file defines a custom error for when an empty key is used with secret storage.
 */

import { Data } from "effect";

/**
 * An error indicating that an empty string was provided as a key, which is invalid.
 */
export default class extends Data.TaggedError("EmptyKeyError")<{}> {
	public override readonly message: string;
	constructor() {
		super();
		this.message = "Secret key cannot be empty.";
	}
}
