/**
 * @module Error (Cancellation)
 * @description Defines custom errors for the cancellation service.
 */

import { Data } from "effect";

/**
 * A tagged error indicating that an invalid token ID was provided.
 */
export class InvalidTokenIdError extends Data.TaggedError(
	"InvalidTokenIdError",
)<{
	readonly tokenId: number;
}> {
	get message() {
		return `Invalid tokenId ('${this.tokenId}') provided. Must be a positive number.`;
	}
}
