/*---------------------------------------------------------------------------------------------
 * Cocoon Logging Shims (log-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides shim implementations for VS Code's primary logging service interfaces, * `ILogService` and `ILoggerService`. These shims enable consistent logging across the
 * Cocoon extension host environment, with all log messages currently being directed
 * to the console.
 *
 * This file contains:
 * - `ShimLogService`:
 *   - Implements `ILogService` (which extends `ILogger`). This is the most commonly
 *     injected logging service used by various ExtHost components and other shims within Cocoon.
 *   - Supports filtering messages based on a configurable log level (`VscodeLogLevel`).
 *   - Formats log messages with timestamps (via `console` methods), level indicators, *     and an optional instance name for contextual logging.
 *   - Writes formatted messages to the host's console (e.g., `console.trace`, `console.info`, *     `console.error`).
 *   - Handles `Error` objects passed to its logging methods by including their message
 *     and stack trace in the output.
 *   - Manages its own log level and emits an `onDidChangeLogLevel` event when the
 *     level is changed via `setLevel()`.
 *   - Can create child `ShimLogService` instances via `createLogger()`.
 *
 * - `ShimLoggerService`:
 *   - Implements `ILoggerService`. In a full VS Code environment, the `ExtHostLogService`
 *     (which often consumes `ILoggerService`) is responsible for creating and managing
 *     more specialized loggers, frequently associated with specific resources (like
 *     output file URIs) or advanced capabilities (e.g., spdlog-based file logging).
 *   - This shim's `createLogger(resource, options?)` method returns instances of
 *     `ShimLogService`, effectively providing named, console-based loggers that can
 *     be associated with a resource URI.
 *   - It manages a default log level for newly created loggers and can set/get log
 *     levels for loggers associated with specific resources.
 *   - Emits an `onDidChangeLogLevel` event when log levels are changed via its `setLogLevel()` method.
 *
 * Key Interactions:
 * - `ShimLogService` is typically instantiated directly in `Cocoon/index.ts` and registered
 *   as the `ILogService` implementation for Dependency Injection (DI).
 * - `ShimLoggerService` can be registered as the `ILoggerService` implementation if more
 *   fine-grained logger management per resource is needed by VS Code platform code
 *   running within Cocoon.
 * - Both shims use `LogLevel` enum and `parseLogLevel` utility from
 *   `vs/platform/log/common/log`, and eventing types from `vs/base/common/event`.
 *
 *--------------------------------------------------------------------------------------------*/

// For path.sep in deriving logger names from resource URIs
import * as path from "node:path";
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import { dispose, type IDisposable } from "vs/base/common/lifecycle";
// For ILoggerService createLogger resource URI type (vs/base/common/uri.URI)
import { URI } from "vs/base/common/uri";
// Import VS Code's log level definitions and service interfaces for type compatibility
import {
	// Helper utility to parse string log levels to the enum
	parseLogLevel,
	// The LogLevel enum (Trace, Debug, Info, Warning, Error, Critical, Off)
	LogLevel as VscodeLogLevel,
	// Base logger interface
	type ILogger as VscodeILogger,
	// Service interface for managing multiple loggers
	type ILoggerService as VscodeILoggerService,
	// Commonly used service interface, extends ILogger
	type ILogService as VscodeILogService,
} from "vs/platform/log/common/log";

/**
 * A shim implementation of `ILogService` (and by extension `ILogger`) that directs
 * all log output to the console (e.g., `process.stdout`, `process.stderr` via
 * `console.*` methods). It supports named instances and log level filtering.
 */
export class ShimLogService implements VscodeILogService {
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	private currentLogLevel: VscodeLogLevel;

	private readonly _onDidChangeLogLevel: VscodeEmitter<VscodeLogLevel>;

	public readonly onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;

	// Optional name for this logger instance, used as a prefix.
	private readonly loggerInstanceName?: string;

