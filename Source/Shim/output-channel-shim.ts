/*---------------------------------------------------------------------------------------------
 * Cocoon Output Channel Shims (output-channel-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.createOutputChannel` API (provided by an instance of
 * `ShimOutputService` which acts like `IExtHostOutputService`) and the returned
 * `vscode.OutputChannel` and `vscode.LogOutputChannel` interfaces.
 *
 * This allows extensions to create named output channels that can be displayed in the
 * editor's UI (typically in the Output panel). All content written to these channels
 * is proxied to the Mountain host process for display.
 *
 * Responsibilities:
 * - `ShimOutputService`:
 *   - Implements `createOutputChannel(name, options?)`, which is the factory method
 *     exposed as `vscode.window.createOutputChannel`.
 *   - When a channel is created, it makes an RPC call (`$register`) to the
 *     `MainThreadOutputService` in Mountain to inform it about the new channel.
 *   - Instantiates and returns either a `ShimOutputChannelImpl` (for standard channels)
 *     or a `ShimLogOutputChannelImpl` (for log-focused channels) facade.
 * - `ShimOutputChannelImpl` / `ShimLogOutputChannelImpl`:
 *   - Implement the public API of `vscode.OutputChannel` / `vscode.LogOutputChannel`.
 *   - Actions like `append`, `clear`, `show`, `hide`, `dispose` are forwarded as RPC
 *     calls to the `MainThreadOutputService` on Mountain.
 *   - `ShimLogOutputChannelImpl` additionally handles log level filtering locally for
 *     its `trace`, `debug`, `info`, `warn`, `error` methods before appending to the channel,
 * 
 *     and manages its `logLevel` property and `onDidChangeLogLevel` event.
 *
 * Key Interactions:
 * - `ShimOutputService` is registered with DI in `Cocoon/index.ts` and provides the
 *   `vscode.window.createOutputChannel` functionality via the API factory.
 * - All channel operations that affect UI or persistent state are proxied to
 *   `MainContext.MainThreadOutputService` on Mountain via RPC.
 * - Uses `BaseCocoonShim` for common utilities like RPC proxy retrieval and logging.
 *

 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// IDisposable for return types
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// VS Code internal LogLevel enum for MainThread RPC, if different from API's LogLevel
import type { LogLevel as VscodeInternalLogLevel } from "vs/platform/log/common/log";
import {
	// For registering this service if it receives RPC calls
	ExtHostContext,
	// For proxying to MainThreadOutputService
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// Import types from the public 'vscode' API
import {
	// The vscode.LogLevel enum used by LogOutputChannel API
	LogLevel as VscodeApiLogLevel,
	// For StatusBarItem.color
	type ThemeColor,
	// For show() options
	type ViewColumn,
	// For StatusBarItem.command (though not directly used here, good for type consistency)
	type Command as VscodeCommand,
	type LogOutputChannel as VscodeLogOutputChannel,
	type OutputChannel as VscodeOutputChannel,
	// For file-backed log channels (future)
	type Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	// Use the more specific refineError
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Represents URI components for RPC, particularly if log channels are file-backed.
 * Should align with `VSCodeInternalUriComponents` or a compatible DTO structure.
 */
interface ILocalUriComponents {
	scheme: string;

	path: string;

	authority?: string;

	query?: string;

	fragment?: string;

	// MarshalledId.Uri or UriSimple often used
	$mid?: number;
}

/**
 * Defines the RPC interface for the `MainThreadOutputService` expected on Mountain.
 */
interface MainThreadOutputServiceShape {
	/**
	 * Registers a new output channel with the main thread.
	 * @param name The human-readable name of the channel.
	 * @param file URI (as components) if this is a file-backed log channel (optional).
	 * @param languageId The language ID to associate for syntax highlighting (optional).
	 * @param extensionId The ID of the extension creating the channel (optional, often implicit).
	 * @returns A promise resolving to the actual channel ID used by the main thread.
	 */
	$register(
		name: string,

		file?: ILocalUriComponents | null,

		languageId?: string | null,

		extensionId?: string,

		// Returns actual channel ID
	): Promise<string>;

	$append(channelId: string, value: string): Promise<void>;

	$clear(channelId: string): Promise<void>;

	$replace(channelId: string, value: string): Promise<void>;

