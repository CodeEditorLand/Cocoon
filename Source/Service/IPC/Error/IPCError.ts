/*
 * File: Cocoon/Source/Service/IPC/Error/IPCError.ts
 * Responsibility: Defines a generic, tagged error class for handling IPC-related failures in the Cocoon Node.js sidecar, providing structured error context for issues like network errors or message serialization failures during communication via the Vine IPC layer.
 * Modified: 2025-06-17 10:32:32 UTC
 * Dependency: effect
 * Export: IPCError
 */

import { Data } from "effect";

/**
 * A generic error for failures that occur during an IPC request or notification,
 * such as a network error or a failure to serialize/deserialize a message.
 */
export class IPCError extends Data.TaggedError("IPCError")<{
	readonly cause: unknown;
	readonly context: string;
}> {}

export default IPCError;
