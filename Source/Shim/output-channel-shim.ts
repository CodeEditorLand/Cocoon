/*---------------------------------------------------------------------------------------------
 * Cocoon Output Channel Shims (output-channel-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.createOutputChannel` API, which is typically facilitated
 * by an `IExtHostOutputService` on the extension host side. This file provides
 * `ShimOutputService` (acting as `IExtHostOutputService`) and implementations for the
 * returned `vscode.OutputChannel` (`ShimOutputChannelImpl`) and `vscode.LogOutputChannel`
 * (`ShimLogOutputChannelImpl`) interfaces.
 *
 * This system allows extensions to create named output channels that can be displayed
 * in the editor's UI (usually within the "Output" panel in VS Code). All content
 * written to these channels (`append`, `appendLine`, `replace`), as well as lifecycle
 * operations (`clear`, `show`, `hide`, `dispose`), is proxied to a corresponding
 * `MainThreadOutputService` running in the Mountain host process via RPC.
 *
 * Responsibilities:
 * - `ShimOutputService`:
 *   - Implements the `createOutputChannel(name, optionsOrLanguageId?)` factory method,
 *
 *     which is exposed to extensions as `vscode.window.createOutputChannel`.
 *   - When a new channel is requested, it makes an RPC call (`$register`) to the
 *     `MainThreadOutputService` in Mountain to inform it about the new channel,
 *
 *     passing the channel's name, and optionally its language ID or log file URI.
 *   - Instantiates and returns either a `ShimOutputChannelImpl` (for standard text
 *     output channels) or a `ShimLogOutputChannelImpl` (for log-focused channels
 *     that support structured logging with levels).
 * - `ShimOutputChannelImpl` (base for both channel types):
 *   - Implements the public API of `vscode.OutputChannel`.
 *   - Forwards actions like `append()`, `clear()`, `show()`, `hide()`, and `dispose()`
 *     as RPC calls to the `MainThreadOutputService` on Mountain, using the channel's ID.
 * - `ShimLogOutputChannelImpl` (extends `ShimOutputChannelImpl`):
 *   - Implements the public API of `vscode.LogOutputChannel`.
 *   - Additionally handles log level filtering locally for its specific logging methods
 *     (`trace`, `debug`, `info`, `warn`, `error`) before appending the formatted log
 *     message to the channel.
 *   - Manages its `logLevel` property and the `onDidChangeLogLevel` event.
 *   - Notifies the `MainThreadOutputService` via RPC (`$setLogLevel`) if the channel's
 *     log level is changed by the extension.
 *
 * Key Interactions:
 * - `ShimOutputService` is registered with Dependency Injection (DI) in `Cocoon/index.ts`
 *   (e.g., as `IExtHostOutputService`). Its `createOutputChannel` method is then made
 *   available to extensions, typically via `vscode.window.createOutputChannel` through
 *   the main API factory.
 * - All channel operations that affect UI or persistent state (like writing to a log file
 *   if file-backed channels are supported) are proxied to `MainContext.MainThreadOutputService`
 *   on Mountain via RPC.
 * - Uses `BaseCocoonShim` for common utilities such as RPC proxy retrieval, logging,
 *
 *   and argument marshalling (e.g., for `VscodeUri` to `ILocalUriComponents` DTO).
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For IDisposable return types and NOP disposables
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// For URI DTOs used in RPC.
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// VS Code internal LogLevel enum for MainThread RPC, if its values differ from the public API's VscodeApiLogLevel.
import type { LogLevel as VscodeInternalLogLevel } from "vs/platform/log/common/log";
import {
	// Not strictly needed if this service only makes calls, doesn't receive unique ones beyond standard shapes.
	// ExtHostContext,

	// For proxying to MainThreadOutputService on Mountain.
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// Import types from the public 'vscode' API definition.
import {
	// The vscode.LogLevel enum used by LogOutputChannel API.
	LogLevel as VscodeApiLogLevel,
	// For OutputChannel.show() options.
	type ViewColumn,
	type LogOutputChannel as VscodeLogOutputChannel,
	type OutputChannel as VscodeOutputChannel,
	// For file-backed log channels (if options.file is used).
	type Uri as VscodeUri,
	// Not directly used by output channel API itself.
	// type Command as VscodeCommand,
	// Not directly used by output channel API itself.
	// type ThemeColor,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Represents URI components as a Data Transfer Object (DTO) for RPC,
 *
 * particularly if log channels are file-backed and their URIs need to be sent to Mountain.
 * This should align with `VSCodeInternalUriComponents` or a compatible structure
 * produced by `BaseCocoonShim._convertApiArgToInternal`.
 */
