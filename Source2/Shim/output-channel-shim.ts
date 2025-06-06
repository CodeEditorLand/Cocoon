/*---------------------------------------------------------------------------------------------
 * Cocoon Output Channel Shims 
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.createOutputChannel` API, which is typically facilitated
 * by an `IExtHostOutputService` on the extension host side. This file provides
 * `ShimOutputService` (acting as `IExtHostOutputService`) and implementations for the
 * returned `vscode.OutputChannel` (`ShimOutputChannelImpl`) and `vscode.LogOutputChannel`
 * (`ShimLogOutputChannelImpl`) interfaces.
 *
 * This system allows extensions to create named output channels that can be displayed
 * in the editor's UI. All content written to these channels (`append`, `appendLine`, `replace`),
 * as well as lifecycle operations (`clear`, `show`, `hide`, `dispose`), is proxied to a
 * corresponding `MainThreadOutputService` running in the Mountain host process via RPC.
 *
 * Responsibilities:
 * - `ShimOutputService`:
 *   - Implements `createOutputChannel(name, optionsOrLanguageId?)`.
 *   - When a new channel is requested, it makes an RPC call (`$register`) to Mountain,
 *     passing the channel's name, and optionally its language ID or log file URI.
 *   - Updates the created channel instance with the actual ID received from Mountain.
 *   - Instantiates `ShimOutputChannelImpl` or `ShimLogOutputChannelImpl`.
 * - `ShimOutputChannelImpl`: Implements `vscode.OutputChannel`, proxies actions to Mountain.
 * - `ShimLogOutputChannelImpl`: Implements `vscode.LogOutputChannel`, adds local log level
 *   filtering and proxies level changes to Mountain.
 *
 * Key Interactions:
 * - `ShimOutputService` is registered with DI. Its `createOutputChannel` is exposed via `vscode.window`.
 * - All channel operations are proxied to `MainContext.MainThreadOutputService` on Mountain via RPC.
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// VS Code internal LogLevel enum for MainThread RPC
import { LogLevel as VscodePlatformLogLevel } from "vs/platform/log/common/log";
// RPC Contexts for MainThread proxy
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// API types from 'vscode' (ensure this path resolves to Cocoon's 'vscode' shim)
import {
	ViewColumn, // For OutputChannel.show() options
	LogLevel as VscodeApiLogLevel, // The vscode.LogLevel enum used by LogOutputChannel API
	type LogOutputChannel as VscodeLogOutputChannel,
	type OutputChannel as VscodeOutputChannel,
	type Uri as VscodeUri, // For file-backed log channels
} from "vscode";

import {
	BaseCocoonShim,
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
interface ILocalUriComponents extends VSCodeInternalUriComponents {}

/**
 * Defines the RPC interface for the `MainThreadOutputService` expected on Mountain.
 */
interface MainThreadOutputServiceShape {
	$register(
		name: string,
		file?: ILocalUriComponents | null, // URI DTO for file-backed log channel
		languageId?: string | null,
		// extensionId?: string, // Removed from first version's $register signature
	): Promise<string>; // Returns actual channel ID used by MainThread
	$append(channelId: string, value: string): Promise<void>;
	$clear(channelId: string): Promise<void>;
	$replace(channelId: string, value: string): Promise<void>;
	$reveal(
		channelId: string,
		preserveFocus?: boolean,
		viewColumn?: ViewColumn,
	): Promise<void>;
	$close(channelId: string): Promise<void>; // Corresponds to hide()
	$dispose(channelId: string): Promise<void>;
	$setLogLevel?(
		channelId: string,
		level: VscodePlatformLogLevel,
	): Promise<void>; // For LogOutputChannel
}

/**
 * Options for `createOutputChannel` as defined in `vscode.d.ts`.
 * Can be a languageId string (deprecated), or an options object.
 */
type CreateOutputChannelOptions =
	| string
	| { log: true; languageId?: string; file?: VscodeUri }
	| { log?: false; languageId?: string };

