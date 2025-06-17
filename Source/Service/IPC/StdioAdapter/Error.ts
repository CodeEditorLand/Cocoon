/*
 * File: Cocoon/Source/Service/IPC/StdioAdapter/Error.ts
 * Responsibility: Defines custom tagged errors for the StdioAdapter IPC layer in the Cocoon sidecar, handling JSON parsing failures, timeouts, and write errors during communication with the Mountain backend via the Vine transport.
 * Modified: 2025-06-17 21:19:19 UTC
 * Dependency: effect
 * Export: extends
 */

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
