/*
 * File: Cocoon/Source/Service/Dialog/Error/DialogError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:12 UTC
 * Dependency: effect
 * Export: DialogError
 */

/**
 * @module DialogError (Dialog/Error)
 * @description Defines custom, tagged errors for the Dialog service.
 */

import { Data } from "effect";

/**
 * An error indicating that a dialog operation failed. This is a generic
 * wrapper for IPC or other underlying errors.
 */
export default class DialogError extends Data.TaggedError("DialogError")<{
	readonly cause: unknown;
	readonly context: string;
}> {
	constructor(Properties: {
		readonly cause: unknown;
		readonly context: string;
	}) {
		super(Properties);
		this.message = `Dialog operation failed: ${this.context}`;
	}
	public override readonly message: string;
}
