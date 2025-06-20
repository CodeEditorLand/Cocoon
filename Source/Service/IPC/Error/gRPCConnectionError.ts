

import { Data } from "effect";

/**
 * A structured error indicating a failure during a gRPC connection attempt or
 * server setup.
 *
 * This error is tagged with "gRPCConnectionError" for precise handling with
 * `Effect.catchTag`. It captures the underlying `Cause` and provides a `Context`
 * string to indicate which part of the connection process failed.
 */
export class GPCConnectionError extends Data.TaggedError(
	"gRPCConnectionError",
)<{
	readonly Cause: unknown;
	readonly Context:
		| "ProtoLoadFailed"
		| "ClientInstantiationFailed"
		| "ClientNotReady"
		| "ServerBindFailed"
		| "ServerStartFailed";
}> {}

export default GPCConnectionError;