interface ILocalUriComponents extends VSCodeInternalUriComponents {
	// $mid is often added by VS Code's marshallers (like `_convertApiArgToInternal`)
	// and used by `vscodeRevive` on the receiving end.
	// Ensure this DTO is compatible with how Mountain receives and processes URIs.
}

/**
 * Defines the RPC interface for the `MainThreadOutputService` expected on Mountain.
 * Method names and parameters must align with Mountain's implementation.
 */
interface MainThreadOutputServiceShape {
	/**
	 * Registers a new output channel with the main thread.
	 * @param name The human-readable name of the channel (e.g., "Git", "My Extension Logs").
	 * @param file Optional: URI (as components DTO) if this is a file-backed log channel.
	 * @param languageId Optional: The language ID to associate with the channel's output for syntax highlighting (e.g., "log", "json").
	 * @param extensionId Optional: The ID of the extension creating the channel (often implicit or derived by MainThread).
	 * @returns A promise resolving to the actual channel ID used by the main thread. This ID might differ from `name`.
	 */
	$register(
		name: string,

		file?: ILocalUriComponents | null,

		languageId?: string | null,

		extensionId?: string,

		// Returns the actual channel ID assigned by the MainThread.
	): Promise<string>;

	$append(channelId: string, value: string): Promise<void>;

	$clear(channelId: string): Promise<void>;

	$replace(channelId: string, value: string): Promise<void>;

	$reveal(
		channelId: string,

		preserveFocus?: boolean,

		viewColumn?: ViewColumn,
	): Promise<void>;

	// Corresponds to the `hide()` API method.
	$close(channelId: string): Promise<void>;

	$dispose(channelId: string): Promise<void>;

	/**
	 * Sets the log level for a `LogOutputChannel` on the main thread.
	 * @param channelId The ID of the log output channel.
	 * @param level The new log level, typically using `VscodeInternalLogLevel` enum values.
	 */
	$setLogLevel?(
		channelId: string,

		level: VscodeInternalLogLevel,
	): Promise<void>;
}

/**
 * Options for `vscode.window.createOutputChannel` as defined in `vscode.d.ts`.
 * It can be a languageId string (which is deprecated), or an options object
 * specifying if it's a log channel and its associated languageId or file URI.
 */
type CreateOutputChannelOptions =
	// Deprecated: languageId string
	| string
	// For LogOutputChannel
	| { log: true; languageId?: string; file?: VscodeUri }

	// For standard OutputChannel (log defaults to false)
	| { log?: false; languageId?: string };

/**
 * Base implementation for an output channel (`vscode.OutputChannel`), handling common
 * RPC proxy interactions and lifecycle management.
 */
class ShimOutputChannelImpl implements VscodeOutputChannel {
	// The ID used for RPC calls. This is crucial for MainThread to identify the channel.
	// It's initially set to the `name` but ideally should be updated to the ID returned by `$register` from MainThread.
	// Made protected for ShimLogOutputChannelImpl to access for $setLogLevel.
	protected _idForRpc: string;

	// The human-readable name displayed in the UI.
	readonly #displayName: string;

	// RPC proxy to MainThreadOutputService.
	#proxy: MainThreadOutputServiceShape | null;

	// Logger instance, made protected for subclass.
	protected _logService?: ILogServiceForShim;

	#isDisposed = false;

	constructor(
		// Initial ID for RPC (e.g., channel name).
		idForRpc: string,

		displayName: string,

		proxy: MainThreadOutputServiceShape | null,

		logService?: ILogServiceForShim,
	) {
		this._idForRpc = idForRpc;

		this.#displayName = displayName;

		this.#proxy = proxy;

		// Use the passed logService
		this._logService = logService;

		this._logShimInternals(
			`Created channel (Display: '${this.#displayName}', RPC ID: '${this._idForRpc}').`,
		);
	}

