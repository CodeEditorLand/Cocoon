/*
 * File: Cocoon/Source/Service/IPC/Error/IPCError.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:22 UTC
 * Dependency: effect
 * Export: extends
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
