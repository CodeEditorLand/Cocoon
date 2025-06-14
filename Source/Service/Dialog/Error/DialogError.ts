/**
 * @module DialogError (Dialog/Error)
 * @description Defines custom, tagged errors for the Dialog service.
 */

import { Data } from "effect";

/**
 * An error indicating that a dialog operation failed. This is a generic
 * wrapper for IPC or other underlying errors.
 */
export default class extends Data.TaggedError("DialogError")<{
	readonly cause: unknown;
	readonly context: string;
}> {
	override get message() {
		return `Dialog operation failed: ${this.context}`;
	}
}
