/**
 * @module Definition (Log)
 * @description The live implementation of the Log service.
 */

import { Effect } from "effect";

import type { Interface } from "./Service.js";

/**
 * An Effect that builds the live implementation of the Log service.
 * It simply maps its methods to the corresponding methods on the
 * built-in `Effect` logger.
 */
export const Definition = Effect.succeed({
	Trace: (message, ...data) =>
		Effect.logTrace(message).pipe(
			Effect.annotateLogs("data", data.length === 1 ? data[0] : data),
		),
	Debug: (message, ...data) =>
		Effect.logDebug(message).pipe(
			Effect.annotateLogs("data", data.length === 1 ? data[0] : data),
		),
	Info: (message, ...data) =>
		Effect.logInfo(message).pipe(
			Effect.annotateLogs("data", data.length === 1 ? data[0] : data),
		),
	Warn: (message, ...data) =>
		Effect.logWarning(message).pipe(
			Effect.annotateLogs("data", data.length === 1 ? data[0] : data),
		),
	Error: (message, ...data) =>
		Effect.logError(message).pipe(
			Effect.annotateLogs("data", data.length === 1 ? data[0] : data),
		),
	Fatal: (message, ...data) =>
		Effect.logFatal(message).pipe(
			Effect.annotateLogs("data", data.length === 1 ? data[0] : data),
		),
} satisfies Interface);