	/**
	 * Creates an instance of ShimLogService.
	 * @param initialLogLevel The initial log level for this logger. Defaults to `VscodeLogLevel.Info`.
	 * @param name An optional name for this logger instance, which will be prepended to log messages
	 *             for easier identification (e.g., "[MyShimName]").
	 */
	constructor(
		initialLogLevel: VscodeLogLevel = VscodeLogLevel.Info,

		name?: string,
	) {
		this.currentLogLevel = initialLogLevel;

		this.loggerInstanceName = name;

		this._onDidChangeLogLevel = new VscodeEmitter<VscodeLogLevel>();

		this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;

		// Initial log message to confirm logger creation and its configured level.
		// Logged at 'trace' level to avoid noise if the initial level is higher.
		const namePrefix = this.loggerInstanceName
			? `[${this.loggerInstanceName}] `
			: "";

		// Note: Calling this.trace() here relies on the constructor having set currentLogLevel.
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			console.trace(
				this._formatMessage(
					"Trace",

					`${namePrefix}Cocoon LogService Instance Initialized. Effective LogLevel: ${VscodeLogLevel[this.currentLogLevel]}`,
				),
			);
		}
	}

	/**
	 * Formats a log message with the log level, optional instance name prefix, and any additional arguments.
	 * @param levelLabel The string label for the log level (e.g., "Trace", "Info", "Error").
	 * @param message The main log message string or an `Error` object.
	 * @param args Additional arguments to be logged after the main message.
	 * @returns A formatted log string suitable for console output.
	 */
	private _formatMessage(
		levelLabel: string,

		message: string | Error,

		...args: any[]
	): string {
		const namePrefix = this.loggerInstanceName
			? `[${this.loggerInstanceName}]`
			: "";

		// Consistent uppercase level
		const levelPrefix = `[${levelLabel.toUpperCase()}]`;

		// e.g., "[INFO][MyShimName]" or "[ERROR]"
		const fullPrefix = `${levelPrefix}${namePrefix}`;

		let mainLogMessage: string;

		let stackTraceInfo = "";

		if (message instanceof Error) {
			mainLogMessage = message.message;

			// Include stack trace for Error objects for better debugging.
			stackTraceInfo = message.stack
				? `\nStack Trace:\n${message.stack}`
				: "";
		} else {
			mainLogMessage = message;
		}

		// Format additional arguments. Objects are JSON.stringified for readability.
		const argsString =
			args.length > 0
				? ` ${args.map((arg) => (typeof arg === "object" && arg !== null ? JSON.stringify(arg, null, 2) : String(arg))).join(" ")}`
				: "";

		return `${fullPrefix} ${mainLogMessage}${argsString}${stackTraceInfo}`;
	}

	// --- VscodeILogger methods ---
	/**
	 * {@inheritDoc VscodeILogger.enabled}
	 *
	 * Checks if the logger is generally enabled. A logger is considered enabled if its
	 * current log level is not `VscodeLogLevel.Off`. Individual logging methods
	 * (e.g., `trace`, `debug`) perform more specific checks against their target level.
	 */
	public get enabled(): boolean {
		return this.currentLogLevel !== VscodeLogLevel.Off;
	}

	/** {@inheritDoc VscodeILogger.trace} */
	public trace(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			// `console.trace` typically includes a stack trace, useful for detailed debugging.
			console.trace(this._formatMessage("Trace", message, ...args));
		}
	}

	/** {@inheritDoc VscodeILogger.debug} */
	public debug(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Debug) {
			console.debug(this._formatMessage("Debug", message, ...args));
		}
	}

	/** {@inheritDoc VscodeILogger.info} */
	public info(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Info) {
			console.info(this._formatMessage("Info", message, ...args));
		}
	}

	/** {@inheritDoc VscodeILogger.warn} */
	public warn(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Warning) {
			console.warn(this._formatMessage("Warn", message, ...args));
		}
	}

	/** {@inheritDoc VscodeILogger.error} */
	public error(message: string | Error, ...args: any[]): void {
		// `Error` objects are passed directly to `_formatMessage` which handles their stack.
		if (this.currentLogLevel <= VscodeLogLevel.Error) {
			console.error(this._formatMessage("Error", message, ...args));
		}
	}

	/**
	 * {@inheritDoc VscodeILogService.critical}
	 *
	 * Logs a critical message. In this console-based shim, critical messages are
	 * treated similarly to error messages and output via `console.error`.
	 */
	public critical(message: string | Error, ...args: any[]): void {
		// VscodeILogService interface includes 'critical'.
		// It typically implies a severity equal to or higher than Error.
		if (this.currentLogLevel <= VscodeLogLevel.Critical) {
			console.error(this._formatMessage("Critical", message, ...args));
		}
	}

	/**
	 * {@inheritDoc VscodeILogger.flush}
	 *
	 * Flushes any buffered log messages. This is a No-Operation (NOP) for this
	 * console logger, as `console.*` methods typically write immediately.
	 */
	public flush(): void {
		// console.debug("[Cocoon LogService Shim] Flush method called (No-op for console-based logging).");
	}

	// --- VscodeILogService specific methods ---
	/** {@inheritDoc VscodeILogService.dispose} */
	public dispose(): void {
		// const namePrefix = this.loggerInstanceName ? `[${this.loggerInstanceName}] ` : "";

		// Can be verbose
		// this.trace(`${namePrefix}Cocoon LogService Instance Disposed.`);

		this._onDidChangeLogLevel.dispose();
	}

	/** {@inheritDoc VscodeILogService.getLevel} */
	public getLevel(): VscodeLogLevel {
		return this.currentLogLevel;
	}

	/** {@inheritDoc VscodeILogService.setLevel} */
	public setLevel(level: VscodeLogLevel | string): void {
		const newLevel =
			typeof level === "string" ? parseLogLevel(level) : level;

		if (
			newLevel === undefined ||
			!Object.values(VscodeLogLevel).includes(newLevel as VscodeLogLevel)
		) {
			const namePrefix = this.loggerInstanceName
				? `[${this.loggerInstanceName}] `
				: "";

			// Log to console directly if setLevel is called with an invalid value, as this logger might be misconfigured.
			console.warn(
				`${namePrefix}[Cocoon LogService Shim] Invalid log level string or value provided to setLevel: '${level}'. Log level not changed from ${VscodeLogLevel[this.currentLogLevel]}.`,
			);

			return;
		}

		if (this.currentLogLevel !== newLevel) {
			const oldLevel = this.currentLogLevel;

			this.currentLogLevel = newLevel;

			this._onDidChangeLogLevel.fire(this.currentLogLevel);

			// Log the level change itself. Use the new Info level if possible,

			// otherwise, if the new level is too restrictive (e.g., Error), log with the old Info level's permission.
			const levelChangeMessage = `Log level changed from ${VscodeLogLevel[oldLevel]} to ${VscodeLogLevel[newLevel]}.`;

			if (this.currentLogLevel <= VscodeLogLevel.Info) {
				// `this.info` will respect the new level.
				this.info(levelChangeMessage);
			} else if (oldLevel <= VscodeLogLevel.Info) {
				// If new level is > Info (e.g., Warn, Error), but old level was Info or lower,

				// we still want to log this important change. Use console.info directly for this one message.
				console.info(this._formatMessage("Info", levelChangeMessage));
			}
		}
	}

	/**
	 * {@inheritDoc VscodeILogService.createLogger}
	 *
	 * Creates a new logger instance, typically for a specific resource or component,
	 *
	 *
	 * allowing for named and independently-leveled logging.
	 * In this shim, it creates and returns another `ShimLogService` instance.
	 * @param resource The `URI` identifying the resource or context this logger is for.
	 *                 The resource's basename is often used as part of the child logger's name.
	 * @param options Optional configuration for the new logger, such as `name` and `logLevel`.
	 * @returns A new `VscodeILogger` instance (specifically, a `ShimLogService`).
	 */
	public createLogger(
		resource: URI,

		options?: { name?: string; logLevel?: VscodeLogLevel },
	): VscodeILogger {
		// Derive a default name from the resource URI if not provided in options.
		// E.g., for "file:///path/to/myModule.ts", name might be "myModule.ts".
		const derivedName = resource.fsPath.substring(
			resource.fsPath.lastIndexOf(path.sep) + 1,
		);

		const loggerName =
			options?.name || derivedName || `child-logger-${resource.scheme}`;

		// Child logger inherits parent's level by default, unless explicitly overridden in options.
		const logLevel = options?.logLevel ?? this.currentLogLevel;

		this.trace(
			`Creating child logger: Name='${loggerName}', Resource='${resource.toString()}', InitialLevel=${VscodeLogLevel[logLevel]}`,
		);

		return new ShimLogService(logLevel, loggerName);
	}

	/**
	 * {@inheritDoc VscodeILogService.getLogger}
	 *
	 * Gets an existing logger for a resource or creates one if it doesn't exist.
	 * **Note:** This `ShimLogService` (implementing `ILogService`) does not maintain an
	 * internal cache of loggers by resource; that is typically the responsibility of an
	 * `ILoggerService` implementation. Therefore, this method will behave like `createLogger`,
	 *
	 *
	 * creating a new instance each time, and will issue a warning about this behavior.
	 *
	 * @param resource The `URI` of the resource for which to get/create a logger.
	 * @returns A `VscodeILogger` instance (always a new `ShimLogService` in this implementation).
	 */
	public getLogger(resource: URI): VscodeILogger | undefined {
		this.warnOnce(
			`ILogService.getLogger(resource) called. This ShimLogService does not cache loggers by resource; ` +
				`it will create a new logger instance for resource: ${resource.toString()}. ` +
				`For cached, resource-specific loggers, use an ILoggerService implementation.`,
		);

		return this.createLogger(resource);
	}

	// Cache for messages logged by warnOnce.
	private _warnOnceMessages = new Set<string>();

	/** Helper to log a warning message only once per unique message string. */
	private warnOnce(message: string): void {
		if (!this._warnOnceMessages.has(message)) {
			this._warnOnceMessages.add(message);

			// Use this instance's warn method.
			this.warn(message);
		}
	}

	/**
	 * {@inheritDoc VscodeILogService.getDefaultLogger}
	 *
	 * Gets the default logger instance. For `ShimLogService`, this is the instance itself.
	 */
	public getDefaultLogger(): VscodeILogger {
		return this;
	}
}

