// For onDidChangeLogLevel type
import { Event as VscodeEvent } from "vs/base/common/event";
// For onDidChangeLogLevel return
import { IDisposable } from "vs/base/common/lifecycle";
// Assuming this is the LogLevel enum
import { LogLevel as VscodeLogLevel } from "vs/platform/log/common/log";

// Define ILogService and ILoggerService interfaces based on VS Code's common structure
// These would ideally come from VS Code's type definitions.

export interface ILogger {
	/**
	 * The logger is disabled if the log level is more than trace log level.
	 */
	readonly enabled: boolean;

	trace(message: string, ...args: any[]): void;

	debug(message: string, ...args: any[]): void;

	info(message: string, ...args: any[]): void;

	warn(message: string, ...args: any[]): void;

	error(message: string | Error, ...args: any[]): void;

	/**
	 * An operation to flush the contents of the logger.
	 */
	flush(): void;
}

export interface ILogService extends ILogger, IDisposable {
	readonly _serviceBrand: undefined;

	onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;

	getLevel(): VscodeLogLevel;

	setLevel(level: VscodeLogLevel): void;

	/**
	 * @deprecated Use getLogger instead.
	 */
	// Optional as it might be deprecated
	createLogger?(id: string, options?: object): ILogger;

	// More modern approach
	getLogger?(id: string): ILogger | undefined;

	// Often present
	getDefaultLogger?(): ILogger;

	// Critical method from original JS
	critical(message: string | Error, ...args: any[]): void;
}

export interface ILoggerService extends IDisposable {
	readonly _serviceBrand: undefined;

	createLogger(
		resource: any /* typically URI */,

		options?: { name?: string; logLevel?: VscodeLogLevel },
	): ILogger;

	getLogger(resource: any /* typically URI */): ILogger | undefined;

	onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;

	getLogLevel(resource?: any /* typically URI */): VscodeLogLevel;

	setLogLevel(level: VscodeLogLevel): void;

	setLogLevel(resource: any /* typically URI */, level: VscodeLogLevel): void;

	getDefaultLogLevel(): VscodeLogLevel;
}

// Basic LogService/LoggerService shim
export class ShimLogService implements ILogService {
	public readonly _serviceBrand: undefined;

	// Default log level
	private currentLogLevel: VscodeLogLevel = VscodeLogLevel.Info;

	constructor() {
		// Initialize, perhaps set log level from an environment variable or initData
		// For MVP, use a default.
		this.trace(
			"Cocoon Log Shim Initialized with default log level:",

			VscodeLogLevel[this.currentLogLevel],
		);
	}

	// --- ILogger methods ---
	public get enabled(): boolean {
		// Assuming trace is the most verbose, if current level is Trace, all are enabled.
		// This logic needs to match how VS Code's LogLevel enum values compare.
		// Typically, lower number means more verbose.
		// Example: if Trace=0, Info=2, then Trace <= Info is true.
		return this.currentLogLevel <= VscodeLogLevel.Trace;
	}

