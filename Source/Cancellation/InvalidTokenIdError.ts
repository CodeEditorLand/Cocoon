/**
 * @module InvalidTokenIdError
 * @description Defines a custom, tagged error for when an invalid token ID
 * is provided to the Cancellation service.
 */

import { Data } from "effect";

/**
 * @class InvalidTokenIdError
 * @description A tagged error indicating that an invalid token ID was provided.
 * Cancellation tokens are identified by positive integers.
 */
export class InvalidTokenIdError extends Data.TaggedError(
	"InvalidTokenIdError",
)<{
	readonly TokenId: number;
}> {
	public override readonly message: string;
	constructor(Properties: { readonly TokenId: number }) {
		super(Properties);
		this.message = `Invalid TokenId ('${this.TokenId}') provided. Must be a positive number.`;
	}
}
