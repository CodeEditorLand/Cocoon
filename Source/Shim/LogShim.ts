/*---------------------------------------------------------------------------------------------
 * Cocoon Logging Shims 
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
 *   - Implements `ILoggerService`. In a full VS Code environment, this service would
 *     manage more specialized loggers (e.g., file-based).
 *   - This shim's `createLogger(resourceOrId, options?)` method returns instances of
 *     `ShimLogService`, effectively providing named, console-based loggers that can
 *     be associated with a resource URI or an ID.
 *   - It manages a default log level for newly created loggers and can set/get log
 *     levels for loggers associated with specific resources.
 *   - Emits an `onDidChangeLogLevel` event when log levels are changed via its `setLogLevel()` method.
 *
 * Key Interactions:
 * - `ShimLogService` is typically instantiated directly in `Cocoon/index.ts` and registered
 *   as the `ILogService` implementation for Dependency Injection (DI).
 * - `ShimLoggerService` can be registered as the `ILoggerService` implementation.
 * - Both shims use `LogLevel` enum and `parseLogLevel` utility from
 *   `vs/platform/log/common/log`, and eventing types from `vs/base/common/event`.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import * as path from "node:path"; // For path.sep in deriving logger names
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	DisposableStore,
	dispose,
	type IDisposable,
} from "vs/base/common/lifecycle";
import { URI } from "vs/base/common/uri"; // For ILoggerService createLogger resource URI type

// Import VS Code's log level definitions and service interfaces
import {
	parseLogLevel, // Helper to parse string log levels
	LogLevel as VscodeLogLevel,
	type ILogger as VscodeILogger,
	type ILoggerOptions as VscodeILoggerOptions, // For ILoggerService.createLogger options
	type ILoggerResource as VscodeILoggerResource, // For ILoggerService logger registration
	type ILoggerService as VscodeILoggerService,
	type ILogService as VscodeILogService,
} from "vs/platform/log/common/log";

// A simple Map to act as a ResourceMap for URI keys.
// In a full VS Code environment, ResourceMap handles URI normalization.
class ResourceMap<T> extends Map<string, T> {
	get(resource: URI): T | undefined {
		return super.get(resource.toString());
	}
	set(resource: URI, value: T): this {
		super.set(resource.toString(), value);
		return this;
	}
	has(resource: URI): boolean {
		return super.has(resource.toString());
	}
	delete(resource: URI): boolean {
		return super.delete(resource.toString());
	}
}

/**
 * A shim implementation of `ILogService` and `ILogger` that directs all log output to the console.
 */
export class ShimLogService implements VscodeILogService {
	public readonly _serviceBrand: undefined; // Required by VS Code's service types
	private currentLogLevel: VscodeLogLevel;
	private readonly _onDidChangeLogLevel: VscodeEmitter<VscodeLogLevel>;
	public readonly onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;
	readonly loggerInstanceName?: string; // Optional name for this logger instance
	private readonly _warnOnceMessages = new Set<string>(); // For warnOnce helper