	$reveal(
		channelId: string,

		preserveFocus?: boolean,

		viewColumn?: ViewColumn,
	): Promise<void>;

	// Corresponds to hide()
	$close(channelId: string): Promise<void>;

	$dispose(channelId: string): Promise<void>;

	$setLogLevel?(
		channelId: string,

		level: VscodeInternalLogLevel,

		// For LogOutputChannel
	): Promise<void>;
}

/**
 * Options for `createOutputChannel` as defined in `vscode.d.ts`.
 * Can be a languageId string (deprecated), or an options object.
 */
type CreateOutputChannelOptions =
	| string
	| { log: true; languageId?: string; file?: VscodeUri }
	| { log?: false; languageId?: string };

/**
 * Base implementation for an output channel, handling common RPC proxy interactions.
 */
class ShimOutputChannelImpl implements VscodeOutputChannel {
	// The ID used for RPC calls. This might be the 'name' or an ID returned by MainThread upon registration.
	// Made protected for ShimLogOutputChannelImpl to access if needed for $setLogLevel
	readonly _idForRpc: string;

	// The human-readable name.
	readonly #displayName: string;

	#proxy: MainThreadOutputServiceShape | null;

	#logService?: ILogServiceForShim;

	#isDisposed = false;

	constructor(
		idForRpc: string,

		displayName: string,

		proxy: MainThreadOutputServiceShape | null,

		logService?: ILogServiceForShim,
	) {
		this._idForRpc = idForRpc;

		this.#displayName = displayName;

		this.#proxy = proxy;

		this.#logService = logService;

		this._logShimInternals(`Created channel.`);
	}

