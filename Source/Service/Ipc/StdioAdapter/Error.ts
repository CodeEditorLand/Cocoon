/**
 * @module Error (StdioAdapter)
 * @description Defines custom errors for the Stdio IPC layer.
 */

import { Data } from "effect";

export class StdioError extends Data.TaggedError("StdioError")<{
	readonly cause: unknown;
	readonly context: "JsonParseFailed" | "RequestTimeout" | "WriteFailed";
}> {}