	/**
	 * Creates an instance of ShimLogService.
	 * @param initialLogLevel The initial log level for this logger. Defaults to `Info`.
	 * @param name An optional name for this logger instance, used as a prefix in log messages.
	 */
	constructor(
		initialLogLevel: VscodeLogLevel = VscodeLogLevel.Info,
		name?: string,
	) {
		this.currentLogLevel = initialLogLevel;
		this.loggerInstanceName = name;
		this._onDidChangeLogLevel = new VscodeEmitter<VscodeLogLevel>();
		this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;

		const namePrefix = this.loggerInstanceName
			? `[${this.loggerInstanceName}] `
			: "";
		// Log initialization message at trace level to avoid noise if initial level is higher.
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
	 * Formats a log message with level, optional name prefix, timestamp, and arguments.
	 */
	private _formatMessage(
		levelLabel: string,
		message: string | Error,
		...args: any[]
	): string {
		const namePrefix = this.loggerInstanceName
			? `[${this.loggerInstanceName}]`
			: "";
		const levelPrefix = `[${levelLabel.toUpperCase()}]`; // Ensure uppercase level
		const fullPrefix = `${levelPrefix}${namePrefix}`; // Timestamp handled by console methods

		let mainLogMessage: string;
		let stackTraceInfo = "";

		if (message instanceof Error) {
			mainLogMessage = message.message;
			stackTraceInfo = message.stack
				? `\nStack Trace (see below if console auto-formats):\n${message.stack}`
				: "";
		} else {
			mainLogMessage = message;
		}

		// JSON.stringify for objects, ensuring better readability than default [object Object]
		const argsString =
			args.length > 0
				? ` ${args.map((arg) => (typeof arg === "object" && arg !== null ? JSON.stringify(arg, null, 2) : String(arg))).join(" ")}`
				: "";

		// For console, just return the core message. Console methods will add timestamps.
		// If Error, console.error will handle stack trace better.
		if (
			message instanceof Error &&
			(levelLabel === "Error" || levelLabel === "Critical")
		) {
			return `${fullPrefix} ${mainLogMessage}${argsString}`; // Console.error will handle stack
		}
		return `${fullPrefix} ${mainLogMessage}${argsString}${stackTraceInfo}`;
	}

	// --- VscodeILogger methods ---
	public get enabled(): boolean {
		return this.currentLogLevel !== VscodeLogLevel.Off;
	}

	public trace(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			console.trace(this._formatMessage("Trace", message, ...args)); // console.trace for stack
		}
	}

