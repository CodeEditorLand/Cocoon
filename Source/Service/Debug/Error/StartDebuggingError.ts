import { Data } from "effect";

/**
 * An error indicating that a `startDebugging` call failed.
 */
export class StartDebuggingError extends Data.TaggedError(
	"StartDebuggingError",
)<{
	readonly cause: unknown;
}> {
	constructor(properties: { readonly cause: unknown }) {
		super(properties);
		this.message = `Failed to start debugging session.`;
	}
	public override readonly message: string;
}

export default StartDebuggingError;
