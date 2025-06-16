/*
 * File: Cocoon/Source/Service/Cancellation/Error/InvalidTokenIDError.ts
 * Responsibility: Defines a custom error for an invalid cancellation token ID.
 *
 * Last-Modified: 2025-06-18
 */

import { Data } from "effect";

/**
 * A tagged error indicating that an invalid token ID was provided. Cancellation
 * tokens are identified by positive integers.
 */
export class InvalidTokenIDError extends Data.TaggedError(
	"InvalidTokenIDError",
)<{
	readonly TokenID: number;
}> {
	constructor(properties: { readonly TokenID: number }) {
		super(properties);
		this.message = `Invalid TokenID ('${this.TokenID}') provided. Must be a positive number.`;
	}
	public override readonly message: string;
}

export default InvalidTokenIDError;