/**
 * A shim implementation of `ILoggerService`. This service acts as a factory for creating
 * named `ILogger` instances (specifically, `ShimLogService` instances in this implementation), * often associated with specific resources (identified by URIs). It allows for managing
 * log levels on a per-resource basis or setting a default log level for new loggers.
 */
export class ShimLoggerService implements VscodeILoggerService {
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	// Default level for new loggers.
	private defaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info;

	// Cache for logger instances, keyed by the string representation of their resource URI.
	private readonly loggersByResource = new Map<string, ShimLogService>();

	// Event emitter for log level changes. Payload: [resource URI (or undefined for default), newLevel].
	private readonly _onDidChangeLogLevel = new VscodeEmitter<
		[URI | undefined, VscodeLogLevel]
	>();

	public readonly onDidChangeLogLevel: VscodeEvent<
		[URI | undefined, VscodeLogLevel]
	> = this._onDidChangeLogLevel.event;

	constructor(initialDefaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info) {
		this.defaultLogLevel = initialDefaultLogLevel;

		console.log(
			// Use console directly as this service might be the source of loggers.
			`[Cocoon LoggerService Shim] Initialized. Default LogLevel for new loggers will be: ${VscodeLogLevel[this.defaultLogLevel]}.`,
		);

		// TODO: Consider taking IEnvironmentService or similar in constructor to get default log path
		// or initial log level from environment configuration if Cocoon supports such.
	}

