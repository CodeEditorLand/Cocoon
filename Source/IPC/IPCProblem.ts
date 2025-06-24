/**
 * @module IPCProblem
 * @description Defines a generic, tagged error for failures that occur during an
 * IPC request or notification.
 */

import { Data } from "effect";

/**
 * @class IPCProblem
 * @description A generic error for failures during an IPC request or notification,
 * such as a network error or a failure to serialize/deserialize a message.
 */
export class IPCProblem extends Data.TaggedError("IPCProblem")<{
	readonly Cause: unknown;
	readonly context: string;
}> {}
