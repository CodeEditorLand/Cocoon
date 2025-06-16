/*
 * File: Cocoon/Source/Service/Log/Definition.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:56 UTC
 * Dependency: ./Service.js, effect
 */

/**
 * @module Definition (Log)
 * @description The live implementation of the Log service.
 */

import { Effect } from "effect";

import type Service from "./Service.js";

export default Effect.succeed({
	Trace: (Message, ...Data) =>
		Effect.logTrace(Message).pipe(
			Effect.annotateLogs({ data: Data.length === 1 ? Data[0] : Data }),
		),
	Debug: (Message, ...Data) =>
		Effect.logDebug(Message).pipe(
			Effect.annotateLogs({ data: Data.length === 1 ? Data[0] : Data }),
		),
	Info: (Message, ...Data) =>
		Effect.logInfo(Message).pipe(
			Effect.annotateLogs({ data: Data.length === 1 ? Data[0] : Data }),
		),
	Warn: (Message, ...Data) =>
		Effect.logWarning(Message).pipe(
			Effect.annotateLogs({ data: Data.length === 1 ? Data[0] : Data }),
		),
	Error: (Message, ...Data) =>
		Effect.logError(Message).pipe(
			Effect.annotateLogs({ data: Data.length === 1 ? Data[0] : Data }),
		),
	Fatal: (Message, ...Data) =>
		Effect.logFatal(Message).pipe(
			Effect.annotateLogs({ data: Data.length === 1 ? Data[0] : Data }),
		),
} satisfies Service["Type"]);
