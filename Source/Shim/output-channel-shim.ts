/*---------------------------------------------------------------------------------------------
 * Cocoon Output Channel Shims (output-channel-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.createOutputChannel` API (via `IExtHostOutputService`) and
 * the returned `vscode.OutputChannel` / `vscode.LogOutputChannel` interfaces for Cocoon.
 * Allows extensions to create and write to output channels displayed in the UI.
 *
 * Responsibilities:
 * - `ShimOutputService`:
 *   - Implements `createOutputChannel(name, options?)`.
 *   - Calls `$register` RPC on `MainThreadOutputService` to inform Mountain about the new channel.
 *   - Instantiates and returns a `ShimOutputChannelImpl` or `ShimLogOutputChannelImpl` facade.
 * - `ShimOutputChannelImpl` / `ShimLogOutputChannelImpl`:
 *   - Implement the `vscode.OutputChannel` / `vscode.LogOutputChannel` API.
 *   - Forward actions (`append`, `clear`, etc.) to Mountain via RPC on `MainThreadOutputService`.
 *   - `ShimLogOutputChannelImpl` handles log levels locally for filtering console output.
 *
 * Key Interactions:
 * - Provides `vscode.window.createOutputChannel` (via DI of `IExtHostOutputService`).
 * - Interacts with `RPCProtocol` via `this._getProxy(MainContext.MainThreadOutputService)`.
 * - Relies on Mountain's `MainThreadOutputService` for UI updates.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// Assuming API objects from 'vscode' shim
import { IDisposable } from "vs/base/common/lifecycle";
// VS Code internal LogLevel enum
import type { LogLevel as VscodeInternalLogLevel } from "vs/platform/log/common/log";
import {
	ExtHostContext,
	MainContext,
	// For RPC context
} from "vs/workbench/api/common/extHost.protocol";
import {
	// For show options
	type ViewColumn,
	// The vscode.LogLevel enum from the API
	LogLevel as VscodeApiLogLevel,
	type LogOutputChannel as VscodeLogOutputChannel,
	type OutputChannel as VscodeOutputChannel,
	// Renamed to avoid conflict with internal URI if used
	type Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";

// --- Type Definitions ---

// For MainThreadOutputService RPC proxy
// TODO: This must align with the actual MainThreadOutputService methods in Mountain.
interface MainThreadOutputServiceShape {
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

		// Added viewColumn
	): Promise<void>;

	$close(channelId: string): Promise<void>;

	$dispose(channelId: string): Promise<void>;

	$setLogLevel?(
		channelId: string,

		level: VscodeInternalLogLevel,

		// Optional, for LogOutputChannel
	): Promise<void>;
}

// For URI components passed to $register
interface ILocalUriComponents {
	scheme: string;

	path: string;

	authority?: string;

	query?: string;

	fragment?: string;

	$mid?: 1;
}

// Options for createOutputChannel (vscode.d.ts)
type CreateOutputChannelOptions =
	| string
	| { log: true; languageId?: string }
	| { log?: false; languageId?: string };

class ShimOutputChannelImpl implements VscodeOutputChannel {
	// The ID (often the name) used for RPC calls to MainThread
	readonly #idForRpc: string;

	readonly #displayName: string;

	#proxy: MainThreadOutputServiceShape | null;

	// For internal logging of the shim itself
	#logService?: ILogService;

	#isDisposed = false;

	constructor(
		idForRpc: string,

		displayName: string,

		proxy: MainThreadOutputServiceShape | null,

		logService?: ILogService,
	) {
		this.#idForRpc = idForRpc;

		this.#displayName = displayName;

		this.#proxy = proxy;

		this.#logService = logService;

		this._logShimInternals(`Created`);
	}

	private _logShimInternals(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[OutputChannel][${this.#displayName}(${this.#idForRpc})] ${msg}`,

			...args,
		);
	}

	private _logShimError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[OutputChannel][${this.#displayName}(${this.#idForRpc})] ${msg}`,

			...args,
		);
	}

	private _validateAndGetProxy(): MainThreadOutputServiceShape {
		if (this.#isDisposed)
			throw new Error(
				`OutputChannel '${this.#displayName}' has been disposed.`,
			);

		if (!this.#proxy)
			throw new Error(
				`OutputChannel '${this.#displayName}' RPC proxy is unavailable.`,
			);

		return this.#proxy;
	}

	get name(): string {
		return this.#displayName;
	}

	append(value: string): void {
		try {
			const proxy = this._validateAndGetProxy();

			// Can be too verbose
			// this._logShimInternals(`append: "${value.substring(0, 50)}..."`);

			proxy.$append(this.#idForRpc, String(value)).catch((e) =>
				this._logShimError(
					"Error in $append RPC:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError(
				"append validation failed:",

				e,
			); /* Optionally rethrow */
		}
	}

	appendLine(value: string): void {
		this.append(String(value) + "\n");
	}

	clear(): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`clear`);

			proxy.$clear(this.#idForRpc).catch((e) =>
				this._logShimError(
					"Error in $clear RPC:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("clear validation failed:", e);
		}
	}

	replace(value: string): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`replace: "${value.substring(0, 50)}..."`);

			proxy.$replace(this.#idForRpc, String(value)).catch((e) =>
				this._logShimError(
					"Error in $replace RPC:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("replace validation failed:", e);
		}
	}

	show(
		columnOrPreserveFocus?: ViewColumn | boolean,

		preserveFocus?: boolean,
	): void {
		try {
			const proxy = this._validateAndGetProxy();

			let targetViewColumn: ViewColumn | undefined;

			let actualPreserveFocus: boolean | undefined;

			if (typeof columnOrPreserveFocus === "boolean") {
				actualPreserveFocus = columnOrPreserveFocus;
			} else if (typeof columnOrPreserveFocus === "number") {
				// ViewColumn enum
				targetViewColumn = columnOrPreserveFocus;

				actualPreserveFocus = preserveFocus;
			} else {
				// preserveFocus is undefined or boolean
				actualPreserveFocus = preserveFocus;
			}

			this._logShimInternals(
				`show: column=${targetViewColumn}, preserveFocus=${actualPreserveFocus}`,
			);

			proxy
				// $reveal may take column
				.$reveal(this.#idForRpc, actualPreserveFocus, targetViewColumn)
				.catch((e) =>
					this._logShimError(
						"Error in $reveal RPC:",

						refineError(e, this.#logService),
					),
				);
		} catch (e: any) {
			this._logShimError("show validation failed:", e);
		}
	}

	hide(): void {
		try {
			const proxy = this._validateAndGetProxy();

			this._logShimInternals(`hide`);

			proxy.$close(this.#idForRpc).catch((e) =>
				this._logShimError(
					"Error in $close RPC:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("hide validation failed:", e);
		}
	}

	dispose(): void {
		if (!this.#isDisposed) {
			this._logShimInternals(`dispose`);

			this.#isDisposed = true;

			this.#proxy
				// Use optional chaining as proxy might be nulled
				?.$dispose(this.#idForRpc)
				.catch((e) =>
					this._logShimError(
						"Error in $dispose RPC:",

						refineError(e, this.#logService),
					),
				);

			this.#proxy = null;

			this.#logService = undefined;
		}
	}
}

class ShimLogOutputChannelImpl
	extends ShimOutputChannelImpl
	implements VscodeLogOutputChannel
{
	// Use vscode.LogLevel from API
	#currentLogLevel: VscodeApiLogLevel;

	readonly #onDidChangeLogLevelEmitter: VscodeEmitter<VscodeApiLogLevel>;

	public readonly onDidChangeLogLevel: VscodeEvent<VscodeApiLogLevel>;

	// Keep a ref for $setLogLevel
	readonly #proxyRefForLog: MainThreadOutputServiceShape | null;

	constructor(
		idForRpc: string,

		displayName: string,

		proxy: MainThreadOutputServiceShape | null,

		logService?: ILogService,

		// Default to Info from vscode API
		initialLogLevel: VscodeApiLogLevel = VscodeApiLogLevel.Info,
	) {
		super(idForRpc, displayName, proxy, logService);

		this.#currentLogLevel = initialLogLevel;

		this.#onDidChangeLogLevelEmitter =
			new VscodeEmitter<VscodeApiLogLevel>();

		this.onDidChangeLogLevel = this.#onDidChangeLogLevelEmitter.event;

		// Store for potential $setLogLevel
		this.#proxyRefForLog = proxy;
	}

	get logLevel(): VscodeApiLogLevel {
		return this.#currentLogLevel;
	}

	public setLogLevel(level: VscodeApiLogLevel): void {
		if (this.#currentLogLevel !== level) {
			const oldLevel = this.#currentLogLevel;

			this.#currentLogLevel = level;

			super["_logShimInternals"](
				`Log level changed from ${VscodeApiLogLevel[oldLevel]} to ${VscodeApiLogLevel[level]}`,
			);

			this.#onDidChangeLogLevelEmitter.fire(this.#currentLogLevel);

			// TODO: If MainThreadOutputService supports setting log level per channel, call it.
			// This requires mapping vscode.LogLevel to VscodeInternalLogLevel if they differ.
			// const internalLevel = VscodeInternalLogLevel[VscodeApiLogLevel[level] as keyof typeof VscodeInternalLogLevel];

			// if (this.#proxyRefForLog?.$setLogLevel && internalLevel !== undefined) {

			// Accessing private member; need getter or pass id
			//     this.#proxyRefForLog.$setLogLevel(super["_idForRpc"], internalLevel)
			//         .catch(e => super["_logShimError"]("Error in $setLogLevel RPC:", refineError(e, super["_logService"])));

			// }
		}
	}

	public trace(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Trace)
			this._logWithLevel("Trace", message, ...args);
	}

	public debug(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Debug)
			this._logWithLevel("Debug", message, ...args);
	}

	public info(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Info)
			this._logWithLevel("Info", message, ...args);
	}

	public warn(message: string, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Warning)
			this._logWithLevel("Warn", message, ...args);
	}

	public error(message: string | Error, ...args: any[]): void {
		if (this.logLevel <= VscodeApiLogLevel.Error)
			this._logWithLevel("Error", message, ...args);
	}

	private _logWithLevel(
		levelLabel: string,

		message: string | Error,

		...args: any[]
	): void {
		const fullMessage =
			message instanceof Error
				? `${message.message}${message.stack ? `\n${message.stack}` : ""}`
				: message;

		const formattedArgs = args
			.map((arg) =>
				typeof arg === "object" ? JSON.stringify(arg) : String(arg),
			)
			.join(" ");

		this.appendLine(
			`[${levelLabel}] ${fullMessage}${args.length > 0 ? " " + formattedArgs : ""}`,
		);
	}

	override dispose(): void {
		// Use override keyword
		super.dispose();

		this.#onDidChangeLogLevelEmitter.dispose();
	}
}

export interface IExtHostOutputServiceShape {
	// Based on VS Code's IExtHostOutputService
	readonly _serviceBrand: undefined;

	createOutputChannel(name: string): VscodeOutputChannel;

	createOutputChannel(
		name: string,

		options: { log: true; languageId?: string },
	): VscodeLogOutputChannel;

	// Deprecated form
	createOutputChannel(name: string, languageId: string): VscodeOutputChannel;

	// If main thread notifies visibility
	// $setVisible?(channelId: string, visible: boolean): void;

	// If main thread pushes log level
	// $setLogLevel?(channelId: string, level: VscodeInternalLogLevel): void;
}

export class ShimOutputService
	extends BaseCocoonShim
	implements IExtHostOutputServiceShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadOutputProxy: MainThreadOutputServiceShape | null = null;

	// TODO: Potentially maintain a map of active channels if needed for internal management or cleanup.
	// readonly #activeChannels = new Map<string, ShimOutputChannelImpl | ShimLogOutputChannelImpl>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		// Service Identifier for logging
		super("ExtHostOutputService", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadOutputProxy = this._getProxy(
				MainContext.MainThreadOutputService as ProxyIdentifier<MainThreadOutputServiceShape>,
			);
		}

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"Failed to get MainThreadOutputService proxy! Output channels will be impaired.",
			);
		}
	}

	public createOutputChannel(name: string): VscodeOutputChannel;

	public createOutputChannel(
		name: string,

		options: { log: true; languageId?: string },
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

		// For file-backed log channels (advanced)
		const fileUri: VscodeUri | undefined = undefined;

		if (typeof optionsOrLangId === "string") {
			languageId = optionsOrLangId;
		} else if (typeof optionsOrLangId === "object") {
			isLogChannel = optionsOrLangId.log === true;

			languageId = optionsOrLangId.languageId;

			// TODO: If optionsOrLangId can include a file URI for log channels, extract it here.
			// fileUri = (optionsOrLangId as any).file;
		}

		this._log(
			`createOutputChannel: name='${name}', isLog=${isLogChannel}, langId=${languageId}, file=${fileUri?.toString()}`,
		);

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"RPC proxy for MainThreadOutputService unavailable. Returning NOP channel.",
			);

			return this._createNopChannel(name, isLogChannel);
		}

		// The channelIdForRpc will be used by the ShimOutputChannelImpl instance to communicate with the main thread.
		// VS Code's $register typically returns the actual ID used by the main thread.
		// For simplicity, this shim might use the `name` as the `channelIdForRpc` and rely on
		// Mountain to map it, OR it could make $register async and pass the real ID.
		// The current ShimOutputChannelImpl constructor takes `idForRpc`.
		// Let's use `name` as the `idForRpc` initially, and log the ID returned by `$register`.
		const channelIdForRpc = name;

		// TODO: Convert fileUri to ILocalUriComponents if it's a VscodeUri.
		const fileUriDto = fileUri
			? (this._convertApiArgToInternal(fileUri) as ILocalUriComponents)
			: null;

		this.#mainThreadOutputProxy
			.$register(
				name,

				fileUriDto,

				languageId,

				undefined /* extensionId, usually implicit on main thread */,
			)
			.then((mainThreadActualId) => {
				this._log(
					`Channel '${name}' registered on main thread with actual ID: ${mainThreadActualId}. Shim uses '${channelIdForRpc}' for RPC.`,
				);

				// If the mainThreadActualId differs and is essential for subsequent RPC calls,

				// the ShimOutputChannelImpl instance would need to be updated or use this actualId.
				// For now, assuming `channelIdForRpc` (which is `name`) is sufficient.
			})
			.catch((err: any) => {
				this._logError(
					`Failed to register output channel '${name}' on main thread:`,

					refineError(err, this._logService),
				);
			});

		if (isLogChannel) {
			return new ShimLogOutputChannelImpl(
				channelIdForRpc,

				name,

				this.#mainThreadOutputProxy,

				this._logService,
			);
		} else {
			return new ShimOutputChannelImpl(
				channelIdForRpc,

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

				setLogLevel: () => {},
			} as VscodeLogOutputChannel;
		}

		return nopBase;
	}

	// --- RPC methods called BY MainThread (if any for this service) ---
	// Example:
	// public $setVisible(channelId: string, visible: boolean): void {

	//     this._log(`$setVisible called for channel ${channelId} to ${visible}`);

	//     const channel = this.#activeChannels.get(channelId);

	// channel?._updateVisibility(visible); // Internal method on ShimOutputChannelImpl
	//
	// }
}
