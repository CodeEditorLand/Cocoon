/**
 * @module Error
 * @description Defines custom, structured errors for the gRPC Inter-Process
 * Communication (IPC) layer.
 */

import { Data } from "effect";

/**
 * A structured error indicating a failure during a gRPC connection attempt or
 * server setup.
 *
 * This error is tagged with "gRPCConnectionError" for precise handling with
 * `Effect.catchTag`. It captures the underlying `cause` and provides a `context`
 * string to indicate which part of the connection process failed.
 *
 * @property cause - The original, underlying error that was caught.
 * @property context - A string describing the operation that failed.
 */
export class gRPCConnectionError extends Data.TaggedError(
	"gRPCConnectionError",
)<{
	readonly Cause: unknown;
	readonly context:
		| "ProtoLoadFailed"
		| "ClientInstantiationFailed"
		| "ClientNotReady"
		| "ServerBindFailed"
		| "ServerStartFailed";
}> {}

/**
 * A generic error for failures that occur during an IPC request or notification.
 */
export class IPCError extends Data.TaggedError("IPCError")<{
	readonly cause: unknown;
	readonly context: string;
}> {}
