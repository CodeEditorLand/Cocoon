/*
 * File: Cocoon/Source/Service/Log/Service.ts
 * Role: Defines the Logger service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Provide a simple, internal logging facade that other services can use.
 *   - Route internal logs to the main Effect logger.
 */

import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()("Service/Logger", {
	// A `sync` constructor is sufficient as it simply returns an object of functions.
	// The methods themselves return Effects, which is where the asynchronous
	// logging work happens.
	sync: () => ({
		Trace: (Message, ...Data) =>
			Effect.logTrace(Message).pipe(
				Effect.annotateLogs({
					data: Data.length === 1 ? Data[0] : Data,
				}),
			),
		Debug: (Message, ...Data) =>
			Effect.logDebug(Message).pipe(
				Effect.annotateLogs({
					data: Data.length === 1 ? Data[0] : Data,
				}),
			),
		Info: (Message, ...Data) =>
			Effect.logInfo(Message).pipe(
				Effect.annotateLogs({
					data: Data.length === 1 ? Data[0] : Data,
				}),
			),
		Warn: (Message, ...Data) =>
			Effect.logWarning(Message).pipe(
				Effect.annotateLogs({
					data: Data.length === 1 ? Data[0] : Data,
				}),
			),
		Error: (Message, ...Data) =>
			Effect.logError(Message).pipe(
				Effect.annotateLogs({
					data: Data.length === 1 ? Data[0] : Data,
				}),
			),
		Fatal: (Message, ...Data) =>
			Effect.logFatal(Message).pipe(
				Effect.annotateLogs({
					data: Data.length === 1 ? Data[0] : Data,
				}),
			),
	}),
}) {}
