/**
 * @module Error (Cancellation)
 * @description Defines custom, tagged errors for the cancellation service.
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
	get message() {
		return `Invalid TokenID ('${this.TokenID}') provided. Must be a positive number.`;
	}
}