	/**
	 * {@inheritDoc VscodeILoggerService.createLogger}
	 *
	 * Creates or retrieves an existing logger for a given resource URI.
	 * If a logger for the specified resource already exists and `options.logLevel` is not
	 * provided (or matches the existing logger's level), the cached logger is returned.
	 * Otherwise, a new `ShimLogService` instance is created (or an existing one is updated
	 * if `options.logLevel` is different) and cached.
	 *
	 * @param resource The `URI` identifying the resource or context this logger is for.
	 * @param options Optional configuration for the logger, including `name` and `logLevel`.
	 *                File-based logging options are not supported by this console shim.
	 * @returns An `ILogger` instance (specifically, a `ShimLogService`).
	 */
	public createLogger(
		resource: URI,

		options?: {
			name?: string;

			logLevel?: VscodeLogLevel /* ; File?: FileLoggerOptions; (File options not used by console logger) */;
		},
	): VscodeILogger {
		const resourceKey = resource.toString();

		const existingLogger = this.loggersByResource.get(resourceKey);

		// If a specific log level is requested in options and it differs, or if logger doesn't exist, create/recreate.
		if (
			!existingLogger ||
			(options?.logLevel !== undefined &&
				options.logLevel !== existingLogger.getLevel())
		) {
			// Derive a default name from the resource URI's basename if a name is not provided in options.
			const derivedName = resource.fsPath.substring(
				resource.fsPath.lastIndexOf(path.sep) + 1,
			);

			const name =
				options?.name || derivedName || `logger-for-${resource.scheme}`;

			// Determine log level: use option's, else existing logger's (if any, to preserve previous setLevel), else service default.
			const logLevel =
				options?.logLevel ??
				existingLogger?.getLevel() ??
				this.defaultLogLevel;

			// Can be verbose
			// console.debug(
			// 	`[Cocoon LoggerService Shim] Creating/Recreating logger for resource '${resourceKey}'. Name='${name}', Level=${VscodeLogLevel[logLevel]}.`
			// );

			const newLogger = new ShimLogService(logLevel, name);

			// TODO (Advanced): If ILoggerService.onDidChangeLogLevel should also fire when an *individual*
			// logger's setLevel is called directly (not just via ILoggerService.setLogLevel),

			// then we would need to subscribe to `newLogger.onDidChangeLogLevel` here and propagate it.
			// For now, this service's onDidChangeLogLevel only fires when setLogLevel on *this service* is called.
			this.loggersByResource.set(resourceKey, newLogger);

			return newLogger;
		}

		return existingLogger;
	}