	public debug(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Debug) {
			console.debug(this._formatMessage("Debug", message, ...args));
		}
	}

	public info(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Info) {
			console.info(this._formatMessage("Info", message, ...args));
		}
	}

	public warn(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Warning) {
			console.warn(this._formatMessage("Warn", message, ...args));
		}
	}

	public error(message: string | Error, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Error) {
			if (message instanceof Error) {
				// Let console.error handle the Error object directly for better stack trace formatting
				const prefix = this.loggerInstanceName
					? `[ERROR][${this.loggerInstanceName}] `
					: "[ERROR] ";
				console.error(`${prefix}${message.message}`, ...args, message);
			} else {
				console.error(this._formatMessage("Error", message, ...args));
			}
		}
	}

	public critical(message: string | Error, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Critical) {
			if (message instanceof Error) {
				const prefix = this.loggerInstanceName
					? `[CRITICAL][${this.loggerInstanceName}] `
					: "[CRITICAL] ";
				console.error(`${prefix}${message.message}`, ...args, message);
			} else {
				console.error(
					this._formatMessage("Critical", message, ...args),
				);
			}
		}
	}

	public flush(): void {
		/* NOP for console logger */
	}

	// --- VscodeILogService specific methods ---
	public dispose(): void {
		this._onDidChangeLogLevel.dispose();
	}

	public getLevel(): VscodeLogLevel {
		return this.currentLogLevel;
	}

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
			console.warn(
				`${namePrefix}[Cocoon LogService Shim] Invalid log level string or value: '${level}'. Level not changed from ${VscodeLogLevel[this.currentLogLevel]}.`,
			);
			return;
		}

		if (this.currentLogLevel !== newLevel) {
			const oldLevel = this.currentLogLevel;
			this.currentLogLevel = newLevel;
			this._onDidChangeLogLevel.fire(this.currentLogLevel);
			const levelChangeMessage = `Log level changed from ${VscodeLogLevel[oldLevel]} to ${VscodeLogLevel[newLevel]}.`;
			// Log the change at the new Info level (if enabled), or at the old Info level if new level is more restrictive.
			if (this.currentLogLevel <= VscodeLogLevel.Info) {
				this.info(levelChangeMessage);
			} else if (oldLevel <= VscodeLogLevel.Info) {
				// If new level is Warn/Error/Off, but old was Info or lower
				console.info(this._formatMessage("Info", levelChangeMessage)); // Log with console.info
			}
		}
	}

	public createLogger(
		resource: URI,
		options?: VscodeILoggerOptions,
	): VscodeILogger {
		// Derive a name for the child logger if not provided in options
		const derivedNameFromFsPath = resource.fsPath
			? resource.fsPath.substring(
					resource.fsPath.lastIndexOf(path.sep) + 1,
				)
			: "";
		const derivedNameFromPath = resource.path
			? resource.path.substring(resource.path.lastIndexOf("/") + 1)
			: "";
		const derivedName =
			derivedNameFromFsPath ||
			derivedNameFromPath ||
			`child-${resource.scheme || "unknown"}`;
		const loggerName =
			options?.name ||
			(this.loggerInstanceName
				? `${this.loggerInstanceName}.${derivedName}`
				: derivedName);

		// Determine log level for the child logger
		const logLevel =
			options?.logLevel === "always"
				? VscodeLogLevel.Trace
				: (options?.logLevel ?? this.currentLogLevel); // Inherit parent's level by default if not specified

		this.trace(
			`Creating child logger: Name='${loggerName}', Resource='${resource.toString()}', InitialLevel=${VscodeLogLevel[logLevel]}`,
		);
		return new ShimLogService(logLevel, loggerName);
	}

	public getLogger(resource: URI): VscodeILogger | undefined {
		// ILogService.getLogger is often for retrieving managed loggers.
		// This simple ShimLogService doesn't cache loggers by resource itself;
		// that's typically a responsibility of ILoggerService.
		// For ILogService, creating a new instance or returning `this` (if appropriate for "default") might be options.
		this.warnOnce(
			`ILogService.getLogger(resource) called. This ShimLogService implementation does not cache loggers by resource; ` +
				`it will create a new logger instance for resource: ${resource.toString()}. ` +
				`For cached, resource-specific loggers, ensure an ILoggerService implementation is used and queried.`,
		);
		return this.createLogger(resource); // Behave like createLogger for now
	}

	private warnOnce(message: string): void {
		if (!this._warnOnceMessages.has(message)) {
			this._warnOnceMessages.add(message);
			this.warn(message); // Use the instance's warn method
		}
	}

	public getDefaultLogger(): VscodeILogger {
		// The default logger provided by ILogService is often the service instance itself.
		return this;
	}
}

/**
 * A shim implementation of `ILoggerService`.
 * This service manages multiple loggers, often associated with resources (e.g., files).
 */
export class ShimLoggerService implements VscodeILoggerService {
	public readonly _serviceBrand: undefined; // Required by VS Code's service types
	private defaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info; // Default level for new loggers
	private readonly loggersByResource = new ResourceMap<ShimLogService>(); // Cache loggers by resource URI string
	private readonly _onDidChangeLogLevel = new VscodeEmitter<
		[URI | undefined, VscodeLogLevel]
	>();
	public readonly onDidChangeLogLevel: VscodeEvent<
		[URI | undefined, VscodeLogLevel]
	> = this._onDidChangeLogLevel.event;
	private readonly _instanceDisposables = new DisposableStore(); // To manage disposables like emitters

	constructor(initialDefaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info) {
		this.defaultLogLevel = initialDefaultLogLevel;
		console.log(
			`[Cocoon LoggerService Shim] Initialized. Default LogLevel for new loggers: ${VscodeLogLevel[this.defaultLogLevel]}.`,
		);
		this._instanceDisposables.add(this._onDidChangeLogLevel);
	}

