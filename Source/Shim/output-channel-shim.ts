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
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import { LogLevel as VscodePlatformLogLevel } from "vs/platform/log/common/log"; // Internal LogLevel for RPC
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
import {
	ViewColumn, // For OutputChannel.show() options
	LogLevel as VscodeApiLogLevel, // Public API LogLevel
	type LogOutputChannel as VscodeLogOutputChannel,
	type OutputChannel as VscodeOutputChannel,
	type Uri as VscodeUri,
} from "vscode";

// API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---
interface ILocalUriComponents extends VSCodeInternalUriComponents {} // DTO for file URI if log channel is file-backed

interface MainThreadOutputServiceShape {
	$register(
		name: string,
		file?: ILocalUriComponents | null,
		languageId?:
			| string
			| null /*, extensionId?: string // Removed for alignment */,
	): Promise<string>; // Returns actual channel ID
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
	): Promise<void>; // Uses platform LogLevel
}

type CreateOutputChannelOptions =
	| string
	| { log: true; languageId?: string; file?: VscodeUri }
	| { log?: false; languageId?: string };

/** Maps vscode.LogLevel (API) to VscodePlatformLogLevel (internal/RPC) */
function _apiLogLevelToPlatformLogLevel(
	apiLevel: VscodeApiLogLevel,
): VscodePlatformLogLevel {
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
			return VscodePlatformLogLevel.Info; // Should not happen with typed API
	}
}

class ShimOutputChannelImpl implements VscodeOutputChannel {
	protected _idForRpc: string; // Initially name, updated by MainThread's $register response
	readonly #displayName: string;
	#proxy: MainThreadOutputServiceShape | null;
	protected _logService?: ILogServiceForShim;
	#isDisposed = false;

	constructor(
		initialIdForRpc: string,
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
				`RPC ID updated from '${this._idForRpc}' to MainThread-assigned ID '${actualId}'.`,
			);
			this._idForRpc = actualId;
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
	protected _validateAndGetProxy(): MainThreadOutputServiceShape {
		if (this.#isDisposed) {
			const msg = `OutputChannel '${this.#displayName}' (RPC ID: ${this._idForRpc}) disposed.`;
			this._logShimError(msg);
			throw new Error(msg);
		}
		if (!this.#proxy) {
			const msg = `RPC proxy unavailable for OutputChannel '${this.#displayName}'. Operations will fail.`;
			this._logShimError(msg);
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
			this._logShimError("Validation failed for $append:", e.message);
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
			this._logShimError("Validation failed for $clear:", e.message);
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
			this._logShimError("Validation failed for $replace:", e.message);
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
				targetViewColumn = columnOrPreserveFocus;
				actualPreserveFocus = preserveFocusArgs;
			} else {
				actualPreserveFocus = preserveFocusArgs;
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
			this._logShimError("Validation failed for show():", e.message);
		}
	}
	hide(): void {
		try {
			this._validateAndGetProxy()
				.$close(this._idForRpc)
				.catch((e) =>
					this._logShimError(
						"RPC $close (hide) failed:",
						refineErrorForShim(e, this._logService, "$close RPC"),
					),
				);
		} catch (e: any) {
			this._logShimError("Validation failed for hide():", e.message);
		}
	}
	dispose(): void {
		if (!this.#isDisposed) {
			this._logShimInternals(`dispose() called.`);
			this.#isDisposed = true;
			this.#proxy
				?.$dispose(this._idForRpc)
				.catch((e) =>
					this._logShimError(
						"RPC $dispose failed:",
						refineErrorForShim(e, this._logService, "$dispose RPC"),
					),
				);
			this.#proxy = null;
			this._logService = undefined;
		} else {
			this._logShimInternals(
				`dispose() called on already disposed channel.`,
			);
		}
	}
}