	/**
	 * {@inheritDoc VscodeILoggerService.getLogger}
	 *
	 * Retrieves an existing logger for the given resource URI, if one was previously created
	 * and cached by this service.
	 * @param resource The `URI` of the resource.
	 * @returns The cached `ILogger` instance (`ShimLogService`), or `undefined` if no logger
	 *          has been created for this specific resource URI via this service.
	 */
	public getLogger(resource: URI): VscodeILogger | undefined {
		return this.loggersByResource.get(resource.toString());
	}

	/** {@inheritDoc VscodeILoggerService.dispose} */
	public dispose(): void {
		console.log(
			"[Cocoon LoggerService Shim] Dispose called. Disposing all cached loggers.",
		);

		// Dispose all ILogService instances created by this service.
		dispose([...this.loggersByResource.values()]);

		this.loggersByResource.clear();

		this._onDidChangeLogLevel.dispose();
	}

	/**
	 * {@inheritDoc VscodeILoggerService.getLogLevel}
	 *
	 * Gets the log level for a specific resource, or the default log level if no resource is specified.
	 * @param resource Optional URI of the resource to get the log level for.
	 * @returns The `VscodeLogLevel` for the resource's logger, or the default log level,
	 *
	 *
	 *          or `undefined` if no specific logger exists for the resource and no default is set (though default is always set here).
	 */
	public getLogLevel(resource?: URI): VscodeLogLevel | undefined {
		if (resource) {
			const logger = this.loggersByResource.get(resource.toString());

			if (logger) return logger.getLevel();

			// If no specific logger for this resource, it means it would use the default level if created.
			// The interface contract allows returning undefined if level for a resource cannot be determined.
			return undefined;
		}

		// Return the service's default log level.
		return this.defaultLogLevel;
	}