	public createLogger(
		resourceOrId: URI | string,
		options?: VscodeILoggerOptions,
	): VscodeILogger {
		const resource =
			typeof resourceOrId === "string"
				? URI.file(
						resourceOrId,
					) /* Assume ID is a file path for console logger name */
				: resourceOrId;
		const resourceKey = resource.toString();
		const existingLogger = this.loggersByResource.get(resource);

		const requestedLogLevel =
			options?.logLevel === "always"
				? VscodeLogLevel.Trace
				: options?.logLevel;

		// Create new or update if level changes or doesn't exist
		if (
			!existingLogger ||
			(requestedLogLevel !== undefined &&
				requestedLogLevel !== existingLogger.getLevel())
		) {
			const derivedNameFromFsPath = resource.fsPath
				? resource.fsPath.substring(
						resource.fsPath.lastIndexOf(path.sep) + 1,
					)
				: "";
			const derivedNameFromPath = resource.path
				? resource.path.substring(resource.path.lastIndexOf("/") + 1)
				: "";
			const derivedName =
				derivedNameFromFsPath ||
				derivedNameFromPath ||
				`logger-${resource.scheme || "unknown"}`;
			const name = options?.name || derivedName;
			const logLevel =
				requestedLogLevel ??
				existingLogger?.getLevel() ??
				this.defaultLogLevel;

			if (existingLogger && logLevel !== existingLogger.getLevel()) {
				// If updating level of existing logger
				existingLogger.setLevel(logLevel);
				return existingLogger;
			} else if (!existingLogger) {
				// console.debug(`[Cocoon LoggerService] Creating logger for resource '${resourceKey}'. Name='${name}', Level=${VscodeLogLevel[logLevel]}.`);
				const newLogger = new ShimLogService(logLevel, name);
				this.loggersByResource.set(resource, newLogger);
				return newLogger;
			}
		}
		return existingLogger!; // Should exist if not created/updated
	}

	public getLogger(resourceOrId: URI | string): VscodeILogger | undefined {
		const resource =
			typeof resourceOrId === "string"
				? URI.file(resourceOrId)
				: resourceOrId;
		return this.loggersByResource.get(resource);
	}

	public dispose(): void {
		console.log(
			"[Cocoon LoggerService Shim] Disposing all cached loggers.",
		);
		dispose([...this.loggersByResource.values()]);
		this.loggersByResource.clear();
		this._instanceDisposables.dispose(); // Disposes the _onDidChangeLogLevel emitter
	}

	public getLogLevel(resource?: URI): VscodeLogLevel {
		// Changed return to non-optional as per first version's update
		if (resource) {
			const logger = this.loggersByResource.get(resource);
			if (logger) return logger.getLevel();
		}
		return this.defaultLogLevel; // Return default if no specific logger or no resource
	}

	public setLogLevel(level: VscodeLogLevel): void;
	public setLogLevel(resource: URI, level: VscodeLogLevel): void;
	public setLogLevel(
		resourceOrLevel: URI | VscodeLogLevel,
		levelValue?: VscodeLogLevel,
	): void {
		let targetResource: URI | undefined = undefined;
		let newLevelToSet: VscodeLogLevel;

		if (resourceOrLevel instanceof URI) {
			targetResource = resourceOrLevel;
			if (
				levelValue === undefined ||
				!Object.values(VscodeLogLevel).includes(
					levelValue as VscodeLogLevel,
				)
			) {
				console.warn(
					`[Cocoon LoggerService] Invalid log level value for setLogLevel(resource, level): '${levelValue}'. Not changed.`,
				);
				return;
			}
			newLevelToSet = levelValue;
		} else {
			// resourceOrLevel is VscodeLogLevel
			if (
				resourceOrLevel === undefined ||
				!Object.values(VscodeLogLevel).includes(
					resourceOrLevel as VscodeLogLevel,
				)
			) {
				console.warn(
					`[Cocoon LoggerService] Invalid log level value for setLogLevel(level): '${resourceOrLevel}'. Not changed.`,
				);
				return;
			}
			newLevelToSet = resourceOrLevel;
		}

		if (targetResource) {
			let logger = this.loggersByResource.get(targetResource);
			if (!logger) {
				// If logger doesn't exist, create it with the specified level.
				// This ensures subsequent getLogger/createLogger for this resource respects this level.
				logger = this.createLogger(targetResource, {
					logLevel: newLevelToSet,
				}) as ShimLogService;
			} else {
				logger.setLevel(newLevelToSet); // Set level on existing logger
			}
			this._onDidChangeLogLevel.fire([targetResource, newLevelToSet]);
		} else {
			// Setting default log level for the service
			const oldDefaultLevel = this.defaultLogLevel;
			if (oldDefaultLevel !== newLevelToSet) {
				this.defaultLogLevel = newLevelToSet;
				console.log(
					`[Cocoon LoggerService] Default log level for new loggers changed: ${VscodeLogLevel[oldDefaultLevel]} -> ${VscodeLogLevel[this.defaultLogLevel]}.`,
				);
				this._onDidChangeLogLevel.fire([
					undefined,
					this.defaultLogLevel,
				]);
				// Optionally, one could iterate over all existing loggers and update those
				// that were at the old default level, but this is often not desired.
			}
		}
	}