	protected _logShimInternals(message: string, ...args: any[]): void {
		// Changed to protected
		this.#logService?.trace(
			`[OutputChannel][${this.#displayName}(${this._idForRpc})] ${message}`,

			...args,
		);
	}

	protected _logShimError(message: string | Error, ...args: any[]): void {
		// Changed to protected
		const prefix = `[OutputChannel][${this.#displayName}(${this._idForRpc})]`;

		if (this.#logService) {
			this.#logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,

				...args,
			);
		} else {
			if (message instanceof Error)
				console.error(
					`${prefix} ${message.message}`,

					message.stack,

					...args,
				);
			else console.error(`${prefix} ${message}`, ...args);
		}
	}

	/** Validates that the channel is not disposed and the RPC proxy is available. */
	protected _validateAndGetProxy(): MainThreadOutputServiceShape {
		// Changed to protected
		if (this.#isDisposed) {
			throw new Error(
				`OutputChannel '${this.#displayName}' (ID: ${this._idForRpc}) has been disposed.`,
			);
		}

		if (!this.#proxy) {
			// This scenario implies a critical failure during setup if proxy was expected.
			this._logShimError(
				"RPC proxy is unavailable. Output channel operations will fail.",
			);

			throw new Error(
				`OutputChannel '${this.#displayName}' (ID: ${this._idForRpc}) RPC proxy is unavailable.`,
			);
		}

		return this.#proxy;
	}

	get name(): string {
		return this.#displayName;
	}

	append(value: string): void {
		try {
			const proxy = this._validateAndGetProxy();

			// Logging every append can be too verbose, consider trace or conditional logging.
			// this._logShimInternals(`append: "${String(value).substring(0, 50)}..."`);

			proxy.$append(this._idForRpc, String(value)).catch((e) =>
				this._logShimError(
					"Error in $append RPC:",

					refineErrorForShim(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("Validation failed before append RPC call:", e);

			// Depending on desired strictness, could rethrow `e` here.
		}
	}

	appendLine(value: string): void {
		this.append(String(value) + "\n");
	}

	clear(): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`clear()`);

			proxy.$clear(this._idForRpc).catch((e) =>
				this._logShimError(
					"Error in $clear RPC:",

					refineErrorForShim(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("Validation failed before clear RPC call:", e);
		}
	}

	replace(value: string): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(
				`replace(): "${String(value).substring(0, 50)}..."`,
			);

			proxy.$replace(this._idForRpc, String(value)).catch((e) =>
				this._logShimError(
					"Error in $replace RPC:",

					refineErrorForShim(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("Validation failed before replace RPC call:", e);
		}
	}

	show(
		columnOrPreserveFocus?: ViewColumn | boolean,

		preserveFocusArgs?: boolean,
	): void {
		try {
			const proxy = this._validateAndGetProxy();

			let targetViewColumn: ViewColumn | undefined;

			let actualPreserveFocus: boolean | undefined;

			if (typeof columnOrPreserveFocus === "boolean") {
				actualPreserveFocus = columnOrPreserveFocus;
			} else if (typeof columnOrPreserveFocus === "number") {
				// ViewColumn is an enum, typically number
				targetViewColumn = columnOrPreserveFocus;

				actualPreserveFocus = preserveFocusArgs;
			} else {
				// columnOrPreserveFocus is undefined
				// This would be the only preserveFocus if first arg is undefined
				actualPreserveFocus = preserveFocusArgs;
			}

			this._logShimInternals(
				`show(): Column=${targetViewColumn}, PreserveFocus=${actualPreserveFocus}`,
			);

			proxy
				.$reveal(this._idForRpc, actualPreserveFocus, targetViewColumn)
				.catch((e) =>
					this._logShimError(
						"Error in $reveal RPC:",

						refineErrorForShim(e, this.#logService),
					),
				);
		} catch (e: any) {
			this._logShimError("Validation failed before show RPC call:", e);
		}
	}

	hide(): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`hide()`);

			proxy.$close(this._idForRpc).catch(
				(
					// $close corresponds to hide
					e,
				) =>
					this._logShimError(
						"Error in $close (hide) RPC:",

						refineErrorForShim(e, this.#logService),
					),
			);
		} catch (e: any) {
			this._logShimError("Validation failed before hide RPC call:", e);
		}
	}

	dispose(): void {
		if (!this.#isDisposed) {
			this._logShimInternals(`dispose()`);

			this.#isDisposed = true;

			// Attempt to notify MainThread even if proxy validation might fail (e.g., if proxy became null).
			this.#proxy?.$dispose(this._idForRpc).catch((e) =>
				// Log error if dispose fails, but don't throw from dispose().
				this._logShimError(
					"Error in $dispose RPC:",

					refineErrorForShim(e, this.#logService),
				),
			);

			// Release references
			this.#proxy = null;

			this.#logService = undefined;
		}
	}
}

/**
 * Shim implementation for `vscode.LogOutputChannel`.
 * Extends `ShimOutputChannelImpl` to add log level management and level-specific logging methods.
 */
class ShimLogOutputChannelImpl
	extends ShimOutputChannelImpl
	implements VscodeLogOutputChannel
{
	// Use VscodeApiLogLevel from 'vscode'
	#currentLogLevel: VscodeApiLogLevel;

	readonly #onDidChangeLogLevelEmitter: VscodeEmitter<VscodeApiLogLevel>;

	public readonly onDidChangeLogLevel: VscodeEvent<VscodeApiLogLevel>;

	constructor(
		idForRpc: string,

		displayName: string,

		proxy: MainThreadOutputServiceShape | null,

		logService: ILogServiceForShim | undefined,

		// Default to Info from vscode.LogLevel
		initialLogLevel: VscodeApiLogLevel = VscodeApiLogLevel.Info,
	) {
		super(idForRpc, displayName, proxy, logService);

		this.#currentLogLevel = initialLogLevel;

		this.#onDidChangeLogLevelEmitter =
			new VscodeEmitter<VscodeApiLogLevel>();

		this.onDidChangeLogLevel = this.#onDidChangeLogLevelEmitter.event;

		this._logShimInternals(
			`Created LogOutputChannel. Initial LogLevel: ${VscodeApiLogLevel[this.#currentLogLevel]}`,
		);
	}

	get logLevel(): VscodeApiLogLevel {
		return this.#currentLogLevel;
	}

	setLogLevel(level: VscodeApiLogLevel): void {
		if (!Object.values(VscodeApiLogLevel).includes(level)) {
			this._logShimError(
				`Invalid VscodeApiLogLevel value passed to setLogLevel: ${level}`,
			);

			return;
		}

		if (this.#currentLogLevel !== level) {
			const oldLevel = this.#currentLogLevel;

			this.#currentLogLevel = level;

			this._logShimInternals(
				`LogLevel changed from ${VscodeApiLogLevel[oldLevel]} to ${VscodeApiLogLevel[level]}`,
			);

			this.#onDidChangeLogLevelEmitter.fire(this.#currentLogLevel);

			// Notify MainThread if $setLogLevel is supported by the proxy
			// Get proxy, will throw if disposed/null
			const proxy = this._validateAndGetProxy();

			if (proxy?.$setLogLevel) {
				// Map VscodeApiLogLevel (0-5 typically) to VscodeInternalLogLevel if they differ.
				// Assuming direct mapping for simplicity, but this needs verification.
				// Example: if VscodeApiLogLevel.Error (numeric value) matches VscodeInternalLogLevel.Error.
				// If values differ, a switch/map is needed.
				const internalLevel =
					// This cast is risky if enums differ.
					level as unknown as VscodeInternalLogLevel;

				proxy.$setLogLevel(this._idForRpc, internalLevel).catch((e) =>
					this._logShimError(
						"Error in $setLogLevel RPC:",

						refineErrorForShim(
							e,

							this["_logService"] as
								| ILogServiceForShim
								| undefined,
						),
					),
				);
			}
		}
	}

	trace(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Trace)
			this._logWithLevel("Trace", message, ...args);
	}

	debug(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Debug)
			this._logWithLevel("Debug", message, ...args);
	}

	info(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Info)
			this._logWithLevel("Info", message, ...args);
	}

	warn(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Warning)
			this._logWithLevel("Warn", message, ...args);
	}

	error(message: string | Error, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Error)
			this._logWithLevel("Error", message, ...args);
	}

	private _logWithLevel(
		levelLabel: string,

		message: string | Error,

		...args: any[]
	): void {
		let fullMessage =
			message instanceof Error
				? `${message.message}${message.stack ? `\n${message.stack}` : ""}`
				: message;

		const formattedArgs = args
			.map((arg) =>
				typeof arg === "object" ? JSON.stringify(arg) : String(arg),
			)
			.join(" ");

		if (args.length > 0) {
			fullMessage += ` ${formattedArgs}`;
		}

		// Prepend the log level to the message before appending to the channel.
		this.appendLine(`[${levelLabel}] ${fullMessage}`);
	}

	override dispose(): void {
		super.dispose();

		this.#onDidChangeLogLevelEmitter.dispose();
	}
}

