// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/150_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): cdd0844c0bb020db7d335dec15437419d47308ca4d5f9da9da53abeffded6f38
// Extracted to File: Backup/TSFMSC/Code/log-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:57.067Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE log-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Logging Shims (log-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides shim implementations for VS Code's primary logging service interfaces,
 * enabling consistent logging across the Cocoon extension host environment.
 * All log messages are currently directed to the console.
 *
 * Contains:
 * - `ShimLogService`: Implements `ILogService` (and by extension `ILogger`). This is the
 *   most commonly injected logging service used by various ExtHost components and shims.
 *   It supports basic log level filtering and can be named for contextual logging.
 *
 * - `ShimLoggerService`: Implements `ILoggerService`. In VS Code, `ExtHostLogService`
 *   (which might use `ILoggerService`) is responsible for creating and managing more
 *   specialized loggers, often associated with specific resources (like output file URIs)
 *   or capabilities (e.g., spdlog-based file logging). This shim's `createLogger`
 *   method returns instances of `ShimLogService`, effectively providing named,
 *   console-based loggers.
 *
 * Responsibilities:
 * - `ShimLogService`:
 *   - Filtering messages based on the current log level.
 *   - Formatting and writing log messages to the console (`console.log`, `console.warn`, etc.).
 *   - Handling `Error` objects appropriately to include stack traces.
 *   - Managing its own log level and emitting an event when it changes.
 * - `ShimLoggerService`:
 *   - Creating and caching `ShimLogService` instances per resource URI.
 *   - Managing a default log level and per-resource log levels.
 *   - Emitting an event when log levels change.
 *
 * Key Interactions:
 * - `ShimLogService` is typically instantiated directly in `index.ts` and registered as
 *   the `ILogService` implementation for Dependency Injection.
 * - `ShimLoggerService` can be registered as the `ILoggerService` implementation. If a real
 *   `ExtHostLogService` from VS Code sources were used, it might consume `ILoggerService`.
 * - Both shims use `vs/platform/log/common/log.LogLevel` and `vs/base/common/event`.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import * as path from "node:path"; // For path.sep in deriving logger name
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import { dispose, type IDisposable } from "vs/base/common/lifecycle";
// For ILoggerService createLogger resource URI type
import { URI } from "vs/base/common/uri";
// Import VS Code's log level definitions and service interfaces
import {
	LogLevel as VscodeLogLevel,
	parseLogLevel, // Helper to parse string log levels
	type ILogger as VscodeILogger,
	type ILoggerService as VscodeILoggerService,
	type ILogService as VscodeILogService,
} from "vs/platform/log/common/log";

/**
 * A shim implementation of `ILogService` and `ILogger` that writes to the console.
 */
export class ShimLogService implements VscodeILogService {
	public readonly _serviceBrand: undefined; // Required by VS Code's service types

	private currentLogLevel: VscodeLogLevel;
	private readonly _onDidChangeLogLevel: VscodeEmitter<VscodeLogLevel>;
	public readonly onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;
	private readonly loggerInstanceName?: string; // Optional name for this logger instance

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

