/*---------------------------------------------------------------------------------------------
 * Cocoon Output Channel Shims (shims/output-channel-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.createOutputChannel` API (`IExtHostOutputService`) and
 * the returned `vscode.OutputChannel` / `vscode.LogOutputChannel` interfaces for Cocoon.
 * Allows extensions to create and write to output channels displayed in the UI.
 *
 * Responsibilities:
 * - `ShimOutputService`:
 *   - Implements `createOutputChannel(name, options?)`.
 *   - Calls `$register` RPC on `MainThreadOutputService` asynchronously to inform Mountain
 *     about the new channel.
 *   - Instantiates and returns a `ShimOutputChannel` facade immediately.
 * - `ShimOutputChannel`:
 *   - Implements the `vscode.OutputChannel` / `vscode.LogOutputChannel` API surface
 *     (`name`, `append`, `appendLine`, `clear`, `replace`, `show`, `hide`, `dispose`, log methods).
 *   - Forwards actions (`append`, `clear`, `replace`, `show`, `hide`, `dispose`) to Mountain
 *     via corresponding `$methodName` RPC calls on `MainThreadOutputService`, passing a
 *     channel identifier (e.g., the name).
 *   - Log-specific methods (`trace`, `debug`, etc.) on `LogOutputChannel` are currently mapped
 *     to basic `appendLine` operations in the shim.
 *
 * Key Interactions:
 * - Provides `vscode.window.createOutputChannel`.
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadOutputService)`.
 * - Marshals arguments for RPC calls.
 * - Relies on Mountain handlers (`handlers/output.rs`) to manage channel state and UI updates.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// VS Code event system

import { IDisposable } from "vs/base/common/lifecycle";
// VS Code LogLevel enum
import { LogLevel as VscodeLogLevel } from "vs/platform/log/common/log";
// For RPC context
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// Assuming API objects from 'vscode'
import { LogLevel, LogOutputChannel, OutputChannel, Uri } from "vscode";

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// --- Interfaces based on VS Code API and internal usage ---

// For MainThreadOutputService RPC proxy
interface MainThreadOutputServiceShape {
	$register(
		name: string,

		file?: any /* UriComponents */ | null,

		languageId?: string | null,

		extensionId?: string,

		// Returns actual channel ID
	): Promise<string>;

	$append(channelId: string, value: string): Promise<void>;

	$clear(channelId: string): Promise<void>;

	$replace(channelId: string, value: string): Promise<void>;

	// 'reveal' is often used instead of 'show'
	$reveal(channelId: string, preserveFocus: boolean): Promise<void>;

	// 'close' is often used instead of 'hide'
	$close(channelId: string): Promise<void>;

	$dispose(channelId: string): Promise<void>;

	// Potentially methods to set log level if LogOutputChannel is fully supported via RPC
	// $setLogLevel?(channelId: string, level: VscodeLogLevel): Promise<void>;
}

// Options for createOutputChannel
type OutputChannelOptions =
	| string
	| { log: true; languageId?: string }
	| { log?: false; languageId: string };

class ShimOutputChannelImpl implements OutputChannel {
	// Using #id which is often the name or a unique ID given by main thread.
	// The $register call might return a different ID than the name.
	// Let's assume #id is the one to use with the proxy.
	// This should be the ID used for RPC calls (e.g., from $register)
	readonly #id: string;

	// The display name
	readonly #nameProp: string;

	#proxy: MainThreadOutputServiceShape | null;

	#logService?: ILogService;

	#isDisposed: boolean = false;

	constructor(
		id: string,

		name: string,

		proxy: MainThreadOutputServiceShape | null,

		logService?: ILogService,
	) {
		// Use the ID that MainThreadOutputService knows
		this.#id = id;

		this.#nameProp = name;

		this.#proxy = proxy;

		this.#logService = logService;

		this._log(`Created`);
	}

