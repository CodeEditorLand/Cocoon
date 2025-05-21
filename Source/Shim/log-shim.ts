// --- START OF FILE log-shim.ts ---

/*---------------------------------------------------------------------------------------------
 // Header: Updated to reflect it contains multiple shims 
* Cocoon Log Shims (log-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides shim implementations for VS Code's logging services:
 * - `ShimLogService`: Implements `ILogService`, typically used by most ExtHost services.
 *   It writes logs to the console and supports basic log level filtering.
 * - `ShimLoggerService`: Implements `ILoggerService`, used by `ExtHostLogService` to create
 *   loggers, often associated with resources (like file output URIs). This shim's
 *   `createLogger` returns instances of `ShimLogService`.
 *
 * Key Interactions:
 * - `ShimLogService` is injected into many other shims.
 * - `ShimLoggerService` might be injected into a (potentially real) `ExtHostLogService`.
 * - Uses VS Code's `LogLevel` enum and `Event` type.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { dispose, IDisposable } from "vs/base/common/lifecycle";
// TODO: Ensure 'vs/platform/log/common/log' provides these interfaces and enums.
// If not, they need to be defined locally matching VS Code's structure.
// For ILoggerService createLogger resource URI
import { URI } from "vs/base/common/uri";
import {
	parseLogLevel,
	ILogger as VscodeILogger,
	ILoggerService as VscodeILoggerService,
	ILogService as VscodeILogService,
	LogLevel as VscodeLogLevel,
} from "vs/platform/log/common/log";

// --- ShimLogService: Implements VscodeILogService and VscodeILogger ---
export class ShimLogService implements VscodeILogService {
	// VscodeILogService extends VscodeILogger and IDisposable
	public readonly _serviceBrand: undefined;

	private currentLogLevel: VscodeLogLevel;

	private readonly _onDidChangeLogLevel: VscodeEmitter<VscodeLogLevel>;

	public readonly onDidChangeLogLevel: VscodeEvent<VscodeLogLevel>;

	// Optional name for this logger instance
	private readonly name?: string;

	constructor(
		initialLogLevel: VscodeLogLevel = VscodeLogLevel.Info,

		name?: string,
	) {
		this.currentLogLevel = initialLogLevel;

		this.name = name;

		this._onDidChangeLogLevel = new VscodeEmitter<VscodeLogLevel>();

		this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;

		const prefix = this.name ? `[${this.name}] ` : "";

		this.trace(
			`${prefix}Cocoon LogService Instance Initialized. Level: ${VscodeLogLevel[this.currentLogLevel]}`,
		);
	}

	private _formatMessage(
		level: string,

		message: string | Error,

		...args: any[]
	): string {
		// TODO: FIX THIS
		// const prefix = this.name ? `[${VscodeLogLevel[this.getLevel()] VscodeLogLevel[this.getLevel()]}] [${this.name}]` : `[${VscodeLogLevel[this.getLevel()] VscodeLogLevel[this.getLevel()]}]`;

		let mainMsg: string;

		let stack = "";

		if (message instanceof Error) {
			mainMsg = message.message;

			stack = message.stack ? `\n${message.stack}` : "";
		} else {
			mainMsg = message;
		}

		const argsStr =
			args.length > 0
				? ` ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`
				: "";

		return `${prefix} ${mainMsg}${argsStr}${stack}`;
	}

	// --- VscodeILogger methods ---
	public get enabled(): boolean {
		// In VS Code, lower enum value means more verbose.
		// So, if currentLevel is Info (2), Trace (0) and Debug (1) should not log.
		// This interpretation might be reversed from original; let's assume higher value = higher severity (less logging).
		// VS Code standard: Trace = 0, Debug = 1, Info = 2, Warning = 3, Error = 4, Critical = 5, Off = 6
		// So, `this.currentLogLevel <= targetLevel` means "log if current setting is at least as verbose as target".
		// Simplification: let individual methods check level.
		return true;
	}

	public trace(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Trace) {
			console.log(this._formatMessage("Trace", message, ...args));
		}
	}

	public debug(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Debug) {
			// Use console.debug
			console.debug(this._formatMessage("Debug", message, ...args));
		}
	}

	public info(message: string, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Info) {
			// Use console.info
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

	// VscodeILogService has critical, not directly on VscodeILogger typically
	public critical(message: string | Error, ...args: any[]): void {
		if (this.currentLogLevel <= VscodeLogLevel.Error) {
			// Treat critical as at least Error level
			console.error(this._formatMessage("Critical", message, ...args));
		}
	}

	public flush(): void {
		// console.log("[Cocoon Log Shim] Flush called (No-op for console logging).");
		// No-op for console, but good to have for API compliance.
	}

	// --- VscodeILogService specific methods ---
	public dispose(): void {
		// console.log("[Cocoon Log Shim] Dispose called.");

		this._onDidChangeLogLevel.dispose();

		// Cleanup if any resources were held
	}

	public getLevel(): VscodeLogLevel {
		return this.currentLogLevel;
	}

	public setLevel(level: VscodeLogLevel | string): void {
		// Allow string to parse
		const newLevel =
			typeof level === "string" ? parseLogLevel(level) : level;

		if (newLevel === undefined) {
			// parseLogLevel returns undefined for invalid string
			console.warn(
				`[Cocoon Log Shim] Invalid log level string: ${level}`,
			);

			return;
		}

		// this.trace(`[Cocoon Log Shim] setLevel called with ${VscodeLogLevel[newLevel]}. Current: ${VscodeLogLevel[this.currentLogLevel]}`);

		if (this.currentLogLevel !== newLevel) {
			this.currentLogLevel = newLevel;

			this._onDidChangeLogLevel.fire(this.currentLogLevel);

			// Log the change at new Info level
			this.info(`Log level set to ${VscodeLogLevel[newLevel]}`);
		}
	}

	// createLogger from VscodeILogService (often deprecated for ILoggerService.createLogger)
	// but some older services might still use it.
	public createLogger(
		resource: URI,

		options?: { name?: string },
	): VscodeILogger {
		// this.trace(`[Cocoon Log Shim] createLogger (on LogService) called for resource: ${resource.toString()}. Options: ${JSON.stringify(options)}.`);

		// Create a new logger instance with a name.
		return new ShimLogService(
			this.currentLogLevel,

			options?.name ||
				resource.fsPath.substring(
					resource.fsPath.lastIndexOf(path.sep) + 1,
				),
		);
	}

	public getLogger(resource: URI): VscodeILogger | undefined {
		// ILogService in VS Code often doesn't manage a map of loggers by resource itself;

		// that's more ILoggerService's role. It might return a default or resource-specific one.
		// For this shim, let's just create one like `createLogger`.
		this.warn(
			`[Cocoon Log Shim] getLogger (on LogService) for resource ${resource.toString()} - returning new logger instance.`,
		);

		return this.createLogger(resource);
	}

	public getDefaultLogger(): VscodeILogger {
		// The LogService itself can act as the default logger
		return this;
	}
}

// --- ShimLoggerService: Implements VscodeILoggerService ---
export class ShimLoggerService implements VscodeILoggerService {
	public readonly _serviceBrand: undefined;

	private defaultLogLevel: VscodeLogLevel = VscodeLogLevel.Info;

	// Cache loggers by resource URI string
	private readonly loggers = new Map<string, ShimLogService>();

	private readonly _onDidChangeLogLevel: VscodeEmitter<
		[URI | undefined, VscodeLogLevel]
		// Payload: [resource, newLevel]
	>;

	public readonly onDidChangeLogLevel: VscodeEvent<
		[URI | undefined, VscodeLogLevel]
	>;

	constructor() {
		// TODO: Potentially take IEnvironmentService or similar to get default log path or initial level.
		this._onDidChangeLogLevel = new VscodeEmitter<
			[URI | undefined, VscodeLogLevel]
		>();

		this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;

		console.log(
			`[Cocoon LoggerService Shim] Initialized. Default LogLevel: ${VscodeLogLevel[this.defaultLogLevel]}`,
		);
	}

	public createLogger(
		resource: URI,

		options?: {
			name?: string;

			logLevel?: VscodeLogLevel;

			File?: any /* FileLoggerOptions */;
		},
	): VscodeILogger {
		const key = resource.toString();

		if (!this.loggers.has(key) || options?.logLevel) {
			// Create new if not exists or if specific log level is requested
			const name =
				options?.name ||
				resource.fsPath.substring(
					resource.fsPath.lastIndexOf(path.sep) + 1,
				) ||
				"default-logger";

			// Use resource-specific or default
			const logLevel = options?.logLevel ?? this.getLogLevel(resource);

			const newLogger = new ShimLogService(logLevel, name);

			this.loggers.set(key, newLogger);

			// If file logging were supported, options.File would be used here.
			// console.log(`[Cocoon LoggerService Shim] Created logger for ${key} with name ${name} at level ${VscodeLogLevel[logLevel]}.`);

			return newLogger;
		}

		return this.loggers.get(key)!;
	}

	public getLogger(resource: URI): VscodeILogger | undefined {
		return this.loggers.get(resource.toString());
	}

	public dispose(): void {
		// console.log("[Cocoon LoggerService Shim] Dispose called.");

		this.loggers.forEach((logger) => logger.dispose());

		this.loggers.clear();

		this._onDidChangeLogLevel.dispose();
	}

	public getLogLevel(resource?: URI): VscodeLogLevel {
		if (resource) {
			const logger = this.loggers.get(resource.toString());

			if (logger) return logger.getLevel();
		}

		return this.defaultLogLevel;
	}

	public setLogLevel(level: VscodeLogLevel): void;

	public setLogLevel(resource: URI, level: VscodeLogLevel): void;

	public setLogLevel(
		resourceOrLevel: URI | VscodeLogLevel,

		level?: VscodeLogLevel,
	): void {
		if (level !== undefined && resourceOrLevel instanceof URI) {
			// resource, level
			const logger = this.loggers.get(resourceOrLevel.toString());

			if (logger) {
				// This will fire logger's onDidChangeLogLevel if it has one
				logger.setLevel(level);
			} else {
				// If logger doesn't exist, should we create it or just set a default for future creations?
				// For now, log a warning. If createLogger is called next, it will use this level.
				console.warn(
					`[Cocoon LoggerService Shim] setLogLevel for non-existent logger resource ${resourceOrLevel.toString()}. Level not applied to specific instance.`,
				);

				// To make this effective for future creations, store overrides:
				// this.levelOverrides.set(resourceOrLevel.toString(), level);
			}

			this._onDidChangeLogLevel.fire([resourceOrLevel, level]);
		} else {
			// level only (sets default)
			this.defaultLogLevel = resourceOrLevel as VscodeLogLevel;

			// console.log(`[Cocoon LoggerService Shim] Default log level set to ${VscodeLogLevel[this.defaultLogLevel]}`);

			// Optionally update all existing loggers to the new default if they weren't specifically set
			this.loggers.forEach((logger) => {
				// Only update if it was using the old default or some other logic
				// This part is complex: should it override individually set levels?
				// Typically, setDefault affects loggers created *after* or those not explicitly set.
			});

			this._onDidChangeLogLevel.fire([undefined, this.defaultLogLevel]);
		}
	}

	public getDefaultLogLevel(): VscodeLogLevel {
		return this.defaultLogLevel;
	}
}

// --- END OF FILE log-shim.ts ---