		// Initial log message to confirm logger creation and level
		const namePrefix = this.loggerInstanceName ? `[${this.loggerInstanceName}] ` : "";
		this.trace( // Use trace to avoid noise if initial level is higher
			`${namePrefix}Cocoon LogService Instance Initialized. Level: ${VscodeLogLevel[this.currentLogLevel]}`,
		);
	}

	/**
	 * Formats a log message with level, optional name prefix, and arguments.
	 * @param levelLabel The string label for the log level (e.g., "Trace", "Info").
	 * @param message The main log message or an Error object.
	 * @param args Additional arguments to log.
	 * @returns The formatted log string.
	 */
	private _formatMessage(levelLabel: string, message: string | Error, ...args: any[]): string {
		const namePrefix = this.loggerInstanceName ? `[${this.loggerInstanceName}]` : "";
		const levelPrefix = `[${levelLabel}]`;
		const fullPrefix = namePrefix ? `${levelPrefix}${namePrefix}` : levelPrefix;

		let mainLogMessage: string;
		let stackTrace = "";

		if (message instanceof Error) {
			mainLogMessage = message.message;
			stackTrace = message.stack ? `\nStack: ${message.stack}` : "";
		} else {
			mainLogMessage = message;
		}

		const argsString = args.length > 0
			? ` ${args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")}`
			: "";

		return `${fullPrefix} ${mainLogMessage}${argsString}${stackTrace}`;
	}

	// --- VscodeILogger methods ---
	/**
	 * Checks if the logger is enabled at the current level.
	 * This property is often used by more complex logger implementations; for console logging,
	 * the level check is done in each specific log method.
	 */
	public get enabled(): boolean {
		// A logger is generally "enabled" if its level is not OFF.
		// Specific methods then check against their target level.
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
		// Error objects are passed directly to _formatMessage
		if (this.currentLogLevel <= VscodeLogLevel.Error) {
			console.error(this._formatMessage("Error", message, ...args));
		}
	}

	/**
	 * Logs a critical message. In this shim, treated similar to an error.
	 */
	public critical(message: string | Error, ...args: any[]): void {
		// VscodeILogService has 'critical', typically logs at Error level or higher.
		if (this.currentLogLevel <= VscodeLogLevel.Critical) { // Check against Critical if it's distinct from Error
			console.error(this._formatMessage("Critical", message, ...args));
		}
	}

	/**
	 * Flushes any buffered log messages. NOP for console logging.
	 */
	public flush(): void {
		// console.debug("[Cocoon Log Shim] Flush called (No-op for console logging).");
	}

	// --- VscodeILogService specific methods ---
	public dispose(): void {
		// const namePrefix = this.loggerInstanceName ? `[${this.loggerInstanceName}] ` : "";
		// this.trace(`${namePrefix}Cocoon LogService Instance Disposed.`);
		this._onDidChangeLogLevel.dispose();
	}

	public getLevel(): VscodeLogLevel {
		return this.currentLogLevel;
	}

	public setLevel(level: VscodeLogLevel | string): void {
		const newLevel = typeof level === "string" ? parseLogLevel(level) : level;

		if (newLevel === undefined || !Object.values(VscodeLogLevel).includes(newLevel)) {
			const namePrefix = this.loggerInstanceName ? `[${this.loggerInstanceName}] ` : "";
			console.warn(`${namePrefix}[Cocoon Log Shim] Invalid log level string or value: ${level}. Level not changed.`);
			return;
		}

		if (this.currentLogLevel !== newLevel) {
			const oldLevel = this.currentLogLevel;
			this.currentLogLevel = newLevel;
			this._onDidChangeLogLevel.fire(this.currentLogLevel);
			// Log the change itself at the new Info level (if enabled), or old Info level.
			const message = `Log level changed from ${VscodeLogLevel[oldLevel]} to ${VscodeLogLevel[newLevel]}.`;
            if (this.currentLogLevel <= VscodeLogLevel.Info) {
                this.info(message);
            } else if (oldLevel <= VscodeLogLevel.Info) {
                // If new level is too restrictive, log with old level's Info permission
                console.info(this._formatMessage("Info", message));
            }
		}
	}

	/**
	 * Creates a new logger instance, typically for a specific resource or component.
	 * In this shim, it creates another `ShimLogService` instance.
	 */
	public createLogger(resource: URI, options?: { name?: string; logLevel?: VscodeLogLevel }): VscodeILogger {
		const loggerName = options?.name || resource.fsPath.substring(resource.fsPath.lastIndexOf(path.sep) + 1) || "child-logger";
		const logLevel = options?.logLevel ?? this.currentLogLevel; // Inherit parent's level by default
		// this.trace(`Creating child logger: Name='${loggerName}', Resource='${resource.toString()}', Level=${VscodeLogLevel[logLevel]}`);
		return new ShimLogService(logLevel, loggerName);
	}

	/**
	 * Gets an existing logger for a resource or creates one.
	 * This LogService shim doesn't maintain a cache of loggers by resource;
	 * that's more the role of ILoggerService. This method will behave like `createLogger`.
	 */
	public getLogger(resource: URI): VscodeILogger | undefined {
		this.warnOnce(
			`getLogger(resource) on ILogService is typically for managed loggers. This shim will create a new logger instance for resource: ${resource.toString()}`,
		);
		return this.createLogger(resource);
	}

    private _warnOnceMessages = new Set<string>();
    private warnOnce(message: string): void { // Helper for getLogger warning
        if (!this._warnOnceMessages.has(message)) {
            this._warnOnceMessages.add(message);
            this.warn(message);
        }
    }

	/**
	 * Gets the default logger instance, which is this `LogService` instance itself.
	 */
	public getDefaultLogger(): VscodeILogger {
		return this;
	}
}

/**
 * A shim implementation of `ILoggerService` that creates `ShimLogService` instances.
 */
export class ShimLoggerService implements VscodeILoggerService {
	public readonly _serviceBrand: undefined; // Required by VS Code's service types

	private defaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info;
	private readonly loggersByResource = new Map<string, ShimLogService>(); // Cache loggers by resource URI string
	private readonly _onDidChangeLogLevel = new VscodeEmitter<[URI | undefined, VscodeLogLevel]>(); // Payload: [resource URI | undefined for default, newLevel]
	public readonly onDidChangeLogLevel: VscodeEvent<[URI | undefined, VscodeLogLevel]> = this._onDidChangeLogLevel.event;

	constructor() {
		// TODO: Potentially take IEnvironmentService or similar to get default log path or initial log level.
		console.log(
			`[Cocoon LoggerService Shim] Initialized. Default LogLevel for new loggers: ${VscodeLogLevel[this.defaultLogLevel]}`,
		);
	}