/** Maps vscode.LogLevel (API enum, typically 0-5) to VscodePlatformLogLevel (internal/RPC, often same values) */
function _apiLogLevelToPlatformLogLevel(
	apiLevel: VscodeApiLogLevel,
): VscodePlatformLogLevel {
	// Assuming a direct numeric mapping for simplicity as VS Code's enums often align.
	// If they differ structurally (e.g., string vs number, or different numeric values),
	// a proper switch/map is necessary.
	switch (apiLevel) {
		case VscodeApiLogLevel.Trace:
			return VscodePlatformLogLevel.Trace;
		case VscodeApiLogLevel.Debug:
			return VscodePlatformLogLevel.Debug;
		case VscodeApiLogLevel.Info:
			return VscodePlatformLogLevel.Info;
		case VscodeApiLogLevel.Warning:
			return VscodePlatformLogLevel.Warning;
		case VscodeApiLogLevel.Error:
			return VscodePlatformLogLevel.Error;
		case VscodeApiLogLevel.Off:
			return VscodePlatformLogLevel.Off;
		default:
			// This case should ideally not be reached if `apiLevel` is correctly typed.
			// Fallback to a sensible default or throw if strictness is required.
			console.warn(
				`_apiLogLevelToPlatformLogLevel: Unknown VscodeApiLogLevel '${apiLevel}'. Defaulting to Info.`,
			);
			return VscodePlatformLogLevel.Info;
	}
}

/**
 * Base implementation for an output channel, handling common RPC proxy interactions.
 */
class ShimOutputChannelImpl implements VscodeOutputChannel {
	protected _idForRpc: string; // Initially the channel name, updated by MainThread's $register response
	readonly #displayName: string;
	#proxy: MainThreadOutputServiceShape | null;
	protected _logService?: ILogServiceForShim; // Make protected for ShimLogOutputChannelImpl
	#isDisposed = false;

	constructor(
		initialIdForRpc: string, // This is typically the channel name before MainThread assigns an ID
		displayName: string,
		proxy: MainThreadOutputServiceShape | null,
		logService?: ILogServiceForShim,
	) {
		this._idForRpc = initialIdForRpc;
		this.#displayName = displayName;
		this.#proxy = proxy;
		this._logService = logService;
		this._logShimInternals(
			`Created channel (Display: '${this.#displayName}', Initial RPC ID: '${this._idForRpc}'). Awaiting final ID from MainThread.`,
		);
	}

	/** Called by ShimOutputService after MainThread confirms registration and provides the actual ID. */
	public _setMainThreadId(actualId: string): void {
		if (this._idForRpc !== actualId) {
			this._logShimInternals(
				`RPC ID updated from initial '${this._idForRpc}' to MainThread-assigned ID '${actualId}'.`,
			);
			this._idForRpc = actualId; // Update to the definitive ID from MainThread
		}
	}

	protected _logShimInternals(message: string, ...args: any[]): void {
		this._logService?.debug(
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
			console.error(
				`${prefix} ${message instanceof Error ? message.message : message}`,
				...args,
				message instanceof Error ? message.stack : "",
			);
		}
	}

	/** Validates that the channel is not disposed and the RPC proxy is available. */
	protected _validateAndGetProxy(): MainThreadOutputServiceShape {
		if (this.#isDisposed) {
			const msg = `OutputChannel '${this.#displayName}' (RPC ID: ${this._idForRpc}) has been disposed. Cannot perform operation.`;
			this._logShimError(msg); // Log before throwing
			throw new Error(msg);
		}
		if (!this.#proxy) {
			const msg = `RPC proxy is unavailable for OutputChannel '${this.#displayName}'. Operations will fail.`;
			this._logShimError(msg); // Log before throwing
			throw new Error(msg);
		}
		return this.#proxy;
	}

	get name(): string {
		return this.#displayName;
	}

	append(value: string): void {
		try {
			this._validateAndGetProxy()
				.$append(this._idForRpc, String(value))
				.catch((e) =>
					this._logShimError(
						"RPC $append failed:",
						refineErrorForShim(e, this._logService, "$append RPC"),
					),
				);
		} catch (e: any) {
			this._logShimError(
				"Validation failed before $append RPC call:",
				e.message,
			);
		}
	}