	/** {@inheritDoc VscodeILoggerService.setLogLevel} (Overload 1: Set default log level) */
	public setLogLevel(level: VscodeLogLevel): void;

	/** {@inheritDoc VscodeILoggerService.setLogLevel} (Overload 2: Set log level for a specific resource) */
	public setLogLevel(resource: URI, level: VscodeLogLevel): void;

	/** Combined implementation for setLogLevel overloads. */
	public setLogLevel(
		resourceOrLevel: URI | VscodeLogLevel,

		levelValue?: VscodeLogLevel,
	): void {
		let targetResource: URI | undefined = undefined;

		let newLevelToSet: VscodeLogLevel;

		if (resourceOrLevel instanceof URI) {
			// Overload 2: setLogLevel(resource: URI, level: VscodeLogLevel)
			targetResource = resourceOrLevel;

			if (levelValue === undefined) {
				// Should not happen due to TypeScript overload resolution, but guard defensively.
				console.warn(
					"[Cocoon LoggerService Shim] setLogLevel(resource, level) called with URI but 'levelValue' is undefined. Cannot set level.",
				);

				return;
			}

			newLevelToSet = levelValue;
		} else {
			// Overload 1: setLogLevel(level: VscodeLogLevel) - setting default log level.
			newLevelToSet = resourceOrLevel;
		}

		if (
			newLevelToSet === undefined ||
			!Object.values(VscodeLogLevel).includes(
				newLevelToSet as VscodeLogLevel,
			)
		) {
			console.warn(
				`[Cocoon LoggerService Shim] Invalid log level value provided to setLogLevel: '${newLevelToSet}'. Log level not changed.`,
			);

			return;
		}

		if (targetResource) {
			// Set log level for a specific resource's logger.
			let logger = this.loggersByResource.get(targetResource.toString());

			if (!logger) {
				// If a logger for this resource doesn't exist, create it with the specified level.
				// This ensures that subsequent calls to getLogger/createLogger for this resource
				// will use this explicitly set level, rather than falling back to the service default.
				// Can be verbose
				// console.debug(
				//     `[Cocoon LoggerService Shim] setLogLevel: Logger for resource '${targetResource.toString()}' not found. ` +
				//     `Creating a new one with level ${VscodeLogLevel[newLevelToSet]}.`
				// );

				logger = this.createLogger(targetResource, {
					logLevel: newLevelToSet,
				}) as ShimLogService;
			} else {
				// Set level on the existing cached logger.
				logger.setLevel(newLevelToSet);
			}

			// Fire event for resource-specific level change.
			this._onDidChangeLogLevel.fire([targetResource, newLevelToSet]);
		} else {
			// Set the default log level for the LoggerService itself.
			// This affects new loggers created without an explicit level option.
			const oldDefaultLevel = this.defaultLogLevel;

			if (oldDefaultLevel !== newLevelToSet) {
				this.defaultLogLevel = newLevelToSet;

				console.log(
					// Use console.log for service-level changes
					`[Cocoon LoggerService Shim] Default log level for new loggers changed from ${VscodeLogLevel[oldDefaultLevel]} to ${VscodeLogLevel[this.defaultLogLevel]}.`,
				);

				// Note: This does NOT automatically update the level of all existing loggers that might have been
				// created with the old default. They maintain their level unless explicitly changed.
				// This event signals that the *service's default* has changed.
				this._onDidChangeLogLevel.fire([
					undefined,

					this.defaultLogLevel,
				]);
			}
		}
	}

	/**
	 * {@inheritDoc VscodeILoggerService.getDefaultLogLevel}
	 *
	 * Gets the default log level that will be applied to new loggers created by this
	 * service if no specific level is provided in their creation options.
	 */
	public getDefaultLogLevel(): VscodeLogLevel {
		return this.defaultLogLevel;
	}
}
