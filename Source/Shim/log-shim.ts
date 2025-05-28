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
 *--------------------------------------------------------------------------------------------*/

import * as path from "node:path"; // For path.sep in deriving logger names
import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import { dispose, type IDisposable } from "vs/base/common/lifecycle";
import { URI } from "vs/base/common/uri"; // For ILoggerService createLogger resource URI type
import {
	parseLogLevel, // Helper utility
	LogLevel as VscodeLogLevel, // The LogLevel enum
	type ILogger as VscodeILogger,
	type ILoggerOptions as VscodeILoggerOptions, // For ILoggerService.createLogger options
	type ILoggerResource as VscodeILoggerResource, // For ILoggerService logger registration
	type ILoggerService as VscodeILoggerService,
	type ILogService as VscodeILogService,
} from "vs/platform/log/common/log";

/**
 * A shim implementation of `ILogService` that directs all log output to the console.
 */
export class ShimLogService implements VscodeILogService {
	public readonly _serviceBrand: undefined;
	private currentLogLevel: VscodeLogLevel;
	private readonly _onDidChangeLogLevel: VscodeEmitter<VscodeLogLevel>;
	public readonly onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;
	private readonly loggerInstanceName?: string;
	private readonly _warnOnceMessages = new Set<string>(); // Moved from ILogService specific section

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
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			// Avoid logging init if level is too high
			console.trace(
				this._formatMessage(
					"Trace",
					`${namePrefix}Cocoon LogService Instance Initialized. Effective LogLevel: ${VscodeLogLevel[this.currentLogLevel]}`,
				),
			);
		}
	}

	private _formatMessage(
		levelLabel: string,
		message: string | Error,
		...args: any[]
	): string {
		const namePrefix = this.loggerInstanceName
			? `[${this.loggerInstanceName}]`
			: "";
		const levelPrefix = `[${levelLabel.toUpperCase()}]`;
		const fullPrefix = `${levelPrefix}${namePrefix}`;
		let mainLogMessage: string;
		let stackTraceInfo = "";
		if (message instanceof Error) {
			mainLogMessage = message.message;
			stackTraceInfo = message.stack
				? `\nStack Trace:\n${message.stack}`
				: "";
		} else {
			mainLogMessage = message;
		}
		const argsString =
			args.length > 0
				? ` ${args.map((arg) => (typeof arg === "object" && arg !== null ? JSON.stringify(arg, null, 2) : String(arg))).join(" ")}`
				: "";
		return `${fullPrefix} ${mainLogMessage}${argsString}${stackTraceInfo}`;
	}

	public get enabled(): boolean {
		return this.currentLogLevel !== VscodeLogLevel.Off;
	}
	public trace(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			console.trace(this._formatMessage("Trace", message, ...args));
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
			console.error(this._formatMessage("Error", message, ...args));
		}
	}
	public critical(message: string | Error, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Critical) {
			console.error(this._formatMessage("Critical", message, ...args));
		}
	}
	public flush(): void {
		/* NOP for console logger */
	}
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
				`${namePrefix}[Cocoon LogService Shim] Invalid log level: '${level}'. Not changed from ${VscodeLogLevel[this.currentLogLevel]}.`,
			);
			return;
		}
		if (this.currentLogLevel !== newLevel) {
			const oldLevel = this.currentLogLevel;
			this.currentLogLevel = newLevel;
			this._onDidChangeLogLevel.fire(this.currentLogLevel);
			const levelChangeMessage = `Log level changed from ${VscodeLogLevel[oldLevel]} to ${VscodeLogLevel[newLevel]}.`;
			if (this.currentLogLevel <= VscodeLogLevel.Info) {
				this.info(levelChangeMessage);
			} else if (oldLevel <= VscodeLogLevel.Info) {
				console.info(this._formatMessage("Info", levelChangeMessage));
			}
		}
	}

	public createLogger(
		resource: URI,
		options?: VscodeILoggerOptions,
	): VscodeILogger {
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
			`child-${resource.scheme}`;
		const loggerName = options?.name || derivedName;
		const logLevel =
			options?.logLevel === "always"
				? VscodeLogLevel.Trace
				: (options?.logLevel ?? this.currentLogLevel);

		this.trace(
			`Creating child logger: Name='${loggerName}', Resource='${resource.toString()}', InitialLevel=${VscodeLogLevel[logLevel]}`,
		);
		return new ShimLogService(logLevel, loggerName);
	}

	public getLogger(resource: URI): VscodeILogger | undefined {
		this.warnOnce(
			`ILogService.getLogger(resource) called. This ShimLogService does not cache loggers by resource; ` +
				`it will create a new logger instance for resource: ${resource.toString()}. ` +
				`For cached, resource-specific loggers, use an ILoggerService implementation.`,
		);
		return this.createLogger(resource);
	}

	private warnOnce(message: string): void {
		if (!this._warnOnceMessages.has(message)) {
			this._warnOnceMessages.add(message);
			this.warn(message);
		}
	}
	public getDefaultLogger(): VscodeILogger {
		return this;
	}
}