	public trace(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			console.log("[Cocoon Log Shim][Trace]", message, ...args);
		}
	}

	public debug(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Debug) {
			console.log("[Cocoon Log Shim][Debug]", message, ...args);
		}
	}

	public info(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Info) {
			console.log("[Cocoon Log Shim][Info]", message, ...args);
		}
	}

	public warn(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Warning) {
			console.warn("[Cocoon Log Shim][Warn]", message, ...args);
		}
	}

	public error(message: string | Error, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Error) {
			if (message instanceof Error) {
				console.error(
					"[Cocoon Log Shim][Error]",

					message.message,

					message.stack,

					...args,
				);
			} else {
				console.error("[Cocoon Log Shim][Error]", message, ...args);
			}
		}
	}

	public critical(message: string | Error, ...args: any[]): void {
		// Critical messages are usually logged regardless of level, or at least at Error level.
		// For this shim, let's ensure they are always logged if Error level is enabled.
		if (this.currentLogLevel <= VscodeLogLevel.Error) {
			// Or a specific VscodeLogLevel.Critical if it exists
			if (message instanceof Error) {
				console.error(
					"[Cocoon Log Shim][Critical]",

					message.message,

					message.stack,

					...args,
				);
			} else {
				console.error("[Cocoon Log Shim][Critical]", message, ...args);
			}
		}
	}

	public flush(): void {
		console.log(
			"[Cocoon Log Shim] Flush called (No-op for console logging).",
		);
	}

	// --- ILogService specific methods ---
	public dispose(): void {
		console.log("[Cocoon Log Shim] Dispose called.");

		// Cleanup if any resources were held
	}

	// onDidChangeLogLevel would require an Emitter if we allow setLevel to change it and notify.
	// For a simple shim, Event.None is often used if setLevel is a NOP or doesn't need events.
	public get onDidChangeLogLevel(): VscodeEvent<VscodeLogLevel> {
		// If setLevel is implemented to actually change and notify:
		// private readonly _onDidChangeLogLevel = new Emitter<LogLevel>();

		// public readonly onDidChangeLogLevel = this._onDidChangeLogLevel.event;

		// NOP for simple shim
		return VscodeEvent.None;
	}

	public getLevel(): VscodeLogLevel {
		return this.currentLogLevel;
	}

	public setLevel(level: VscodeLogLevel): void {
		this.trace(
			`[Cocoon Log Shim] setLevel called with ${VscodeLogLevel[level]}. Current: ${VscodeLogLevel[this.currentLogLevel]}`,
		);

		// To make this effective and potentially fire onDidChangeLogLevel:
		// if (this.currentLogLevel !== level) {

		//     this.currentLogLevel = level;

		//     this._onDidChangeLogLevel.fire(this.currentLogLevel);

		// }

		// Simple assignment for now
		this.currentLogLevel = level;
	}

	// Optional createLogger from ILogService (often deprecated in favor of ILoggerService)
	public createLogger(id: string, _options?: object): ILogger {
		this.trace(
			`[Cocoon Log Shim] createLogger called for id: ${id}. Returning self (main logger).`,
		);

		// For a simple shim, all loggers can point back to the main LogService instance.
		// A more complex shim might create distinct logger instances with prefixes.
		return this;
	}
}

// Very basic stub for ILoggerService if only createLogger is needed by ExtHostLogService
// The ExtHostLogService itself often implements ILogService and uses an ILoggerService internally.
export class ShimLoggerService implements ILoggerService {
	public readonly _serviceBrand: undefined;

	private defaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info;

	public createLogger(
		_resource: any,

		options?: { name?: string; logLevel?: VscodeLogLevel },
	): ILogger {
		// This should return an ILogger instance, which could be a new ShimLogService
		// or a more specialized logger object.
		// For simplicity, let's return a new ShimLogService that acts as a logger.
		// ShimLogService implements ILogger
		const logger = new ShimLogService();

		if (options?.logLevel) {
			logger.setLevel(options.logLevel);
		}

		if (options?.name) {
			// Could prefix messages, but ShimLogService doesn't support that directly.
			// This would require a more complex logger wrapper.
			logger.trace(`Logger created with name: ${options.name}`);
		}

		return logger;
	}

	public getLogger(_resource: any): ILogger | undefined {
		// This would require managing a map of loggers if they are stateful per resource
		console.warn(
			"[Cocoon Logger Shim] getLogger is not fully implemented, returning new default logger.",
		);

		// Return a new default logger
		return this.createLogger(null);
	}

	public dispose(): void {
		console.log("[Cocoon Logger Shim] Dispose called.");
	}

	public get onDidChangeLogLevel(): VscodeEvent<VscodeLogLevel> {
		// NOP for simple shim
		return VscodeEvent.None;
	}

	public getLogLevel(_resource?: any): VscodeLogLevel {
		// Could be resource-specific if implemented
		return this.defaultLogLevel;
	}

	// Overload for setLogLevel
	public setLogLevel(level: VscodeLogLevel): void;

	public setLogLevel(resource: any, level: VscodeLogLevel): void;

	public setLogLevel(
		resourceOrLevel: any | VscodeLogLevel,

		level?: VscodeLogLevel,
	): void {
		if (level !== undefined && typeof resourceOrLevel !== "number") {
			// resource, level
			console.warn(
				`[Cocoon Logger Shim] setLogLevel for resource ${resourceOrLevel} to ${VscodeLogLevel[level]} - Not implemented per resource.`,
			);

			// Set default for now
			this.defaultLogLevel = level;
		} else {
			// level only
			this.defaultLogLevel = resourceOrLevel as VscodeLogLevel;
		}

		console.log(
			`[Cocoon Logger Shim] Default log level set to ${VscodeLogLevel[this.defaultLogLevel]}`,
		);
	}

	public getDefaultLogLevel(): VscodeLogLevel {
		return this.defaultLogLevel;
	}
}

// Original JS export
// module.exports = { ShimLogService, ShimLoggerService };

// Classes are exported directly in TS.