	// TODO: Add a method like `_setMainThreadId(actualId: string)` that ShimOutputService can call
	// once the `$register` promise resolves, to update `this._idForRpc` to the true ID from MainThread.

	protected _logShimInternals(message: string, ...args: any[]): void {
		this._logService?.debug(
			// Use debug for internal operations of the channel.
			`[OutputChannel][${this.#displayName}(${this._idForRpc})] ${message}`,

			...args,
		);
	}

	protected _logShimError(message: string | Error, ...args: any[]): void {
		const prefix = `[OutputChannel][${this.#displayName}(${this._idForRpc})]`;

		if (this._logService) {
			this._logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,

				...args,
			);
		} else {
			// Fallback to console if no logger
			if (message instanceof Error)
				console.error(
					`${prefix} ${message.message}`,

					message.stack,

					...args,
				);
			else console.error(`${prefix} ${message}`, ...args);
		}
	}

	/**
	 * Validates that the channel is not disposed and that the RPC proxy to MainThread is available.
	 * @returns The RPC proxy instance if valid.
	 * @throws Error if the channel is disposed or the proxy is unavailable.
	 */
	protected _validateAndGetProxy(): MainThreadOutputServiceShape {
		if (this.#isDisposed) {
			const errorMsg = `OutputChannel '${this.#displayName}' (RPC ID: ${this._idForRpc}) has been disposed and cannot be used.`;

			this._logShimError(errorMsg);

			throw new Error(errorMsg);
		}

		if (!this.#proxy) {
			const errorMsg = `RPC proxy for MainThreadOutputService is unavailable for OutputChannel '${this.#displayName}' (RPC ID: ${this._idForRpc}). Output channel operations will fail.`;

			this._logShimError(errorMsg);

			// This is a critical failure for channel operations.
			throw new Error(errorMsg);
		}

		return this.#proxy;
	}

	/** {@inheritDoc vscode.OutputChannel.name} */
	get name(): string {
		return this.#displayName;
	}

	/** {@inheritDoc vscode.OutputChannel.append} */
	append(value: string): void {
		try {
			const proxy = this._validateAndGetProxy();

			// Logging every append can be very verbose. Consider trace level or conditional logging.
			// this._logShimInternals(`append: "${String(value).substring(0, 80)}..."`);

			proxy
				// Ensure value is a string.
				.$append(this._idForRpc, String(value))
				.catch((e) =>
					this._logShimError(
						"Error in $append RPC for channel:",

						refineErrorForShim(e, this._logService, "$append RPC"),
					),
				);
		} catch (e: any) {
			// Error from _validateAndGetProxy
			this._logShimError(
				"Validation failed before $append RPC call:",

				e.message,
			);

			// Depending on desired strictness, could rethrow `e` here to fail the extension's call.
			// For now, log and absorb, as the API is void.
		}
	}

	/** {@inheritDoc vscode.OutputChannel.appendLine} */
	appendLine(value: string): void {
		// Append the value followed by a newline.
		this.append(String(value) + "\n");
	}

	/** {@inheritDoc vscode.OutputChannel.clear} */
	clear(): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`clear() called.`);

			proxy.$clear(this._idForRpc).catch((e) =>
				this._logShimError(
					"Error in $clear RPC for channel:",

					refineErrorForShim(e, this._logService, "$clear RPC"),
				),
			);
		} catch (e: any) {
			this._logShimError(
				"Validation failed before $clear RPC call:",

				e.message,
			);
		}
	}

	/** {@inheritDoc vscode.OutputChannel.replace} */
	replace(value: string): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(
				`replace() called with value (first 80 chars): "${String(value).substring(0, 80)}..."`,
			);

			proxy.$replace(this._idForRpc, String(value)).catch((e) =>
				this._logShimError(
					"Error in $replace RPC for channel:",

					refineErrorForShim(e, this._logService, "$replace RPC"),
				),
			);
		} catch (e: any) {
			this._logShimError(
				"Validation failed before $replace RPC call:",

				e.message,
			);
		}
	}

	/** {@inheritDoc vscode.OutputChannel.show} */
	show(
		columnOrPreserveFocus?: ViewColumn | boolean,

		preserveFocusArgs?: boolean,
	): void {
		try {
			const proxy = this._validateAndGetProxy();

			let targetViewColumn: ViewColumn | undefined;

			let actualPreserveFocus: boolean | undefined;

			// Handle overloaded signature for show()
			if (typeof columnOrPreserveFocus === "boolean") {
				// show(preserveFocus: boolean)
				actualPreserveFocus = columnOrPreserveFocus;
			} else if (typeof columnOrPreserveFocus === "number") {
				// show(column: ViewColumn, preserveFocus?: boolean)
				// ViewColumn is typically a number enum.
				targetViewColumn = columnOrPreserveFocus;

				actualPreserveFocus = preserveFocusArgs;
			} else {
				// show() or show(undefined, preserveFocus?: boolean)
				// preserveFocusArgs might be undefined if called as show().
				actualPreserveFocus = preserveFocusArgs;
			}

			this._logShimInternals(
				`show() called. Target ViewColumn: ${targetViewColumn ?? "default"}, Preserve Focus: ${actualPreserveFocus ?? false}`,
			);

			proxy
				.$reveal(this._idForRpc, actualPreserveFocus, targetViewColumn)
				.catch((e) =>
					this._logShimError(
						"Error in $reveal (show) RPC for channel:",

						refineErrorForShim(e, this._logService, "$reveal RPC"),
					),
				);
		} catch (e: any) {
			this._logShimError(
				"Validation failed before show() RPC call:",

				e.message,
			);
		}
	}

	/** {@inheritDoc vscode.OutputChannel.hide} */
	hide(): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`hide() called.`);

			proxy
				// MainThread's $close corresponds to the hide() API.
				.$close(this._idForRpc)
				.catch((e) =>
					this._logShimError(
						"Error in $close (hide) RPC for channel:",

						refineErrorForShim(e, this._logService, "$close RPC"),
					),
				);
		} catch (e: any) {
			this._logShimError(
				"Validation failed before hide() RPC call:",

				e.message,
			);
		}
	}

	/** {@inheritDoc vscode.OutputChannel.dispose} */
	dispose(): void {
		if (!this.#isDisposed) {
			this._logShimInternals(`dispose() called.`);

			this.#isDisposed = true;

			// Attempt to notify MainThread even if proxy validation might fail (e.g., if proxy itself became null due to other issues).
			this.#proxy?.$dispose(this._idForRpc).catch(
				(
					// Log error if MainThread dispose fails, but don't throw from the dispose() method itself.
					e,
				) =>
					this._logShimError(
						"Error in $dispose RPC call to MainThread for channel:",

						refineErrorForShim(e, this._logService, "$dispose RPC"),
					),
			);

			// Release references to help with garbage collection.
			this.#proxy = null;

			// Use `this._logService` to match property name.
			this._logService = undefined;
		} else {
			this._logShimInternals(
				`dispose() called on already disposed channel. No action taken.`,
			);
		}
	}
}