	public getDefaultLogLevel(): VscodeLogLevel {
		return this.defaultLogLevel;
	}

	// --- ILoggerService methods related to file-based logging or explicit registration ---
	// These are mostly NOPs or adapted for a console-based shim, as advanced
	// file logging, hidden loggers, etc., are not the focus here.

	public registerLogger(_resource: VscodeILoggerResource): void {
		this._logWarnOnce(
			"LoggerService.registerLogger is a NOP for explicit registration in this console-based shim. Loggers are managed via createLogger/getLogger.",
		);
	}

	public deregisterLogger(_resourceOrId: URI | string): void {
		this._logWarnOnce(
			"LoggerService.deregisterLogger is a NOP for explicit deregistration in this console-based shim. Loggers are disposed with the service or if recreated.",
		);
		// A full implementation would find the logger by resourceOrId (if it's an ID, needs a map from ID to URI/logger),
		// dispose it, remove it from loggersByResource, and potentially fire an event.
	}

	public getRegisteredLoggers(): Iterable<VscodeILoggerResource> {
		const resources: VscodeILoggerResource[] = [];
		this.loggersByResource.forEach((logger, uri) => {
			// uri is the key here
			resources.push({
				resource: uri, // URI is the key
				id: logger.loggerInstanceName || uri.toString(), // Use logger name or URI string as ID
				name: logger.loggerInstanceName,
				logLevel: logger.getLevel(),
				// hidden, when, extensionId, group would need to be stored if createLogger supported them more fully
			});
		});
		return resources;
	}

	public getRegisteredLogger(
		resource: URI,
	): VscodeILoggerResource | undefined {
		const logger = this.loggersByResource.get(resource);
		if (logger) {
			return {
				resource,
				id: logger.loggerInstanceName || resource.toString(),
				name: logger.loggerInstanceName,
				logLevel: logger.getLevel(),
			};
		}
		return undefined;
	}

	// _onDidChangeVisibility and setVisibility are NOPs as console loggers are always "visible" in the console.
	// For a UI that shows/hides loggers in a list, these would be relevant.
	public readonly onDidChangeVisibility: VscodeEvent<[URI, boolean]> =
		VscodeEvent.None;
	public setVisibility(_resourceOrId: URI | string, _visible: boolean): void {
		this._logWarnOnce(
			"LoggerService.setVisibility is a NOP for console-based loggers.",
		);
	}

	private _warnOnceMessagesForService = new Set<string>();
	private _logWarnOnce(message: string): void {
		if (!this._warnOnceMessagesForService.has(message)) {
			this._warnOnceMessagesForService.add(message);
			console.warn(`[Cocoon LoggerService Shim] ${message}`);
		}
	}
}
