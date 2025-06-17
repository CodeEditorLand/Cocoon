/*
 * File: Cocoon/Source/Service/SecretStorage/Error/InvalidValueError.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:25 UTC
 * Dependency: effect
 * Export: extends
 */

/**
 * @module InvalidValueError (SecretStorage/Error)
 * @description Defines a custom error for when a non-string value is provided to secret storage.
 */

import { Data } from "effect";

/**
 * An error indicating that a value other than a string was provided to be stored,
 * which is not allowed by the API.
 */
export default class extends Data.TaggedError("InvalidValueError")<{}> {
	public override readonly message: string;
	constructor() {
		super();

		this.message = "Secret value must be a string.";
	}
}
