/*
 * File: Cocoon/Source/Service/IPC/StdioAdapter/Error.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:29 UTC
 * Dependency: effect
 * Export: StdioError
 */

/**
 * @module Error (StdioAdapter)
 * @description Defines custom, tagged errors for the Stdio IPC layer. This layer
 * is an alternative to gRPC for simpler communication scenarios.
 */

import { Data } from "effect";

export default class StdioError extends Data.TaggedError("StdioError")<{
	readonly cause: unknown;
	readonly context: "JsonParseFailed" | "RequestTimeout" | "WriteFailed";
}> {}