	appendLine(value: string): void {
		this.append(String(value) + "\n");
	}

	clear(): void {
		try {
			this._validateAndGetProxy()
				.$clear(this._idForRpc)
				.catch((e) =>
					this._logShimError(
						"RPC $clear failed:",
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

	replace(value: string): void {
		try {
			this._validateAndGetProxy()
				.$replace(this._idForRpc, String(value))
				.catch((e) =>
					this._logShimError(
						"RPC $replace failed:",
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

	show(
		columnOrPreserveFocus?: ViewColumn | boolean,
		preserveFocusArgument?: boolean,
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
				actualPreserveFocus = preserveFocusArgument;
			} else {
				// columnOrPreserveFocus is undefined
				actualPreserveFocus = preserveFocusArgument; // This would be the only preserveFocus if first arg is undefined
			}
			this._logShimInternals(
				`show(): ViewColumn=${targetViewColumn ?? "default"}, PreserveFocus=${actualPreserveFocus ?? false}`,
			);
			proxy
				.$reveal(this._idForRpc, actualPreserveFocus, targetViewColumn)
				.catch((e) =>
					this._logShimError(
						"RPC $reveal (show) failed:",
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

	hide(): void {
		try {
			this._validateAndGetProxy()
				.$close(this._idForRpc) // $close corresponds to hide
				.catch((e) =>
					this._logShimError(
						"RPC $close (hide) failed:",
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

	dispose(): void {
		if (!this.#isDisposed) {
			this._logShimInternals(`dispose() called.`);
			this.#isDisposed = true;
			// Attempt to notify MainThread even if proxy validation might fail (e.g., if proxy became null).
			this.#proxy
				?.$dispose(this._idForRpc)
				.catch((e) =>
					this._logShimError(
						"RPC $dispose failed:",
						refineErrorForShim(e, this._logService, "$dispose RPC"),
					),
				);
			// Release references
			this.#proxy = null;
			this._logService = undefined; // Clear logService reference
		} else {
			this._logShimInternals(
				`dispose() called on already disposed channel.`,
			);
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
	#currentLogLevel: VscodeApiLogLevel; // Use VscodeApiLogLevel from 'vscode' API
	readonly #onDidChangeLogLevelEmitter: VscodeEmitter<VscodeApiLogLevel>;
	public readonly onDidChangeLogLevel: VscodeEvent<VscodeApiLogLevel>;

	constructor(
		idForRpc: string,
		displayName: string,
		proxy: MainThreadOutputServiceShape | null,
		logService: ILogServiceForShim | undefined,
		initialLogLevel: VscodeApiLogLevel = VscodeApiLogLevel.Info, // Default to Info from vscode.LogLevel
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

	get logLevel(): VscodeApiLogLevel {
		return this.#currentLogLevel;
	}

	setLogLevel(level: VscodeApiLogLevel): void {
		if (
			!Object.values(VscodeApiLogLevel).includes(
				level as unknown as number,
			)
		) {
			// Check if valid enum member
			this._logShimError(
				`Invalid VscodeApiLogLevel value passed to setLogLevel: ${level}. Log level not changed.`,
			);
			return;
		}
		if (this.#currentLogLevel !== level) {
			const oldLevel = this.#currentLogLevel;
			this.#currentLogLevel = level;
			this._logShimInternals(
				`LogLevel changed: ${VscodeApiLogLevel[oldLevel]} -> ${VscodeApiLogLevel[level]}.`,
			);
			this.#onDidChangeLogLevelEmitter.fire(this.#currentLogLevel);

			try {
				const proxy = this._validateAndGetProxy(); // Get proxy, will throw if disposed/null
				if (proxy.$setLogLevel) {
					const platformLevelForRpc =
						_apiLogLevelToPlatformLogLevel(level); // Map API level to platform level for RPC
					proxy
						.$setLogLevel(this._idForRpc, platformLevelForRpc)
						.catch((e) =>
							this._logShimError(
								"RPC $setLogLevel failed:",
								refineErrorForShim(
									e,
									this._logService,
									"$setLogLevel RPC",
								),
							),
						);
				} else {
					this._logShimInternals(
						"MainThread proxy does not support $setLogLevel. Log level change is local to Cocoon for this channel.",
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

	trace(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Trace)
			this._logWithLevel("TRACE", message, ...args);
	}
	debug(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Debug)
			this._logWithLevel("DEBUG", message, ...args);
	}
	info(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Info)
			this._logWithLevel("INFO", message, ...args);
	}
	warn(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Warning)
			this._logWithLevel("WARN", message, ...args);
	}
	error(message: string | Error, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Error)
			this._logWithLevel("ERROR", message, ...args);
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
		const formattedArgument = args
			.map((arg) =>
				typeof arg === "object" && arg !== null
					? JSON.stringify(arg)
					: String(arg),
			)
			.join(" ");
		if (args.length > 0) {
			fullMessage += ` ${formattedArgument}`;
		}
		// Prepend the log level label to the message before appending to the channel via base class method.
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
	createOutputChannel(name: string, languageId: string): VscodeOutputChannel; // Deprecated form
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
	// private readonly _activeChannels = new Map<string, ShimOutputChannelImpl | ShimLogOutputChannelImpl>(); // For potential future use

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostOutputService", rpcService, logService); // Service Identifier for logging
		this._logInfo("Initializing...");
		if (this._rpcService) {
			this.#mainThreadOutputProxy = this._getProxy(
				MainContext.MainThreadOutputService as ProxyIdentifier<MainThreadOutputServiceShape>,
			);
		}
		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"MainThreadOutputService RPC proxy unavailable! Output channels will be NOPs or fail if attempted to be used.",
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
		languageId: string,
	): VscodeOutputChannel; // Deprecated form
	public createOutputChannel(
		name: string,
		optionsOrLangId?: CreateOutputChannelOptions,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		name = String(name).trim();
		if (!name) {
			throw new Error("Output channel name cannot be empty.");
		}

		let isLogChannel = false;
		let languageId: string | undefined = undefined;
		let fileUriForLog: VscodeUri | undefined = undefined;

		if (typeof optionsOrLangId === "string") {
			// Deprecated: createOutputChannel(name, languageId)
			languageId = optionsOrLangId;
			this._logWarn(
				`Deprecated createOutputChannel(name, languageId) usage for channel '${name}'. Prefer options object.`,
			);
		} else if (
			typeof optionsOrLangId === "object" &&
			optionsOrLangId !== null
		) {
			isLogChannel = optionsOrLangId.log === true;
			languageId = optionsOrLangId.languageId;
			if (isLogChannel && "file" in optionsOrLangId) {
				fileUriForLog = (optionsOrLangId as { file?: VscodeUri }).file;
				if (fileUriForLog && !(fileUriForLog instanceof VscodeUri)) {
					this._logError(
						`Invalid 'file' option for LogOutputChannel '${name}'. It must be a vscode.Uri instance. Ignoring 'file' option.`,
						"Received 'file' option:",
						fileUriForLog,
					);
					fileUriForLog = undefined;
				}
			}
		}

		this._logInfo(
			`API createOutputChannel: Name='${name}', IsLog=${isLogChannel}, LangId='${languageId ?? "N/A"}', File='${fileUriForLog?.toString() ?? "N/A"}'`,
		);

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				`RPC proxy for MainThreadOutputService unavailable. Returning a NOP OutputChannel for '${name}'.`,
			);
			return this._createNopChannel(name, isLogChannel);
		}

		// Use the channel name as the initial ID for RPC calls.
		// The actual MainThread ID will be set on the channel instance after successful registration.
		const initialIdForRpc = name;
		let createdChannel: ShimOutputChannelImpl | ShimLogOutputChannelImpl;

		if (isLogChannel) {
			createdChannel = new ShimLogOutputChannelImpl(
				initialIdForRpc,
				name,
				this.#mainThreadOutputProxy,
				this._logService,
			);
		} else {
			createdChannel = new ShimOutputChannelImpl(
				initialIdForRpc,
				name,
				this.#mainThreadOutputProxy,
				this._logService,
			);
		}

		let fileUriDtoForRpc: ILocalUriComponents | null = null;
		if (fileUriForLog) {
			// Use BaseCocoonShim's _convertApiArgToInternal to marshal VscodeUri to UriComponents DTO
			const marshalledFileUri =
				this._convertApiArgToInternal(fileUriForLog);
			if (
				marshalledFileUri &&
				typeof marshalledFileUri === "object" &&
				"scheme" in marshalledFileUri
			) {
				fileUriDtoForRpc = marshalledFileUri as ILocalUriComponents;
			} else {
				this._logWarn(
					`Failed to marshal 'file' URI to DTO for LogOutputChannel '${name}'. 'file' option will not be sent. Marshalled:`,
					marshalledFileUri,
				);
			}
		}

		// Register with MainThread and update channel with actual ID.
		this.#mainThreadOutputProxy
			.$register(
				name,
				fileUriDtoForRpc,
				languageId /*, extensionId if needed in RPC signature */,
			)
			.then((mainThreadActualId) => {
				this._logDebug(
					`Output channel '${name}' registered with MainThread. Assigned MainThread ID: '${mainThreadActualId}'. Initial Shim RPC ID: '${initialIdForRpc}'.`,
				);
				createdChannel._setMainThreadId(mainThreadActualId); // Update the channel instance with the real MainThread ID
				// If tracking active channels: this.#activeChannels.set(mainThreadActualId, createdChannel);
			})
			.catch((err: any) => {
				this._logError(
					`Failed to register output channel '${name}' on MainThread:`,
					refineErrorForShim(
						err,
						this._logService,
						"$register RPC call",
					),
				);
				// Channel object is already created; it will make failing RPC calls if used.
				// Consider adding a state to the channel (e.g., `_isRegistered`) and having operations check it.
			});

		return createdChannel;
	}

	private _createNopChannel(
		name: string,
		isLogChannel: boolean,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		this._logWarn(
			`Creating NOP ${isLogChannel ? "Log" : ""}OutputChannel due to unavailable RPC proxy: Name='${name}'.`,
		);
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
			return Object.freeze({
				...nopBase,
				logLevel: VscodeApiLogLevel.Off, // Sensible default for a NOP log channel
				onDidChangeLogLevel: VscodeEvent.None,
				trace: () => {},
				debug: () => {},
				info: () => {},
				warn: () => {},
				error: () => {},
				setLogLevel: () => {}, // NOP for setLogLevel on a NOP channel
			}) as VscodeLogOutputChannel;
		}
		return Object.freeze(nopBase);
	}

	public override dispose(): void {
		super.dispose();
		// this.#activeChannels.forEach(channel => channel.dispose()); // Dispose all created channels if tracked
		// this.#activeChannels.clear();
		this._logInfo("Disposed.");
	}

	// Example RPC methods called BY MainThread (if this service received calls from MainThread)
	// public $setVisible(channelId: string, visible: boolean): void {
	//     this._logDebug(`RPC $setVisible called for channel '${channelId}' to visible=${visible}`);
	//     const channel = this.#activeChannels.get(channelId);
	//     // channel?._someInternalMethodToUpdateVisibility(visible); // Example internal update
	// }
	// public $setLogLevel(channelId: string, level: VscodePlatformLogLevel): void {
	//     this._logDebug(`RPC $setLogLevel called for channel '${channelId}' to level=${level}`);
	//     const channel = this.#activeChannels.get(channelId);
	//     if (channel instanceof ShimLogOutputChannelImpl) {
	//         // Map VscodePlatformLogLevel to VscodeApiLogLevel if they differ numerically
	//         // For simplicity, assuming direct cast works if enums are aligned.
	//         channel.setLogLevel(level as unknown as VscodeApiLogLevel);
	//     }
	// }
}
