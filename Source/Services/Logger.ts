/**
 * @module Logger
 * @description
 * Implements the logging service for internal application logging.
 *
 * Architecture:
 * - Lifted from: src/vs/base/common/log.js (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Logger.ts (borrowed working patterns)
 * - Mountain Integration: Forwards logs to Mountain for centralized logging
 *
 * Patterns borrowed from this file:
 * - Effect log function wrapping
 * - Extension ID context tracking
 * - Log level filtering
 *
 * New implementation includes:
 * - Enhanced context management with Ref
 * - Mountain log forwarding hooks
 * - Comprehensive TODOs for advanced logging features
 * - Structured log formatting
 *
 * Dependencies:
 * - IMountainClientService: For forwarding logs to Mountain (optional)
 *
 * TODOs:
 * FUTURE: Log persistence - use winston or pino for file logging
 * FUTURE: Log rotation - implement size-based rotation (10MB files, keep 5)
 * FUTURE: Log filtering - add Ref-based level filtering by extension ID
 * PERFORMANCE: Volume tracking - add metrics for log count by level
 * ARCHITECTURE-PATTERN: See src/vs/platform/log/common/logService.ts
 * VSCODE-LIFT: See src/vs/base/common/log.js for log formatting
 */

/**
 * @interface Logger
 * @description
 * The contract for the internal logging service.
 *
 * Specification: src/vs/base/common/log.js (ILogger)
 */
export interface Logger {
	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Info: (Message: string, ...Data: unknown[]) => Promise<void>;

	readonly Warn: (Message: string, ...Data: unknown[]) => Promise<void>;

	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Fatal: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly SetExtensionId: (ExtensionId: string) => Promise<void>;

	readonly GetExtensionId: () => Promise<string>;
}