	/**
	 * Creates a logger, typically associated with a resource (e.g., a file path for log output).
	 * This shim creates console-based `ShimLogService` instances.
	 * @param resource The URI identifying the resource this logger is for.
	 * @param options Optional configuration for the logger.
	 * @returns An `ILogger` instance (specifically, a `ShimLogService`).
	 */
	public createLogger(
		resource: URI,
		options?: { name?: string; logLevel?: VscodeLogLevel /* ; File?: any FileLoggerOptions */ },
	): VscodeILogger {
		const resourceKey = resource.toString();
		// If a specific log level is requested in options, or if logger doesn't exist, create/recreate.
		if (!this.loggersByResource.has(resourceKey) || options?.logLevel !== undefined) {
			const name = options?.name || resource.fsPath.substring(resource.fsPath.lastIndexOf(path.sep) + 1) || `logger-${resource.scheme}`;
			const logLevel = options?.logLevel ?? this.getLogLevel(resource) ?? this.defaultLogLevel;

			// console.debug(`[Cocoon LoggerService Shim] Creating/Recreating logger for resource '${resourceKey}', Name='${name}', Level=${VscodeLogLevel[logLevel]}.`);
			const newLogger = new ShimLogService(logLevel, name);
            // Listen to level changes on this specific logger if we want ILoggerService.onDidChangeLogLevel to reflect individual logger changes
            // This part can be complex if individual loggers can change their level independently of the service setting it.
            // For now, ILoggerService.onDidChangeLogLevel is fired when setLogLevel is called on the service.
			this.loggersByResource.set(resourceKey, newLogger);
			return newLogger;
		}
		return this.loggersByResource.get(resourceKey)!;
	}

	/**
	 * Retrieves an existing logger for the given resource, if one was created.
	 * @param resource The URI of the resource.
	 * @returns The `ILogger` instance, or `undefined` if not found.
	 */
	public getLogger(resource: URI): VscodeILogger | undefined {
		return this.loggersByResource.get(resource.toString());
	}

	public dispose(): void {
		console.log("[Cocoon LoggerService Shim] Dispose called.");
		dispose([...this.loggersByResource.values()]); // Dispose all cached loggers
		this.loggersByResource.clear();
		this._onDidChangeLogLevel.dispose();
	}

	public getLogLevel(resource?: URI): VscodeLogLevel | undefined { // Can return undefined if no specific level set
		if (resource) {
			const logger = this.loggersByResource.get(resource.toString());
			if (logger) return logger.getLevel();
            return undefined; // No specific logger, so no specific level known by LoggerService itself
		}
		return this.defaultLogLevel;
	}

	public setLogLevel(level: VscodeLogLevel): void;
	public setLogLevel(resource: URI, level: VscodeLogLevel): void;
	public setLogLevel(
		resourceOrLevel: URI | VscodeLogLevel,
		levelValue?: VscodeLogLevel,
	): void {
		let targetResource: URI | undefined = undefined;
		let newLevel: VscodeLogLevel;

		if (resourceOrLevel instanceof URI) {
			targetResource = resourceOrLevel;
			if (levelValue === undefined) { // Should not happen with TS overload, but guard
                console.warn("[Cocoon LoggerService Shim] setLogLevel called with URI but no level value.");
                return;
            }
			newLevel = levelValue;
		} else {
			newLevel = resourceOrLevel; // Setting default log level
		}

        if (newLevel === undefined || !Object.values(VscodeLogLevel).includes(newLevel)) {
            console.warn(`[Cocoon LoggerService Shim] Invalid log level value: ${newLevel}. Level not changed.`);
            return;
        }

		if (targetResource) {
			// Set level for a specific resource's logger
			let logger = this.loggersByResource.get(targetResource.toString());
			if (!logger) {
                // If logger doesn't exist, create it with the specified level.
                // This ensures subsequent getLogger/createLogger for this resource respects this level.
                // console.debug(`[Cocoon LoggerService Shim] setLogLevel: Logger for ${targetResource.toString()} not found. Creating with level ${VscodeLogLevel[newLevel]}.`);
                logger = this.createLogger(targetResource, {logLevel: newLevel}) as ShimLogService;
            } else {
                logger.setLevel(newLevel);
            }
			this._onDidChangeLogLevel.fire([targetResource, newLevel]);
		} else {
			// Set default log level for the service
			const oldDefaultLevel = this.defaultLogLevel;
			this.defaultLogLevel = newLevel;
			// console.log(`[Cocoon LoggerService Shim] Default log level set from ${VscodeLogLevel[oldDefaultLevel]} to ${VscodeLogLevel[this.defaultLogLevel]}`);
			// Optionally, update all existing loggers that were using the old default level.
			// This is a policy decision: should changing default affect existing loggers not explicitly set?
			// For simplicity, current ShimLogService instances manage their own levels.
			// This event signals the *default* has changed.
			this._onDidChangeLogLevel.fire([undefined, this.defaultLogLevel]);
		}
	}

	/**
	 * Gets the default log level for new loggers created by this service.
	 */
	public getDefaultLogLevel(): VscodeLogLevel {
		return this.defaultLogLevel;
	}
}
--- END OF FILE log-shim.ts ---