/**
 * Shim implementation for `vscode.LogOutputChannel`.
 * Extends `ShimOutputChannelImpl` to add log level management (`logLevel` property,
 *
 * `onDidChangeLogLevel` event) and level-specific logging methods (`trace`, `debug`, etc.).
 */
class ShimLogOutputChannelImpl
	extends ShimOutputChannelImpl
	implements VscodeLogOutputChannel
{
	// Use VscodeApiLogLevel (from 'vscode') for the public API.
	#currentLogLevel: VscodeApiLogLevel;

	readonly #onDidChangeLogLevelEmitter: VscodeEmitter<VscodeApiLogLevel>;

	public readonly onDidChangeLogLevel: VscodeEvent<VscodeApiLogLevel>;

	constructor(
		idForRpc: string,

		displayName: string,

		proxy: MainThreadOutputServiceShape | null,

		logService: ILogServiceForShim | undefined,

		// Default log level to Info.
		initialLogLevel: VscodeApiLogLevel = VscodeApiLogLevel.Info,
	) {
		super(idForRpc, displayName, proxy, logService);

		this.#currentLogLevel = initialLogLevel;

		this.#onDidChangeLogLevelEmitter =
			new VscodeEmitter<VscodeApiLogLevel>();

		this.onDidChangeLogLevel = this.#onDidChangeLogLevelEmitter.event;

		this._logShimInternals(
			`Created LogOutputChannel. Initial LogLevel: ${VscodeApiLogLevel[this.#currentLogLevel]}.`,
		);
	}

	/** {@inheritDoc vscode.LogOutputChannel.logLevel} */
	get logLevel(): VscodeApiLogLevel {
		return this.#currentLogLevel;
	}

	/**
	 * Sets the log level for this channel. This change is also propagated to the
	 * MainThread via RPC if a proxy and the `$setLogLevel` method are available.
	 * @param level The new `VscodeApiLogLevel` to set.
	 */
	setLogLevel(level: VscodeApiLogLevel): void {
		// Validate that the provided level is a valid member of the VscodeApiLogLevel enum.
		if (
			!Object.values(VscodeApiLogLevel).includes(
				level as unknown as number,
			)
		) {
			// Cast to unknown then number for enum check
			this._logShimError(
				`Invalid VscodeApiLogLevel value passed to setLogLevel: ${level}. Level not changed.`,
			);

			return;
		}

		if (this.#currentLogLevel !== level) {
			const oldLevel = this.#currentLogLevel;

			this.#currentLogLevel = level;

			this._logShimInternals(
				`LogLevel changed from ${VscodeApiLogLevel[oldLevel]} to ${VscodeApiLogLevel[level]}.`,
			);

			this.#onDidChangeLogLevelEmitter.fire(this.#currentLogLevel);

			// Notify MainThread about the log level change if the proxy supports `$setLogLevel`.
			try {
				// Get proxy; throws if disposed/null.
				const proxy = this._validateAndGetProxy();

				if (proxy.$setLogLevel) {
					// TODO: CRITICAL - Map VscodeApiLogLevel (public API enum, typically 0-5) to VscodeInternalLogLevel
					// (VS Code's internal platform enum, e.g., from vs/platform/log/common/log) if their numeric
					// values or meanings differ. Assuming direct numeric compatibility here is RISKY.
					// For MVP, a direct cast is used, but this needs verification against actual enum values.
					const internalLevelForRpc =
						level as unknown as VscodeInternalLogLevel;

					proxy
						.$setLogLevel(this._idForRpc, internalLevelForRpc)
						.catch((e) =>
							this._logShimError(
								"Error in $setLogLevel RPC call to MainThread:",

								refineErrorForShim(
									e,

									this._logService,

									"$setLogLevel RPC",
								),
							),
						);
				} else {
					this._logShimInternals(
						"MainThreadOutputService proxy does not support $setLogLevel. Level change is local to Cocoon only.",
					);
				}
			} catch (e: any) {
				this._logShimError(
					"Validation failed before $setLogLevel RPC call:",

					e.message,
				);
			}
		}
	}

	/** {@inheritDoc vscode.LogOutputChannel.trace} */
	trace(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Trace) {
			// Consistent uppercase level label
			this._logWithLevel("TRACE", message, ...args);
		}
	}

	/** {@inheritDoc vscode.LogOutputChannel.debug} */
	debug(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Debug) {
			this._logWithLevel("DEBUG", message, ...args);
		}
	}

	/** {@inheritDoc vscode.LogOutputChannel.info} */
	info(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Info) {
			this._logWithLevel("INFO", message, ...args);
		}
	}

	/** {@inheritDoc vscode.LogOutputChannel.warn} */
	warn(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Warning) {
			this._logWithLevel("WARN", message, ...args);
		}
	}

	/** {@inheritDoc vscode.LogOutputChannel.error} */
	error(message: string | Error, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Error) {
			this._logWithLevel("ERROR", message, ...args);
		}
	}

	/**
	 * Helper to format and append a log message with its level label.
	 * @param levelLabel The string label for the log level (e.g., "TRACE", "INFO").
	 * @param message The main log message or an Error object.
	 * @param args Additional arguments to log.
	 */
	private _logWithLevel(
		levelLabel: string,

		message: string | Error,

		...args: any[]
	): void {
		let fullMessage =
			message instanceof Error
				? // Include stack for errors
					`${message.message}${message.stack ? `\n${message.stack}` : ""}`
				: message;

		const formattedArgs = args
			.map((arg) =>
				typeof arg === "object" && arg !== null
					? JSON.stringify(arg)
					: String(arg),
			)
			.join(" ");

		if (args.length > 0) {
			fullMessage += ` ${formattedArgs}`;
		}

		// Prepend the log level (e.g., "[INFO]") to the message before appending to the channel.
		this.appendLine(`[${levelLabel}] ${fullMessage}`);
	}

	/** {@inheritDoc vscode.OutputChannel.dispose} */
	override dispose(): void {
		// Call base class dispose.
		super.dispose();

		// Dispose the log level change emitter.
		this.#onDidChangeLogLevelEmitter.dispose();
	}
}