// Runtime Tag for the Logger interface - needed because esbuild erases
// type-only exports but consumers import { Logger } at runtime.
export const Logger: unique symbol = Symbol.for("Service/Logger";

/**
 * @class LoggerService
 * @description
 * The Effect-TS service for the Logger service. Provides a simple, structured facade
 * over the main Effect logger, allowing other services to log messages at various
 * severity levels without directly depending on the `Effect` module's logging implementation.
 *
 * Architecture Pattern: src/vs/base/common/log.js (structured logging)
 * Implementation: Effect log functions with extension context annotation
 *
 * TODOs:
 * FUTURE: Log persistence - write to rotating log files
 * FUTURE: Log rotation - rotate by size (10MB) and age (daily)
 * FUTURE: Log filtering - filter by extension ID and log level
 * PERFORMANCE: Telemetry - track log count per level for monitoring
 */
export class LoggerService extends /* Effect.Service */(
	"Service/Logger",

	{
		effect: async function() {
			// Current extension ID context
			const ExtensionIdRef = { current: undefined, };

			// Log level configuration
			const LogLevelRef = { current: "info" };

			/**
			 * Format log message with context
			 *
			 * ARCHITECTURE-PATTERN: src/vs/base/common/log.js (log formatting)
			 */
			const FormatMessage = (
				Message: string,

				Level: string,

				ExtensionId?: string,
			) => {
				const Timestamp = new Date().toISOString(;

				const Prefix = `[${Level.toUpperCase()}${ExtensionId ? `:${ExtensionId}` : ""}]`;

				return `${Timestamp} ${Prefix} ${Message}`;
			};

			/**
			 * Forward a formatted log line to Mountain. Cocoon's stdout and
			 * stderr are captured by Mountain into its dev log as
			 * `[Cocoon stdout] ...`, so a direct stream write is the
			 * centralized-logging channel; it also survives esbuild's
			 * `drop: ["console"]` in production bundles, unlike the Effect
			 * console logger.
			 */
			const ForwardToMountain = (Level: string, Line: string): void => {
				const Stream =
					Level === "error" || Level === "fatal"
						? process.stderr
						: process.stdout;

				Stream.write(`${Line}\n`;
			};

			/**
			 * Trace level logging
			 */
			const Trace = (
				Message: string,
				...Data: unknown[]
			): Promise<void> =>
				async function() {
					const LogLevel = LogLevelRef.current;

					const ExtensionId = ExtensionIdRef.current;

					if (LogLevel === "trace") {
						ForwardToMountain(
							"trace",

							FormatMessage(Message, "trace", ExtensionId),
						;

						return yield* console.trace(Message).pipe(
							Effect.annotateLogs({
								extensionId: ExtensionId,
								data: Data.length === 1 ? Data[0] : Data,
							}),
						;
					}
				};

			/**
			 * Debug level logging
			 */
			const Debug = (
				Message: string,
				...Data: unknown[]
			): Promise<void> =>
				async function() {
					const LogLevel = LogLevelRef.current;

					const ExtensionId = ExtensionIdRef.current;

					if (LogLevel === "trace" || LogLevel === "debug") {
						ForwardToMountain(
							"debug",

							FormatMessage(Message, "debug", ExtensionId),
						;

						return yield* console.debug(Message).pipe(
							Effect.annotateLogs({
								extensionId: ExtensionId,
								data: Data.length === 1 ? Data[0] : Data,
							}),
						;
					}
				};

			/**
			 * Info level logging
			 */
			const Info = (
				Message: string,
				...Data: unknown[]
			): Promise<void> =>
				async function() {
					const ExtensionId = ExtensionIdRef.current;

					ForwardToMountain(
						"info",

						FormatMessage(Message, "info", ExtensionId),
					;

					return yield* console.info(Message).pipe(
						Effect.annotateLogs({
							extensionId: ExtensionId,
							data: Data.length === 1 ? Data[0] : Data,
						}),
					;
				};

			/**
			 * Warning level logging
			 */
			const Warn = (
				Message: string,
				...Data: unknown[]
			): Promise<void> =>
				async function() {
					const ExtensionId = ExtensionIdRef.current;

					ForwardToMountain(
						"warn",

						FormatMessage(Message, "warn", ExtensionId),
					;

					return yield* console.warn(Message).pipe(
						Effect.annotateLogs({
							extensionId: ExtensionId,
							data: Data.length === 1 ? Data[0] : Data,
						}),
					;
				};

			/**
			 * Error level logging
			 */
			const Error = (
				Message: string,
				...Data: unknown[]
			): Promise<void> =>
				async function() {
					const ExtensionId = ExtensionIdRef.current;

					ForwardToMountain(
						"error",

						FormatMessage(Message, "error", ExtensionId),
					;

					return yield* console.error(Message).pipe(
						Effect.annotateLogs({
							extensionId: ExtensionId,
							data: Data.length === 1 ? Data[0] : Data,
						}),
					;
				};

			/**
			 * Fatal level logging
			 */
			const Fatal = (
				Message: string,
				...Data: unknown[]
			): Promise<void> =>
				async function() {
					const ExtensionId = ExtensionIdRef.current;

					ForwardToMountain(
						"fatal",

						FormatMessage(Message, "fatal", ExtensionId),
					;

					return yield* console.error(Message).pipe(
						Effect.annotateLogs({
							extensionId: ExtensionId,
							data: Data.length === 1 ? Data[0] : Data,
						}),
					;
				};

			/**
			 * Set extension ID context for logging
			 */
			const SetExtensionId = (ExtensionId: string): Promise<void> =>
				async function() {
					ExtensionIdRef.current = ExtensionId;
				};

			/**
			 * Get current extension ID context
			 */
			const GetExtensionId = (): Promise<string> =>
				async function() {
					const ExtensionId = ExtensionIdRef.current;

					return ExtensionId ?? "cocoon-core";
				};

			// Return the service implementation
			const ServiceImplementation: Logger = {
				Trace,
				Debug,
				Info,
				Warn,
				Error,
				Fatal,
				SetExtensionId,
				GetExtensionId,
			};

			return ServiceImplementation;
		}),
	},
) {}
