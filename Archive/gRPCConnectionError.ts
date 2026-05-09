/**
 * @module gRPCConnectionError
 * @description Defines a structured error for failures during a gRPC connection
 * attempt or server setup.
 */

import { Data } from "effect";

/**
 * @class gRPCConnectionError
 * @description A structured, tagged error indicating a failure during a gRPC
 * connection attempt or server setup. It captures the underlying `Cause` and
 * provides a `Context` string to indicate which part of the connection process failed.
 */
export class gRPCConnectionError extends Data.TaggedError(
	"gRPCConnectionError",
)<{
	readonly Cause: unknown;

	readonly Context:
		| "ProtoLoadFailed"
		| "ClientInstantiationFailed"
		| "ClientNotReady"
		| "ServerBindFailed"
		| "ServerStartFailed"
		| "ServerShutdownFailed";
}> {}
