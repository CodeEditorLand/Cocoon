/**
 * @module Error (StdioAdapter)
 * @description Defines custom, tagged errors for the Stdio IPC layer. This layer
 * is an alternative to gRPC for simpler communication scenarios.
 */

import { Data } from "effect";

export default class extends Data.TaggedError("StdioError")<{
	readonly cause: unknown;

	readonly context: "JsonParseFailed" | "RequestTimeout" | "WriteFailed";
}> {}
