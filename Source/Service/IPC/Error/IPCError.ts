/*
 * File: Cocoon/Source/Service/IPC/Error/IPCError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:02 UTC
 * Dependency: effect
 * Export: extends
 */

/**
 * @module IPCError (IPC/Error)
 * @description Defines a generic, tagged error for IPC-related failures.
 */

import { Data } from "effect";

/**
 * A generic error for failures that occur during an IPC request or notification,
 * such as a network error or a failure to serialize/deserialize a message.
 */
export default class extends Data.TaggedError("IPCError")<{
	readonly cause: unknown;
	readonly context: string;
}> {}