/**
 * A shim implementation of `ILoggerService`.
 */
export class ShimLoggerService implements VscodeILoggerService {
	public readonly _serviceBrand: undefined;
	private defaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info;
	private readonly loggersByResource = new ResourceMap<ShimLogService>(); // Key: resource.toString()
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
					) /* Simplification: assume ID is a file path for console logger name */
				: resourceOrId;
		const resourceKey = resource.toString();
		const existingLogger = this.loggersByResource.get(resource);

		const requestedLogLevel =
			options?.logLevel === "always"
				? VscodeLogLevel.Trace
				: options?.logLevel;

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
				`logger-${resource.scheme}`;

			const name = options?.name || derivedName;
			const logLevel =
				requestedLogLevel ??
				existingLogger?.getLevel() ??
				this.defaultLogLevel;

			// console.debug(`[Cocoon LoggerService] Creating/Updating logger for resource '${resourceKey}'. Name='${name}', Level=${VscodeLogLevel[logLevel]}.`);
			const newLogger = new ShimLogService(logLevel, name);
			// Dispose old logger for this resource if replacing
			if (existingLogger) {
				existingLogger.dispose();
			}
			this.loggersByResource.set(resource, newLogger);
			return newLogger;
		}
		return existingLogger;
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
		// Changed return to non-optional as there's always a default
		if (resource) {
			const logger = this.loggersByResource.get(resource);
			if (logger) return logger.getLevel();
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
				logger = this.createLogger(targetResource, {
					logLevel: newLevelToSet,
				}) as ShimLogService;
			} else {
				logger.setLevel(newLevelToSet);
			}
			this._onDidChangeLogLevel.fire([targetResource, newLevelToSet]);
		} else {
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
			}
		}
	}

	public getDefaultLogLevel(): VscodeLogLevel {
		return this.defaultLogLevel;
	}

	// ILoggerService methods related to file-based logging or explicit registration are mostly NOPs or adapted for console.
	// This shim's `createLogger` handles registration with its internal map.
	// These are part of VscodeILoggerService but less relevant for a pure console shim.
	public registerLogger(_resource: VscodeILoggerResource): void {
		this._logWarnOnce(
			"LoggerService.registerLogger is a NOP for explicit registration in this console-based shim. Use createLogger.",
		);
	}
	public deregisterLogger(_resourceOrId: URI | string): void {
		this._logWarnOnce(
			"LoggerService.deregisterLogger is a NOP for explicit deregistration in this console-based shim. Loggers are disposed with the service or if recreated.",
		);
		// For full implementation: find by resourceOrId, dispose, remove from map, fire event.
	}
	public getRegisteredLoggers(): Iterable<VscodeILoggerResource> {
		const resources: VscodeILoggerResource[] = [];
		this.loggersByResource.forEach((logger, uri) => {
			resources.push({
				resource: uri, // URI is the key
				id: logger.loggerInstanceName || uri.toString(), // Simplification for id
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
	// _onDidChangeVisibility and setVisibility are NOPs as console loggers are always "visible" in console.
	// For a UI that shows/hides loggers, these would be relevant.
	public readonly onDidChangeVisibility: VscodeEvent<[URI, boolean]> =
		VscodeEvent.None;
	public setVisibility(_resourceOrId: URI | string, _visible: boolean): void {
		this._logWarnOnce(
			"LoggerService.setVisibility is a NOP for console-based loggers.",
		);
	}
	private _logWarnOnce(message: string): void {
		/* Helper to avoid spamming warnings */
		if (!(this as any)._serviceWarnOnceMessages)
			(this as any)._serviceWarnOnceMessages = new Set<string>();
		if (!(this as any)._serviceWarnOnceMessages.has(message)) {
			(this as any)._serviceWarnOnceMessages.add(message);
			console.warn(`[Cocoon LoggerService Shim] ${message}`);
		}
	}
}