/**
 * Defines the interface for the ExtHost service that creates output channels.
 * This aligns with VS Code's internal `IExtHostOutputService` interface.
 */
export interface IExtHostOutputServiceShape {
	// For DI.
	readonly _serviceBrand: undefined;

	createOutputChannel(name: string): VscodeOutputChannel;

	createOutputChannel(
		name: string,

		options: { log: true; languageId?: string; file?: VscodeUri },
	): VscodeLogOutputChannel;

	// Deprecated form
	createOutputChannel(name: string, languageId: string): VscodeOutputChannel;

	// Optional RPC methods that might be called by MainThread if this service itself were an RPC target
	// for more complex lifecycle management (not typical for a simple factory service).
	// $setVisible?(channelId: string, visible: boolean): void;

	// $setLogLevel?(channelId: string, level: VscodeInternalLogLevel): void;
}

/**
 * Cocoon's implementation of `IExtHostOutputService`.
 * It acts as a factory for creating `OutputChannel` and `LogOutputChannel` instances,
 *
 * coordinating their registration with the MainThread (Mountain) via RPC.
 */
export class ShimOutputService
	extends BaseCocoonShim
	implements IExtHostOutputServiceShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadOutputProxy: MainThreadOutputServiceShape | null = null;

	// TODO: Consider maintaining a map of active channels (`Map<channelId, ShimOutputChannelImpl | ShimLogOutputChannelImpl>`)
	// if this service needs to manage or interact with created channels directly (e.g., for RPC calls like `$setVisible`).
	// For now, channels manage their own lifecycle after creation.

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		// Service Identifier for logging
		super("ExtHostOutputService", rpcService, logService);

		// Use Info for major lifecycle events
		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadOutputProxy = this._getProxy(
				MainContext.MainThreadOutputService as ProxyIdentifier<MainThreadOutputServiceShape>,
			);
		}

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"Failed to obtain MainThreadOutputService RPC proxy! Output channel creation and functionality " +
					"will be severely impaired or non-functional. This is a critical issue for extensions relying on output channels.",
			);
		}
	}

	/** {@inheritDoc vscode.window.createOutputChannel} (Overload 1: Standard OutputChannel) */
	public createOutputChannel(name: string): VscodeOutputChannel;

	/** {@inheritDoc vscode.window.createOutputChannel} (Overload 2: LogOutputChannel) */
	public createOutputChannel(
		name: string,

		options: { log: true; languageId?: string; file?: VscodeUri },
	): VscodeLogOutputChannel;

	/** {@inheritDoc vscode.window.createOutputChannel} (Overload 3: Deprecated, standard channel with languageId) */
	public createOutputChannel(
		name: string,

		languageId: string,
	): VscodeOutputChannel;

	/** Combined implementation for `createOutputChannel` overloads. */
	public createOutputChannel(
		name: string,

		optionsOrLangId?: CreateOutputChannelOptions,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		// Ensure name is a string and trim whitespace.
		name = String(name).trim();

		if (!name) {
			throw new Error(
				"Output channel name cannot be empty or only whitespace.",
			);
		}

		let isLogChannel = false;

		let languageId: string | undefined = undefined;

		let fileUriForLog: VscodeUri | undefined = undefined;

		if (typeof optionsOrLangId === "string") {
			// Deprecated signature: createOutputChannel(name, languageId: string)
			languageId = optionsOrLangId;

			this._logWarn(
				`Deprecated createOutputChannel(name, languageId) signature used for channel '${name}'. Consider using options object.`,
			);
		} else if (
			typeof optionsOrLangId === "object" &&
			optionsOrLangId !== null
		) {
			// Modern signature: createOutputChannel(name, options: {...})
			isLogChannel = optionsOrLangId.log === true;

			languageId = optionsOrLangId.languageId;

			if (isLogChannel && "file" in optionsOrLangId) {
				// `file` option is specific to log channels
				fileUriForLog = (optionsOrLangId as { file?: VscodeUri }).file;

				if (fileUriForLog && !(fileUriForLog instanceof VscodeUri)) {
					this._logError(
						`Invalid 'file' option for LogOutputChannel '${name}': not a vscode.Uri instance. Ignoring file option.`,

						fileUriForLog,
					);

					fileUriForLog = undefined;
				}
			}
		}

		// If optionsOrLangId is undefined, it's a standard channel with no language ID.

		this._logInfo(
			`API createOutputChannel called: Name='${name}', IsLogChannel=${isLogChannel}, ` +
				`LanguageId='${languageId ?? "N/A"}', File='${fileUriForLog?.toString() ?? "N/A"}'`,
		);

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				`RPC proxy for MainThreadOutputService is unavailable. Cannot register new output channel '${name}'. ` +
					`Returning a NOP (No-Operation) channel. This channel will not display any output.`,
			);

			// Fallback to a NOP channel.
			return this._createNopChannel(name, isLogChannel);
		}

		// The channel ID used for RPC calls by the ShimOutputChannelImpl instance.
		// VS Code's `$register` RPC method typically returns the *actual* channel ID used by the main thread.
		// This actual ID might differ from the `name` (e.g., if MainThread performs normalization or adds prefixes).
		//
		// TODO: Robust ID Management:
		// Ideally, `createOutputChannel` should be `async` or the channel instance should internally
		// await the result of `$register` to get the `mainThreadActualId`. Then, all subsequent RPC calls
		// from the channel instance (`$append`, `$clear`, etc.) should use this `mainThreadActualId`.
		// For this MVP, we use the `name` as `idForRpcUsedByShim` and log the discrepancy if any.
		// This might lead to issues if `name` is not unique or suitable as an ID on MainThread.
		const idForRpcUsedByShim = name;

		let fileUriDtoForRpc: ILocalUriComponents | null = null;

		if (fileUriForLog instanceof VscodeUri) {
			// Convert VscodeUri (API type) to ILocalUriComponents DTO for RPC.
			fileUriDtoForRpc = this._convertApiArgToInternal(
				fileUriForLog,
			) as ILocalUriComponents | null;

			if (!fileUriDtoForRpc) {
				this._logWarn(
					`Failed to marshal 'file' URI for LogOutputChannel '${name}'. Log will not be file-backed via this URI. URI:`,

					fileUriForLog,
				);
			}
		}

		this.#mainThreadOutputProxy
			.$register(
				name,

				fileUriDtoForRpc,

				languageId /*, extensionId if needed */,
			)
			.then((mainThreadActualId) => {
				this._logDebug(
					`Output channel '${name}' successfully registered on MainThread. ` +
						`MainThread assigned ID: '${mainThreadActualId}'. Shim currently uses '${idForRpcUsedByShim}' for its RPC calls. ` +
						(mainThreadActualId !== idForRpcUsedByShim
							? "WARNING: These IDs differ; consider updating shim's RPC ID."
							: "IDs match."),
				);

				// If mainThreadActualId differs, the created channel instance's `_idForRpc` should ideally be updated.
				// This requires either making createOutputChannel async or having a setter on ShimOutputChannelImpl.
			})
			.catch((err: any) => {
				this._logError(
					`Failed to register output channel '${name}' on MainThread via RPC $register:`,

					refineErrorForShim(err, this._logService, "$register RPC"),
				);

				// If registration fails, the channel instance created below will likely make failing RPC calls.
				// The extension will not get an error from `createOutputChannel` itself, but channel operations will fail.
			});

		if (isLogChannel) {
			return new ShimLogOutputChannelImpl(
				idForRpcUsedByShim,

				name,

				this.#mainThreadOutputProxy,

				this._logService,
			);
		} else {
			return new ShimOutputChannelImpl(
				idForRpcUsedByShim,

				name,

				this.#mainThreadOutputProxy,

				this._logService,
			);
		}
	}

	/** Creates a NOP (No-Operation) channel for fallback when RPC proxy is unavailable. */
	private _createNopChannel(
		name: string,

		isLogChannel: boolean,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		this._logWarn(
			`Creating NOP (No-Operation) ${isLogChannel ? "Log" : ""}OutputChannel: Name='${name}' due to unavailable RPC proxy. This channel will not function.`,
		);

		const nopBaseChannel: VscodeOutputChannel = {
			name: name,

			append: () => {
				this._logWarn(`NOP ${name}.append called.`);
			},

			appendLine: () => {
				this._logWarn(`NOP ${name}.appendLine called.`);
			},

			clear: () => {
				this._logWarn(`NOP ${name}.clear called.`);
			},

			replace: () => {
				this._logWarn(`NOP ${name}.replace called.`);
			},

			show: () => {
				this._logWarn(`NOP ${name}.show called.`);
			},

			hide: () => {
				this._logWarn(`NOP ${name}.hide called.`);
			},

			dispose: () => {
				this._logWarn(`NOP ${name}.dispose called.`);
			},
		};

		if (isLogChannel) {
			return Object.freeze({
				// Ensure NOP object is immutable
				...nopBaseChannel,

				// Sensible default for a NOP log channel
				logLevel: VscodeApiLogLevel.Off,

				// NOP event
				onDidChangeLogLevel: VscodeEvent.None,

				trace: () => {
					this._logWarn(`NOP ${name}.trace called.`);
				},

				debug: () => {
					this._logWarn(`NOP ${name}.debug called.`);
				},

				info: () => {
					this._logWarn(`NOP ${name}.info called.`);
				},

				warn: () => {
					this._logWarn(`NOP ${name}.warn called.`);
				},

				error: () => {
					this._logWarn(`NOP ${name}.error called.`);
				},

				setLogLevel: () => {
					this._logWarn(`NOP ${name}.setLogLevel called.`);

					// NOP setter
				},
			}) as VscodeLogOutputChannel;
		}

		return Object.freeze(nopBaseChannel);
	}

	/**
	 * Disposes of resources held by this service.
	 */
	public override dispose(): void {
		// BaseCocoonShim dispose
		super.dispose();

		// If #activeChannels map were used, clear and dispose its contents here.
		this._logInfo("Disposed.");
	}

	// --- Potential RPC methods called BY MainThread (if this service were an RPC target for channel state updates) ---
	// Example: If MainThread needed to inform ExtHost about channel visibility changes.
	// public $setVisible(channelId: string, visible: boolean): void {

	//     this._logDebug(`RPC $setVisible called from MainThread for channel '${channelId}' to visible=${visible}`);

	// TODO: If #activeChannels map is implemented:
	//
	// const channel = this.#activeChannels.get(channelId);

	//
	// if (channel) {

	//
	//    channel._someInternalMethodToUpdateAndNotifyVisibility(visible);

	//
	// } else {

	//
	//    this._logWarn(`Received $setVisible for unknown or disposed channelId: ${channelId}`);

	//
	// }

	//
	// }

	// Example: If MainThread needed to push log level changes to a LogOutputChannel.
	// public $setLogLevel(channelId: string, level: VscodeInternalLogLevel): void {

	//     this._logDebug(`RPC $setLogLevel called from MainThread for channel '${channelId}' to level=${level}`);

	// TODO: If #activeChannels map is implemented:
	//
	// const channel = this.#activeChannels.get(channelId);

	//
	// if (channel instanceof ShimLogOutputChannelImpl) {

	//
	//    const apiLevel = mapInternalToApiLogLevel(level); // Implement this mapping
	//
	//    channel.setLogLevel(apiLevel); // This would fire onDidChangeLogLevel if changed
	//
	// } else {

	//
	//    this._logWarn(`Received $setLogLevel for non-log or unknown channelId: ${channelId}`);

	//
	// }

	//
	// }
}
