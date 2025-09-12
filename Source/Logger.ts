/**
 * @module Logger
 * @description Defines the service for internal application logging. This service
 * provides a simple, structured facade over the main Effect logger, allowing
 * other services to log messages at various severity levels without directly
 * depending on the `Effect` module's logging implementation.
 */

import { Effect } from "effect";

/**
 * @interface Logger
 * @description The contract for the internal logging service.
 */
export interface Logger {
	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void, never, never>;
	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void, never, never>;
	readonly Info: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void, never, never>;
	readonly Warn: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void, never, never>;
	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void, never, never>;
	readonly Fatal: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void, never, never>;
}

/**
 * @class Logger
 * @description The `Effect.Service` for the Logger service. Its methods map
 * directly to the corresponding `Effect.log*` functions, providing a consistent
 * logging API for use throughout the application. It automatically annotates
 * log messages with any additional data provided.
 */
export class LoggerService extends Effect.Service<LoggerService>()(
	"Service/Logger",
	{
		sync: () => ({
			Trace: (Message: string, ...Data: unknown[]) =>
				Effect.logTrace(Message).pipe(
					Effect.annotateLogs({
						data: Data.length === 1 ? Data[0] : Data,
					}),
				),
			Debug: (Message: string, ...Data: unknown[]) =>
				Effect.logDebug(Message).pipe(
					Effect.annotateLogs({
						data: Data.length === 1 ? Data[0] : Data,
					}),
				),
			Info: (Message: string, ...Data: unknown[]) =>
				Effect.logInfo(Message).pipe(
					Effect.annotateLogs({
						data: Data.length === 1 ? Data[0] : Data,
					}),
				),
			Warn: (Message: string, ...Data: unknown[]) =>
				Effect.logWarning(Message).pipe(
					Effect.annotateLogs({
						data: Data.length === 1 ? Data[0] : Data,
					}),
				),
			Error: (Message: string, ...Data: unknown[]) =>
				Effect.logError(Message).pipe(
					Effect.annotateLogs({
						data: Data.length === 1 ? Data[0] : Data,
					}),
				),
			Fatal: (Message: string, ...Data: unknown[]) =>
				Effect.logFatal(Message).pipe(
					Effect.annotateLogs({
						data: Data.length === 1 ? Data[0] : Data,
					}),
				),
		}),
	},
) {}