	private _log(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[OutputChannelShim][${this.#nameProp}(${this.#id})] ${msg}`,

			...args,
		);
	}

	private _logError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[OutputChannelShim][${this.#nameProp}(${this.#id})] ${msg}`,

			...args,
		);
	}

	private _validate(): void {
		if (this.#isDisposed) {
			throw new Error("OutputChannel has been disposed");
		}
	}

	get name(): string {
		return this.#nameProp;
	}

	append(value: string): void {
		this._validate();

		this._log(`append`);

		this.#proxy
			?.$append(this.#id, String(value))
			.catch((e) => this._logError("Error in $append RPC:", e));
	}

	appendLine(value: string): void {
		this.append(String(value) + "\n");
	}

	clear(): void {
		this._validate();

		this._log(`clear`);

		this.#proxy
			?.$clear(this.#id)
			.catch((e) => this._logError("Error in $clear RPC:", e));
	}

	replace(value: string): void {
		this._validate();

		this._log(`replace`);

		this.#proxy
			?.$replace(this.#id, String(value))
			.catch((e) => this._logError("Error in $replace RPC:", e));
	}

	show(
		columnOrPreserveFocus?: any /* vscode.ViewColumn | boolean */,

		preserveFocus?: boolean,
	): void {
		this._validate();

		this._log(`show`);

		let actualPreserveFocus: boolean;

		if (typeof columnOrPreserveFocus === "boolean") {
			actualPreserveFocus = columnOrPreserveFocus;
		} else {
			actualPreserveFocus = preserveFocus ?? false;
		}

		// The `column` aspect is for editor layout, MainThreadOutputService.$reveal usually just takes preserveFocus
		this.#proxy
			?.$reveal(this.#id, actualPreserveFocus)
			.catch((e) => this._logError("Error in $reveal RPC:", e));
	}

	hide(): void {
		this._validate();

		this._log(`hide`);

		this.#proxy
			// Assuming $close on main thread hides it
			?.$close(this.#id)
			.catch((e) => this._logError("Error in $close RPC:", e));
	}

	dispose(): void {
		if (!this.#isDisposed) {
			this._log(`dispose`);

			this.#isDisposed = true;

			this.#proxy
				?.$dispose(this.#id)
				.catch((e) => this._logError("Error in $dispose RPC:", e));

			// Release proxy
			this.#proxy = null;

			this.#logService = undefined;
		}
	}
}

// Wrapper to provide LogOutputChannel interface
class ShimLogOutputChannelImpl
	extends ShimOutputChannelImpl
	implements LogOutputChannel
{
	#currentLogLevel: LogLevel;

	readonly #onDidChangeLogLevelEmitter: VscodeEmitter<LogLevel>;

	public readonly onDidChangeLogLevel: VscodeEvent<LogLevel>;

	constructor(
		id: string,

		name: string,

		proxy: MainThreadOutputServiceShape | null,

		logService?: ILogService,

		initialLogLevel: LogLevel = LogLevel.Info,
	) {
		super(id, name, proxy, logService);

		this.#currentLogLevel = initialLogLevel;

		this.#onDidChangeLogLevelEmitter = new VscodeEmitter<LogLevel>();

		this.onDidChangeLogLevel = this.#onDidChangeLogLevelEmitter.event;
	}

	get logLevel(): LogLevel {
		return this.#currentLogLevel;
	}

	// If Mountain supports setting log level for an output channel, this would make an RPC call.
	// For now, it's a local change for the shim.
	public setLogLevel(level: LogLevel): void {
		if (this.#currentLogLevel !== level) {
			this.#currentLogLevel = level;

			// Use super's _log
			super["_log"](`Log level set to ${LogLevel[level]}`);

			this.#onDidChangeLogLevelEmitter.fire(this.#currentLogLevel);

			// TODO: If MainThreadOutputService supports it:
			// Map vscode.LogLevel to VscodeLogLevel
			// this.#proxy?.$setLogLevel?.(this.#id, VscodeLogLevel[LogLevel[level]]);
		}
	}

	// Log methods
	public trace(message: string, ...args: any[]): void {
		if (this.logLevel <= LogLevel.Trace) {
			const formattedArgs = args
				.map((arg) =>
					typeof arg === "object" ? JSON.stringify(arg) : arg,
				)
				.join(" ");

			this.appendLine(
				`[Trace] ${message}${args.length > 0 ? " " + formattedArgs : ""}`,
			);
		}
	}

	public debug(message: string, ...args: any[]): void {
		if (this.logLevel <= LogLevel.Debug) {
			const formattedArgs = args
				.map((arg) =>
					typeof arg === "object" ? JSON.stringify(arg) : arg,
				)
				.join(" ");

			this.appendLine(
				`[Debug] ${message}${args.length > 0 ? " " + formattedArgs : ""}`,
			);
		}
	}

	public info(message: string, ...args: any[]): void {
		if (this.logLevel <= LogLevel.Info) {
			const formattedArgs = args
				.map((arg) =>
					typeof arg === "object" ? JSON.stringify(arg) : arg,
				)
				.join(" ");

			this.appendLine(
				`[Info] ${message}${args.length > 0 ? " " + formattedArgs : ""}`,
			);
		}
	}

	public warn(message: string, ...args: any[]): void {
		if (this.logLevel <= LogLevel.Warning) {
			const formattedArgs = args
				.map((arg) =>
					typeof arg === "object" ? JSON.stringify(arg) : arg,
				)
				.join(" ");

			this.appendLine(
				`[Warn] ${message}${args.length > 0 ? " " + formattedArgs : ""}`,
			);
		}
	}

	public error(message: string | Error, ...args: any[]): void {
		if (this.logLevel <= LogLevel.Error) {
			let fullMessage =
				message instanceof Error
					? `${message.message}${message.stack ? "\n" + message.stack : ""}`
					: message;

			const formattedArgs = args
				.map((arg) =>
					typeof arg === "object" ? JSON.stringify(arg) : arg,
				)
				.join(" ");

			this.appendLine(
				`[Error] ${fullMessage}${args.length > 0 ? " " + formattedArgs : ""}`,
			);
		}
	}

	override dispose(): void {
		super.dispose();

		this.#onDidChangeLogLevelEmitter.dispose();
	}
}

export class ShimOutputService extends BaseCocoonShim {
	public readonly _serviceBrand: undefined;

	#mainThreadOutputProxy: MainThreadOutputServiceShape | null = null;

	// Not used if $register returns ID
	// #channelCounter: number = 1;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostOutputService", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadOutputProxy = this._getProxy(
				MainContext.MainThreadOutputService as ProxyIdentifier<MainThreadOutputServiceShape>,
			);
		}

		if (!this.#mainThreadOutputProxy) {
			this._logError("Failed to get MainThreadOutputService proxy!");
		}
	}

	public createOutputChannel(name: string): OutputChannel;

	public createOutputChannel(
		name: string,

		options: { log: true; languageId?: string },
	): LogOutputChannel;

	// Deprecated form
	public createOutputChannel(name: string, languageId: string): OutputChannel;

	public createOutputChannel(
		name: string,

		optionsOrLangId?: OutputChannelOptions,
	): OutputChannel | LogOutputChannel {
		name = String(name).trim();

		if (!name) {
			throw new Error("Output channel name cannot be empty");
		}

		let isLogChannel = false;

		let languageId: string | undefined = undefined;

		if (typeof optionsOrLangId === "string") {
			// Deprecated: languageId directly
			languageId = optionsOrLangId;
		} else if (typeof optionsOrLangId === "object") {
			isLogChannel = optionsOrLangId.log === true;

			languageId = optionsOrLangId.languageId;
		}

		this._log(
			`createOutputChannel called: name='${name}', isLog=${isLogChannel}, langId=${languageId}`,
		);

		if (!this.#mainThreadOutputProxy) {
			this._logError(
				"Cannot create channel, RPC proxy unavailable. Returning NOP channel.",
			);

			return this._createNopChannel(name, isLogChannel);
		}

		// Use name as a temporary ID for the ShimOutputChannel constructor.
		// The actual ID for RPC calls will be the one returned by $register.
		// This requires the ShimOutputChannel to potentially update its ID, or for $register to be synchronous (not ideal).
		// For now, we'll register and then create the shim with the ID from Mountain.
		// This makes createOutputChannel async, which differs from vscode.window.createOutputChannel.
		// To match vscode's sync API, we'd do:
		// 1. Create ShimOutputChannel with a temporary/local ID (e.g., name).
		// 2. Asynchronously call $register. When it resolves with the real ID,

		//    the ShimOutputChannel instance would need to be updated, or it uses the name for subsequent calls
		//    and Mountain maps the name to its internal ID. This latter approach is simpler for the shim.
		// Let's stick to the simpler approach: ShimOutputChannel uses the `name` as its `channelId` for RPC.
		// Mountain's MainThreadOutputService then needs to map this name (or a registered ID based on name)
		// to its internal representation.

		// Shim will use this name as ID for RPC with MainThread.
		const channelIdForRpc = name;

		// $register is still useful to inform Mountain and potentially get a file URI for log channels.
		// It returns a string, which is the *actual channel ID* on the main thread.
		// For simplicity in this shim, we might ignore this returned ID if `channelIdForRpc` (name) is sufficient.
		this.#mainThreadOutputProxy
			.$register(
				name,

				null /* file URI for log channel */,

				languageId,

				undefined /* extensionId */,
			)
			.then((mainThreadChannelId) => {
				this._log(
					`Channel '${name}' registered on main thread with actual ID: ${mainThreadChannelId}. Shim will use '${channelIdForRpc}' for RPC unless updated.`,
				);

				// If ShimOutputChannel needs the mainThreadChannelId, it would need to be passed or updated.
			})
			.catch((err: any) => {
				this._logError(
					`Failed to register output channel '${name}' on main thread:`,

					err,
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
	): OutputChannel | LogOutputChannel {
		const nopBase = {
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

				logLevel: LogLevel.Off,

				onDidChangeLogLevel: VscodeEvent.None,

				trace: () => {},

				debug: () => {},

				info: () => {},

				warn: () => {},

				error: () => {},

				// Added setLogLevel to LogOutputChannel NOP
				setLogLevel: () => {},
			} as LogOutputChannel;
		} else {
			return nopBase as OutputChannel;
		}
	}
}

// Class is already exported
// export { ShimOutputService };