class ShimLogOutputChannelImpl
	extends ShimOutputChannelImpl
	implements VscodeLogOutputChannel
{
	#currentLogLevel: VscodeApiLogLevel; // Uses public API LogLevel enum
	readonly #onDidChangeLogLevelEmitter: VscodeEmitter<VscodeApiLogLevel>;
	public readonly onDidChangeLogLevel: VscodeEvent<VscodeApiLogLevel>;

	constructor(
		idForRpc: string,
		displayName: string,
		proxy: MainThreadOutputServiceShape | null,
		logService: ILogServiceForShim | undefined,
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

	get logLevel(): VscodeApiLogLevel {
		return this.#currentLogLevel;
	}
	setLogLevel(level: VscodeApiLogLevel): void {
		if (
			!Object.values(VscodeApiLogLevel).includes(
				level as unknown as number,
			)
		) {
			this._logShimError(
				`Invalid VscodeApiLogLevel for setLogLevel: ${level}. Not changed.`,
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
				const proxy = this._validateAndGetProxy();
				if (proxy.$setLogLevel) {
					const platformLevelForRpc =
						_apiLogLevelToPlatformLogLevel(level); // Map API level to platform level
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
						"MainThread proxy does not support $setLogLevel. Level change local to Cocoon.",
					);
				}
			} catch (e: any) {
				this._logShimError(
					"Validation failed for $setLogLevel RPC:",
					e.message,
				);
			}
		}
	}

	trace(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Trace) {
			this._logWithLevel("TRACE", message, ...args);
		}
	}
	debug(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Debug) {
			this._logWithLevel("DEBUG", message, ...args);
		}
	}
	info(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Info) {
			this._logWithLevel("INFO", message, ...args);
		}
	}
	warn(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Warning) {
			this._logWithLevel("WARN", message, ...args);
		}
	}
	error(message: string | Error, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Error) {
			this._logWithLevel("ERROR", message, ...args);
		}
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
				typeof arg === "object" && arg !== null
					? JSON.stringify(arg)
					: String(arg),
			)
			.join(" ");
		if (args.length > 0) {
			fullMessage += ` ${formattedArgs}`;
		}
		this.appendLine(`[${levelLabel}] ${fullMessage}`); // Uses base class appendLine
	}

	override dispose(): void {
		super.dispose();
		this.#onDidChangeLogLevelEmitter.dispose();
	}
}

export interface IExtHostOutputServiceShape {
	readonly _serviceBrand: undefined;
	createOutputChannel(name: string): VscodeOutputChannel;
	createOutputChannel(
		name: string,
		options: { log: true; languageId?: string; file?: VscodeUri },
	): VscodeLogOutputChannel;
	createOutputChannel(name: string, languageId: string): VscodeOutputChannel; // Deprecated
}

export class ShimOutputService
	extends BaseCocoonShim
	implements IExtHostOutputServiceShape
{
	public readonly _serviceBrand: undefined;
	#mainThreadOutputProxy: MainThreadOutputServiceShape | null = null;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostOutputService", rpcService, logService);
		this._logInfo("Initializing...");
		if (this._rpcService) {
			this.#mainThreadOutputProxy = this._getProxy(
				MainContext.MainThreadOutputService as ProxyIdentifier<MainThreadOutputServiceShape>,
			);
		}
		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"MainThreadOutputService RPC proxy unavailable! Output channels will be NOPs or fail.",
			);
		}
	}

	public createOutputChannel(
		name: string,
		optionsOrLangId?: CreateOutputChannelOptions,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		name = String(name).trim();
		if (!name) {
			throw new Error("Output channel name cannot be empty.");
		}

		let isLogChannel = false,
			languageId: string | undefined = undefined,
			fileUriForLog: VscodeUri | undefined = undefined;
		if (typeof optionsOrLangId === "string") {
			languageId = optionsOrLangId;
			this._logWarn(
				`Deprecated createOutputChannel(name, languageId) for '${name}'.`,
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
						`Invalid 'file' option for LogOutputChannel '${name}'. Ignoring.`,
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
				`RPC proxy unavailable. Returning NOP channel for '${name}'.`,
			);
			return this._createNopChannel(name, isLogChannel);
		}

		const initialIdForRpc = name; // Use name as initial RPC ID
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
			fileUriDtoForRpc = this._convertApiArgToInternal(
				fileUriForLog,
			) as ILocalUriComponents | null;
			if (!fileUriDtoForRpc) {
				this._logWarn(
					`Failed to marshal 'file' URI for LogOutputChannel '${name}'.`,
				);
			}
		}

		// Register with MainThread and update channel with actual ID.
		this.#mainThreadOutputProxy
			.$register(
				name,
				fileUriDtoForRpc,
				languageId /* removed extensionId */,
			)
			.then((mainThreadActualId) => {
				this._logDebug(
					`Output channel '${name}' registered with MainThread. Assigned ID: '${mainThreadActualId}'.`,
				);
				createdChannel._setMainThreadId(mainThreadActualId); // Update the channel instance with the real ID
			})
			.catch((err) => {
				this._logError(
					`Failed to register output channel '${name}' on MainThread:`,
					refineErrorForShim(err, this._logService, "$register RPC"),
				);
				// Channel object is already created; it will make failing RPC calls if registration fails.
				// Consider adding a state to the channel (e.g., `_isRegistered`) and having operations check it.
			});

		return createdChannel;
	}

	private _createNopChannel(
		name: string,
		isLogChannel: boolean,
	): VscodeOutputChannel | VscodeLogOutputChannel {
		this._logWarn(
			`Creating NOP ${isLogChannel ? "Log" : ""}OutputChannel: Name='${name}'.`,
		);
		const nopBase: VscodeOutputChannel = {
			name,
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
				logLevel: VscodeApiLogLevel.Off,
				onDidChangeLogLevel: VscodeEvent.None,
				trace: () => {},
				debug: () => {},
				info: () => {},
				warn: () => {},
				error: () => {},
				setLogLevel: () => {},
			}) as VscodeLogOutputChannel;
		}
		return Object.freeze(nopBase);
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