/**
 * Defines the interface for the ExtHost service that creates output channels.
 * Aligns with VS Code's `IExtHostOutputService`.
 */
export interface IExtHostOutputServiceShape {
	readonly _serviceBrand: undefined;

	createOutputChannel(name: string): VscodeOutputChannel;

	createOutputChannel(
		name: string,

		options: { log: true; languageId?: string; file?: VscodeUri },
	): VscodeLogOutputChannel;

	// Deprecated form
	createOutputChannel(name: string, languageId: string): VscodeOutputChannel;

	// Optional RPC methods called by MainThread:
	// $setVisible?(channelId: string, visible: boolean): void;

	// $setLogLevel?(channelId: string, level: VscodeInternalLogLevel): void;
}

/**
 * Cocoon's implementation of `IExtHostOutputService`.
 * It acts as a factory for creating `OutputChannel` and `LogOutputChannel` instances.
 */
export class ShimOutputService
	extends BaseCocoonShim
	implements IExtHostOutputServiceShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadOutputProxy: MainThreadOutputServiceShape | null = null;

	// TODO: Consider maintaining a map of active channels if needed for internal management (e.g., for $setVisible).
	// readonly #activeChannels = new Map<string, ShimOutputChannelImpl | ShimLogOutputChannelImpl>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		// Service Identifier for logging
		super("ExtHostOutputService", rpcService, logService);

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadOutputProxy = this._getProxy(
				MainContext.MainThreadOutputService as ProxyIdentifier<MainThreadOutputServiceShape>,
			);
		}

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"Failed to get MainThreadOutputService proxy! Output channels will be impaired or non-functional.",
			);
		}
	}

	public createOutputChannel(name: string): VscodeOutputChannel;

	public createOutputChannel(
		name: string,

		options: { log: true; languageId?: string; file?: VscodeUri },
	): VscodeLogOutputChannel;

	public createOutputChannel(
		name: string,

		languageId: string, // Deprecated form
	): VscodeOutputChannel;

	public createOutputChannel(
		name: string,

		optionsOrLangId?: CreateOutputChannelOptions,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		name = String(name).trim();

		if (!name) throw new Error("Output channel name cannot be empty.");

		let isLogChannel = false;

		let languageId: string | undefined = undefined;

		let fileUriForLog: VscodeUri | undefined = undefined;

		if (typeof optionsOrLangId === "string") {
			// Deprecated: createOutputChannel(name, languageId)
			languageId = optionsOrLangId;
		} else if (
			typeof optionsOrLangId === "object" &&
			optionsOrLangId !== null
		) {
			isLogChannel = optionsOrLangId.log === true;

			languageId = optionsOrLangId.languageId;

			if (isLogChannel && "file" in optionsOrLangId) {
				fileUriForLog = (optionsOrLangId as { file?: VscodeUri }).file;
			}
		}

		this._log(
			`createOutputChannel: Name='${name}', IsLogChannel=${isLogChannel}, LanguageId='${languageId}', File='${fileUriForLog?.toString() ?? "N/A"}'`,
		);

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"RPC proxy for MainThreadOutputService unavailable. Returning a NOP OutputChannel.",
			);

			return this._createNopChannel(name, isLogChannel);
		}

		// The channelIdForRpc is used by the ShimOutputChannelImpl to communicate.
		// VS Code's $register typically returns the *actual* ID used by the main thread.
		// For this shim, we'll use the `name` as the initial `idForRpc` and log the ID from $register.
		// A more robust shim might await $register and use the returned ID for the channel instance.
		// Could be an interim ID
		const idForRpcUsedByShim = name;

		let fileUriDto: ILocalUriComponents | null = null;

		if (fileUriForLog instanceof VscodeUri) {
			fileUriDto = this._convertApiArgToInternal(
				fileUriForLog,
			) as ILocalUriComponents;
		}

		this.#mainThreadOutputProxy
			.$register(
				name,

				fileUriDto,

				languageId /*, extensionId if needed */,
			)
			.then((mainThreadActualId) => {
				this._log(
					`Channel '${name}' registered on MainThread with actual ID: '${mainThreadActualId}'. Shim uses '${idForRpcUsedByShim}' for RPC. Consider aligning if different.`,
				);

				// If mainThreadActualId differs and is essential for subsequent RPC calls,

				// the ShimOutputChannelImpl instance would ideally use mainThreadActualId.
				// For now, this shim assumes idForRpcUsedByShim (which is `name`) is sufficient.
			})
			.catch((err: any) => {
				this._logError(
					`Failed to register output channel '${name}' on MainThread:`,

					refineErrorForShim(err, this._logService),
				);

				// If registration fails, the channel created below will make failing RPC calls.
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

	private _createNopChannel(
		name: string,

		isLogChannel: boolean,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		const nopBase: VscodeOutputChannel = {
			name: name,

			append: () => {},

			appendLine: () => {},

			clear: () => {},

			replace: () => {},

			show: () => {},

			hide: () => {},

			dispose: () => {},
		};

		if (isLogChannel) {
			return {
				...nopBase,

				// Use API LogLevel
				logLevel: VscodeApiLogLevel.Off,

				onDidChangeLogLevel: VscodeEvent.None,

				trace: () => {},

				debug: () => {},

				info: () => {},

				warn: () => {},

				error: () => {},

				// NOP for setLogLevel on a NOP channel
				setLogLevel: () => {},
			} as VscodeLogOutputChannel;
		}

		return nopBase;
	}

	// --- RPC methods called BY MainThread (if any for this service, e.g., to update visibility) ---
	// public $setVisible(channelId: string, visible: boolean): void {

	//     this._log(`RPC $setVisible called for channel '${channelId}' to visible=${visible}`);

	// Requires #activeChannels map
	//     const channel = this.#activeChannels.get(channelId);

	// channel?._someInternalMethodToUpdateVisibility(visible); // Internal method on ShimOutputChannelImpl
	//
	// }

	// public $setLogLevel(channelId: string, level: VscodeInternalLogLevel): void {

	//     this._log(`RPC $setLogLevel called for channel '${channelId}' to level=${level}`);

	//     const channel = this.#activeChannels.get(channelId);

	//     if (channel instanceof ShimLogOutputChannelImpl) {

	// Map VscodeInternalLogLevel to VscodeApiLogLevel if they differ
	//
	//         channel.setLogLevel(level as unknown as VscodeApiLogLevel);

	//     }

	// }
}
