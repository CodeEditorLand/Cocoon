/*
 * File: Cocoon/Source/Service/Cancellation/Error/InvalidTokenIDError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:15 UTC
 * Dependency: effect
 * Export: extends
 */

/**
 * @module InvalidTokenIDError (Cancellation/Error)
 * @description Defines custom, tagged errors for the cancellation service.
 */

import { Data } from "effect";

/**
 * A tagged error indicating that an invalid token ID was provided. Cancellation
 * tokens are identified by positive integers.
 */
export default class extends Data.TaggedError("InvalidTokenIDError")<{
	readonly TokenID: number;
}> {
	constructor(properties: { readonly TokenID: number }) {
		super(properties);
		this.message = `Invalid TokenID ('${this.TokenID}') provided. Must be a positive number.`;
	}
	override message: string;
}
