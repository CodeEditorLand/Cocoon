/*
 * File: Cocoon/Source/Service/IPC/Error/IPCError.ts
 * Responsibility: Defines a generic, tagged error for IPC-related failures.
 *
 * Last-Modified: 2025-06-18
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
