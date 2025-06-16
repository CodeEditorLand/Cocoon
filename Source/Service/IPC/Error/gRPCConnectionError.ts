/*
 * File: Cocoon/Source/Service/IPC/Error/gRPCConnectionError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:03 UTC
 * Dependency: effect
 * Export: extends
 */

/**
 * @module gRPCConnectionError (IPC/Error)
 * @description Defines a custom, structured error for gRPC connection failures.
 */

import { Data } from "effect";

/**
 * A structured error indicating a failure during a gRPC connection attempt or
 * server setup.
 *
 * This error is tagged with "gRPCConnectionError" for precise handling with
 * `Effect.catchTag`. It captures the underlying `cause` and provides a `Context`
 * string to indicate which part of the connection process failed.
 */
export default class extends Data.TaggedError("gRPCConnectionError")<{
	readonly Cause: unknown;
	readonly Context:
		| "ProtoLoadFailed"
		| "ClientInstantiationFailed"
		| "ClientNotReady"
		| "ServerBindFailed"
		| "ServerStartFailed";
}> {}
