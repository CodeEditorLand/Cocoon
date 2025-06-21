import { Data } from "effect";

/**
 * An error indicating that a dialog operation failed. This is a generic
 * wrapper for IPC or other underlying errors.
 */
export class DialogError extends Data.TaggedError("DialogError")<{
	readonly cause: unknown;
	readonly context: string;
}> {
	constructor(properties: {
		readonly cause: unknown;
		readonly context: string;
	}) {
		super(properties);
		this.message = `Dialog operation failed: ${this.context}`;
	}
	public override readonly message: string;
}

export default DialogError;
