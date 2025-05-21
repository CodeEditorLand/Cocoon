/*---------------------------------------------------------------------------------------------
 * Cocoon Terminal Service Shim (shims/terminal-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.window` terminal-related APIs (via `IExtHostTerminalService`).
 * Handles terminal creation, state management, and environment variable collections,
 *
 *
 * proxying most actions to Mountain.
 *
 * Responsibilities:
 * - `createTerminal()`: Proxies to Mountain via RPC to create a terminal backend.
 * - `ShimTerminalImpl`: Represents a terminal instance, proxying actions (`show`, `sendText`, `dispose`)
 *   to Mountain via RPC. Manages `processId` and `exitStatus`.
 * - Terminal Lifecycle Events (`onDidOpenTerminal`, etc.): Fired based on RPC notifications from Mountain.
 * - `getEnvironmentVariableCollection()`: Returns `ShimEnvironmentVariableCollectionImpl`.
 * - `ShimEnvironmentVariableCollectionImpl`: Manages environment changes for an extension,
 *
 *
 *   notifying Mountain via Vine IPC.
 *
 * Key Interactions:
 * - Provides terminal APIs accessible via `vscode.window`.
 * - Uses `RPCProtocol` for terminal actions and lifecycle events.
 * - Uses direct Vine IPC (`cocoon-ipc.ts`) for environment variable changes.
 * - Relies on `MainThreadTerminalService` in Mountain.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import { IDisposable } from "vs/base/common/lifecycle";
// For URI marshalling checks
import { MarshalledId } from "vs/base/common/marshallingIds";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import {
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type EnvironmentVariableMutator as VscodeEnvironmentVariableMutator,
	EnvironmentVariableMutatorType as VscodeEnvironmentVariableMutatorType,
	type Extension as VscodeExtension,
	type ExtensionTerminalOptions as VscodeExtensionTerminalOptions,
	// For ExtensionTerminalOptions.pty
	Pseudoterminal as VscodePseudoterminal,
	// Use VscodeTerminal to distinguish from internal types
	type Terminal as VscodeTerminal,
	// For pty data events
	Event as VscodeTerminalDataEvent,
	// For ExtensionTerminalOptions.pty
	TerminalDimensions as VscodeTerminalDimensions,
	TerminalExitReason as VscodeTerminalExitReason,
	type TerminalExitStatus as VscodeTerminalExitStatus,
	type TerminalOptions as VscodeTerminalOptions,
	type TerminalState as VscodeTerminalState,
	// For cwd or iconPath
	Uri as VscodeUri,
	// Not used directly if passing options object
	// TerminalLocation as VscodeApiTerminalLocation,

	// For TerminalOptions.location
	type ViewColumn as VscodeViewColumn,
} from "vscode";

// Assuming API objects from 'vscode' shim or real API
// For environment variable IPC
import * as ipc from "../cocoon-ipc";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";

// --- Type Definitions ---

// For URI components (used in RPC), should align with BaseCocoonShim's output
interface ILocalUriComponents {
	$mid?: number;

	scheme: string;

	path: string;

	authority?: string;

	query?: string;

	fragment?: string;

	external?: string;

	fsPath?: string;
}

// Options for $createTerminal RPC call (subset of vscode.TerminalOptions & ExtensionTerminalOptions)
// TODO: This MUST align with what MainThreadTerminalService.$createTerminal expects.
interface ICreateTerminalRpcOptions {
	name?: string;

	shellPath?: string;

	shellArgs?: string[] | string;

	// Path string or URI components
	cwd?: string | ILocalUriComponents;

	// null value means delete
	env?: { [key: string]: string | null };

	iconPath?:
		| ILocalUriComponents
		| { light: ILocalUriComponents; dark: ILocalUriComponents };

	// TerminalColor.id
	color?: string;

	message?: string;

	location?:
		| VscodeViewColumn
		| /* vscode.TerminalEditorLocationOptions */ {
				viewColumn?: VscodeViewColumn;

				preserveFocus?: boolean;
		  }
		| /* vscode.TerminalLocation */ number;

	isTransient?: boolean;

	// For PTY:
	// Indicate if it's a PTY-backed terminal
	isPty?: boolean;

	// If PTYs are managed with handles
	ptyId?: number;

	// Part of TerminalOptions
	// useShellEnvironment?: boolean;

	// Part of TerminalOptions
	// strictEnv?: boolean;

	// Part of TerminalOptions
	hideFromUser?: boolean;
}

// Result from $createTerminal RPC call
// TODO: This MUST align with what MainThreadTerminalService.$createTerminal returns.
interface ITerminalLaunchRpcResult {
	id: number;

	name: string;

	// Optional: PID might be sent later via $acceptTerminalProcessId
	pid?: number;

	// Initial title might differ from name
	// title?: string;

	// If this distinction is made on main thread
	// isFeatureTerminal?: boolean;
}

// For MainThreadTerminalService RPC proxy
interface MainThreadTerminalServiceShape {
	$createTerminal(
		options: ICreateTerminalRpcOptions,
	): Promise<ITerminalLaunchRpcResult | undefined>;

	// viewColumn was here, but show in API doesn't always take it. $reveal might.
	$show(terminalId: number, preserveFocus?: boolean): Promise<void>;

	$hide(terminalId: number): Promise<void>;

	$sendText(terminalId: number, text: string): Promise<void>;

	$dispose(terminalId: number): Promise<void>;

	// TODO: Add methods for PTY interaction if supported: $sendProcessInput, $resize, $shutdown
	// For PTY data flow
	// $pty maternelle(id:number, initialDimensions: VscodeTerminalDimensions | undefined): Promise<void>
	// For flow control with PTY
	// $acknowledgeDataEvent(id: number, charCount: number): void;
}

// For ExtHostTerminalService (methods called BY Mountain)
// TODO: This MUST align with VS Code's ExtHostTerminalServiceShape
interface ExtHostTerminalServiceRpcShape {
	$acceptTerminalOpened(
		id: number,

		name: string,

		shellLaunchConfigName?: string /* for title */,

		isFeatureTerminal?: boolean,
	): void;

	$acceptTerminalClosed(
		id: number,

		exitCode: number | undefined,

		exitReason: VscodeTerminalExitReason | undefined,
	): void;

	$acceptTerminalProcessId(id: number, processId: number): void;

	$acceptActiveTerminalChanged(id: number | null): void;

	$acceptTerminalTitleChanged(id: number, name: string): void;

	// For PTY output
	$acceptTerminalData?(id: number, data: string): void;

	// $acceptProcessStateChange?(id: number, /* ProcessState */ any): void;

	// $acceptTerminalDimensions?(id: number, cols: number, rows: number): void;

	// $acceptTaskDetection?(id: number, name: string, shellType: string): void;
}

// Options for ShimEnvironmentVariableCollectionImpl constructor
interface EnvVarCollectionOptions {
	persistent?: boolean;

	description?: string;

	// VS Code internal also has `scope: EnvironmentVariableScope | undefined`
}

class ShimTerminalImpl implements VscodeTerminal {
	readonly #proxy: MainThreadTerminalServiceShape | null;

	readonly #id: number;

	#nameInternal: string;

	readonly #onDidDisposeEmitter = new VscodeEmitter<void>();

	#logService?: ILogService;

	#isDisposed = false;

	readonly #processIdPromise: Promise<number | undefined>;

	// Asserted: set in constructor
	#processIdPromiseResolver!: (pid: number | undefined) => void;

	#exitStatusInternal: VscodeTerminalExitStatus | undefined = undefined;

	readonly #creationOptionsInternal: Readonly<
		VscodeTerminalOptions | VscodeExtensionTerminalOptions
	>;

	constructor(
		id: number,

		initialName: string,

		creationOptions: Readonly<
			VscodeTerminalOptions | VscodeExtensionTerminalOptions
		>,

		proxy: MainThreadTerminalServiceShape | null,

		logService?: ILogService,
	) {
		this.#id = id;

		this.#nameInternal = initialName;

		// Store a copy
		this.#creationOptionsInternal = { ...creationOptions };

		this.#proxy = proxy;

		this.#logService = logService;

		this.#processIdPromise = new Promise<number | undefined>((resolve) => {
			this.#processIdPromiseResolver = resolve;
		});

		this._logShimOp(`Created (id: ${this.#id})`);
	}

	private _logShimOp(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[Terminal][${this.#nameInternal}(${this.#id})] ${msg}`,

			...args,
		);
	}

	private _logShimError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[Terminal][${this.#nameInternal}(${this.#id})] ${msg}`,

			...args,
		);
	}

	private _validateAndGetProxy(): MainThreadTerminalServiceShape {
		if (this.#isDisposed)
			throw new Error(
				`Terminal '${this.#nameInternal}' (id: ${this.#id}) has been disposed.`,
			);

		if (!this.#proxy)
			throw new Error(
				`Terminal '${this.#nameInternal}' (id: ${this.#id}) RPC proxy is unavailable.`,
			);

		return this.#proxy;
	}

	get name(): string {
		return this.#nameInternal;
	}

	_setNameInternal(newName: string): void {
		this.#nameInternal = newName;

		// Called by $acceptTerminalTitleChanged
	}

	get exitStatus(): VscodeTerminalExitStatus | undefined {
		return this.#exitStatusInternal;
	}

	_setExitStatusInternal(status: VscodeTerminalExitStatus): void {
		this.#exitStatusInternal = status;
	}

	get processId(): Promise<number | undefined> {
		return this.#processIdPromise;
	}

	_setProcessIdInternal(pid: number | undefined): void {
		if (this.#processIdPromiseResolver) {
			// Check if already resolved
			this.#processIdPromiseResolver(pid);

			// Prevent future resolution
			(this.#processIdPromiseResolver as any) = null;
		} else if (pid !== undefined) {
			// If trying to set a new PID after initial resolution
			this._logShimOp(
				`ProcessId already resolved, new PID ${pid} ignored.`,
			);
		}
	}

	get creationOptions(): Readonly<
		VscodeTerminalOptions | VscodeExtensionTerminalOptions
	> {
		return this.#creationOptionsInternal;
	}

	get state(): VscodeTerminalState {
		return Object.freeze({
			isInteractedWith: false,
		}); /* TODO: Sync state from MainThread */
	}

	// get pty(): VscodePseudoterminal | undefined { /* TODO: If PTYs fully supported */ return undefined; }

	public sendText(text: string, addNewLine = true): void {
		try {
			const proxy = this._validateAndGetProxy();

			const message = text + (addNewLine ? "\r" : "");

			// this._logShimOp(`sendText: "${message.substring(0, 30)}..."`);

			proxy.$sendText(this.#id, message).catch((e) =>
				this._logShimError(
					"RPC $sendText failed:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("sendText validation failed:", e);
		}
	}

	public show(preserveFocus = false): void {
		try {
			const proxy = this._validateAndGetProxy();

			// this._logShimOp(`show(preserveFocus=${preserveFocus})`);

			proxy.$show(this.#id, preserveFocus).catch((e) =>
				this._logShimError(
					"RPC $show failed:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("show validation failed:", e);
		}
	}

	public hide(): void {
		try {
			const proxy = this._validateAndGetProxy();

			// this._logShimOp(`hide`);

			proxy.$hide(this.#id).catch((e) =>
				this._logShimError(
					"RPC $hide failed:",

					refineError(e, this.#logService),
				),
			);
		} catch (e: any) {
			this._logShimError("hide validation failed:", e);
		}
	}

	public dispose(): void {
		if (!this.#isDisposed) {
			this._logShimOp(`dispose`);

			this.#isDisposed = true;

			this.#proxy?.$dispose(this.#id).catch((e) =>
				this._logShimError(
					"RPC $dispose failed:",

					refineError(e, this.#logService),
				),
			);

			this.#onDidDisposeEmitter.fire();

			this.#onDidDisposeEmitter.dispose();

			if (this.#processIdPromiseResolver) {
				this._setProcessIdInternal(undefined);
			}

			this.#proxy = null;

			this.#logService = undefined;
		}
	}

	public readonly onDidDispose: VscodeEvent<void> =
		this.#onDidDisposeEmitter.event;

	// TODO: Implement other events like onDidWriteData, onDidChangeState if PTYs/state sync are added.
}

class ShimEnvironmentVariableCollectionImpl
	implements VscodeEnvironmentVariableCollection
{
	readonly #extensionId: string;

	#persistentInternal: boolean;

	readonly #map = new Map<string, VscodeEnvironmentVariableMutator>();

	readonly #ipcLayer: typeof ipc;

	#logService?: ILogService;

	readonly #descriptionInternal?: string;

	// EnvironmentVariableScope if used
	readonly #scopeInternal?: any;

	// TODO: onDidChange event for EnvVarCollection
	// private readonly _onDidChangeCollection: VscodeEmitter<void> = new VscodeEmitter<void>();

	// public readonly onDidChange: VscodeEvent<void> = this._onDidChangeCollection.event;

	constructor(
		extension: VscodeExtension<any>,

		options: EnvVarCollectionOptions | undefined,

		ipcLayer: typeof ipc,

		logService?: ILogService,
	) {
		this.#extensionId = extension.id;

		this.#persistentInternal = options?.persistent ?? true;

		this.#descriptionInternal = options?.description;

		// If scope is part of options
		// this.#scopeInternal = options?.scope;

		this.#ipcLayer = ipcLayer;

		this.#logService = logService;

		this._logShimOp(
			`Created (persistent=${this.#persistentInternal}, desc='${this.#descriptionInternal || ""}')`,
		);
	}

	private _logShimOp(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[EnvVarCol][${this.#extensionId}] ${msg}`,

			...args,
		);
	}

	private _logShimError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[EnvVarCol][${this.#extensionId}] ${msg}`,

			...args,
		);
	}

	get persistent(): boolean {
		return this.#persistentInternal;
	}

	get description(): string | undefined {
		return this.#descriptionInternal;
	}

	// get scope(): EnvironmentVariableScope | undefined { return this.#scopeInternal; }

	public replace(variable: string, value: string): void {
		this._set(variable, {
			value,

			type: VscodeEnvironmentVariableMutatorType.Replace,
		});
	}

	public append(variable: string, value: string): void {
		this._set(variable, {
			value,

			type: VscodeEnvironmentVariableMutatorType.Append,
		});
	}

	public prepend(variable: string, value: string): void {
		this._set(variable, {
			value,

			type: VscodeEnvironmentVariableMutatorType.Prepend,
		});
	}

	private _set(
		variable: string,

		mutator: VscodeEnvironmentVariableMutator,
	): void {
		if (typeof variable !== "string" || !variable)
			throw new Error(
				"Invalid variable name for environment collection.",
			);

		// this._logShimOp(`set: var='${variable}', mutatorType=${VscodeEnvironmentVariableMutatorType[mutator.type]}`);

		// Store a copy
		this.#map.set(variable, { ...mutator });

		try {
			this.#ipcLayer.sendNotificationToMountain(
				"terminal_setEnvironmentVariable",

				{
					extensionId: this.#extensionId,

					variable,

					mutator: { ...mutator },

					persistent:
						this
							.#persistentInternal /* scope: this.#scopeInternal */,
				},
			);

			// this._onDidChangeCollection.fire();
		} catch (e: any) {
			this._logShimError("IPC sendNotification for setEnvVar failed:", e);
		}
	}

	public get(variable: string): VscodeEnvironmentVariableMutator | undefined {
		const mutator = this.#map.get(variable);

		return mutator ? Object.freeze({ ...mutator }) : undefined;
	}

	public delete(variable: string): void {
		if (typeof variable !== "string" || !variable)
			throw new Error("Invalid variable name for delete.");

		// this._logShimOp(`delete: var='${variable}'`);

		if (this.#map.delete(variable)) {
			try {
				this.#ipcLayer.sendNotificationToMountain(
					"terminal_deleteEnvironmentVariable",

					{
						extensionId: this.#extensionId,

						variable,

						persistent:
							this
								.#persistentInternal /* scope: this.#scopeInternal */,
					},
				);

				// this._onDidChangeCollection.fire();
			} catch (e: any) {
				this._logShimError(
					"IPC sendNotification for deleteEnvVar failed:",

					e,
				);
			}
		} else {
			// Even if not in local cache, notify Mountain to ensure consistency if it had state.
			// this._logShimOp(`delete: var='${variable}' not in local cache, notifying Mountain.`);

			try {
				this.#ipcLayer.sendNotificationToMountain(
					"terminal_deleteEnvironmentVariable",

					{
						extensionId: this.#extensionId,

						variable,

						persistent:
							this
								.#persistentInternal /* scope: this.#scopeInternal */,
					},
				);
			} catch (e: any) {
				this._logShimError(
					"IPC sendNotification for deleteEnvVar (not cached) failed:",

					e,
				);
			}
		}
	}

	public clear(): void {
		// this._logShimOp(`clear`);

		if (this.#map.size > 0) {
			this.#map.clear();

			try {
				this.#ipcLayer.sendNotificationToMountain(
					"terminal_clearEnvironmentVariableCollection",

					{
						extensionId: this.#extensionId,

						persistent:
							this
								.#persistentInternal /* scope: this.#scopeInternal */,
					},
				);

				// this._onDidChangeCollection.fire();
			} catch (e: any) {
				this._logShimError(
					"IPC sendNotification for clearEnvVarCol failed:",

					e,
				);
			}
		}
	}

	public forEach(
		callback: (
			variable: string,

			mutator: VscodeEnvironmentVariableMutator,

			collection: VscodeEnvironmentVariableCollection,
		) => any,

		thisArg?: any,
	): void {
		this.#map.forEach((mutator, variable) => {
			callback.call(
				thisArg,

				variable,

				Object.freeze({ ...mutator }),

				this,
			);
		});
	}

	public [Symbol.iterator](): IterableIterator<
		[string, VscodeEnvironmentVariableMutator]
	> {
		const mapIter = this.#map.entries();

		return {
			next: () => {
				const result = mapIter.next();

				if (result.done)
					return {
						value: undefined,

						done: true,
					} as IteratorReturnResult<undefined>;

				const [key, value] = result.value;

				return {
					value: [key, Object.freeze({ ...value })] as [
						string,
						VscodeEnvironmentVariableMutator,
					],

					done: false,
				};
			},

			[Symbol.iterator]: function () {
				return this;
			},
		};
	}

	public toArray(): ReadonlyArray<
		[string, VscodeEnvironmentVariableMutator]
	> {
		return Object.freeze(
			Array.from(this.#map.entries()).map(([key, value]) => [
				key,

				{ ...value },
			]),
		);
	}
}

// This should implement vscode.window.terminals API parts + IExtHostTerminalService (for DI)
// and ExtHostTerminalServiceRpcShape (for calls from MainThread)
export class ShimExtHostTerminalService
	extends BaseCocoonShim
	implements ExtHostTerminalServiceRpcShape
{
	// For IExtHostTerminalService
	/*, IExtHostTerminalService */ public readonly _serviceBrand: undefined;

	#mainThreadTerminalProxy: MainThreadTerminalServiceShape | null = null;

	readonly #terminals = new Map<number, ShimTerminalImpl>();

	readonly #envVariableCollections = new Map<
		string,
		ShimEnvironmentVariableCollectionImpl
	>();

	readonly #onDidOpenTerminalEmitter = new VscodeEmitter<VscodeTerminal>();

	// API uses Terminal, not complex event obj
	readonly #onDidCloseTerminalEmitter = new VscodeEmitter<VscodeTerminal>();

	readonly #onDidChangeActiveTerminalEmitter = new VscodeEmitter<
		VscodeTerminal | undefined
	>();

	readonly #onDidChangeTerminalStateEmitter =
		new VscodeEmitter<VscodeTerminal>();

	// TODO: Add other emitters like onDidWriteTerminalData, onDidChangeShell

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostTerminalService", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadTerminalProxy = this._getProxy(
				MainContext.MainThreadTerminalService as ProxyIdentifier<MainThreadTerminalServiceShape>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostTerminalService as ProxyIdentifier<ExtHostTerminalServiceRpcShape>,

					this,
				);

				this._log(
					"Registered self for incoming RPC calls (ExtHostTerminalService).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set ExtHostTerminalService for RPC:",

					e,
				);
			}
		}

		if (!this.#mainThreadTerminalProxy) {
			this._logError(
				"Failed to get MainThreadTerminalService proxy! Terminal features will be severely impaired.",
			);
		}
	}

	// --- vscode.window API (subset for terminals) ---
	public async createTerminal(
		nameOrOptions?: CreateTerminalOptions,

		shellPath?: string,

		shellArgs?: string[] | string,
	): Promise<VscodeTerminal> {
		let options: VscodeTerminalOptions | VscodeExtensionTerminalOptions;

		if (typeof nameOrOptions === "string") {
			options = { name: nameOrOptions, shellPath, shellArgs };
		} else {
			options = nameOrOptions || {};
		}

		this._log(
			`createTerminal: name='${options.name}', shellPath='${options.shellPath}'`,
		);

		if (!this.#mainThreadTerminalProxy) {
			this._logError(
				"Cannot create terminal: MainThreadTerminalService proxy unavailable.",
			);

			throw new Error(
				"Cannot create terminal: Terminal service proxy is not available.",
			);
		}

		try {
			const internalOptions: ICreateTerminalRpcOptions = {
				// Map to RPC DTO
				name: options.name,

				shellPath: options.shellPath,

				shellArgs: options.shellArgs,

				cwd: options.cwd
					? options.cwd instanceof VscodeUri
						? (this._convertApiArgToInternal(
								options.cwd,
							) as ILocalUriComponents)
						: String(options.cwd)
					: undefined,

				env: options.env,

				iconPath: options.iconPath
					? options.iconPath instanceof VscodeUri
						? this._convertApiArgToInternal(options.iconPath)
						: this._convertApiArgToInternal({
								light: options.iconPath.light,

								dark: options.iconPath.dark,
							})
					: undefined,

				// Not standard on TerminalOptions
				message: (options as any).message,

				hideFromUser: options.hideFromUser,

				// Not standard on TerminalOptions
				isTransient: (options as any).isTransient,

				// PTY specific options
				isPty: !!(options as VscodeExtensionTerminalOptions).pty,

				// If PTYs are pre-registered and have IDs
				// ptyId: ...
			};

			if (options.location && typeof options.location === "object") {
				// TerminalEditorLocationOptions
				internalOptions.location = {
					viewColumn: options.location.viewColumn,

					preserveFocus: options.location.preserveFocus,
				};
			} else if (typeof options.location === "number") {
				// TerminalLocation enum
				internalOptions.location = options.location;
			}

			const result =
				await this.#mainThreadTerminalProxy.$createTerminal(
					internalOptions,
				);

			if (!result || typeof result.id !== "number") {
				this._logError(
					"Failed to create terminal via RPC: Main thread returned invalid result.",

					result,
				);

				throw new Error("Failed to create terminal backend.");
			}

			const terminal = new ShimTerminalImpl(
				result.id,

				result.name || options.name || `Terminal ${result.id}`,

				options,

				this.#mainThreadTerminalProxy,

				this._logService,
			);

			this.#terminals.set(result.id, terminal);

			// $acceptTerminalOpened (called by main thread) will fire the onDidOpenTerminal event.
			return terminal;
		} catch (e: any) {
			this._logError("Failed to create terminal via RPC:", e);

			throw refineError(e, this._logService, "createTerminal");
		}
	}

	get terminals(): readonly VscodeTerminal[] {
		return Object.freeze([...this.#terminals.values()]);
	}

	get activeTerminal(): VscodeTerminal | undefined {
		// This needs to be updated by $acceptActiveTerminalChanged from Mountain.
		// TODO: Store active terminal ID and look it up.
		this._logWarnOnce(
			"activeTerminal is based on incoming RPC events, may not be up-to-date if events missed.",
		);

		// Placeholder until state is synced
		return undefined;
	}

	public getEnvironmentVariableCollection(
		extension: VscodeExtension<any>,

		options?: EnvVarCollectionOptions,
	): VscodeEnvironmentVariableCollection {
		// The `options` for vscode.EnvironmentVariableCollection in the API includes `scope`.
		// The original shim's EnvVarCollectionOptions only had `persistent`.
		// TODO: Align EnvVarCollectionOptions with vscode.EnvironmentVariableCollectionOptions if `scope` is needed.
		if (!extension?.id)
			throw new Error(
				"Invalid extension provided to getEnvironmentVariableCollection",
			);

		const extId = extension.id;

		// Can be verbose
		// this._log(`getEnvironmentVariableCollection: extId=${extId}`);

		if (!this.#envVariableCollections.has(extId)) {
			this.#envVariableCollections.set(
				extId,

				new ShimEnvironmentVariableCollectionImpl(
					extension,

					options,

					ipc,

					this._logService,
				),
			);
		}

		return this.#envVariableCollections.get(extId)!;
	}

	// --- Events ---
	get onDidOpenTerminal(): VscodeEvent<VscodeTerminal> {
		return this.#onDidOpenTerminalEmitter.event;
	}

	get onDidCloseTerminal(): VscodeEvent<VscodeTerminal> {
		return this.#onDidCloseTerminalEmitter.event;
	}

	get onDidChangeActiveTerminal(): VscodeEvent<VscodeTerminal | undefined> {
		return this.#onDidChangeActiveTerminalEmitter.event;
	}

	get onDidChangeTerminalState(): VscodeEvent<VscodeTerminal> {
		return this.#onDidChangeTerminalStateEmitter.event;
	}

	// TODO: get onDidWriteData, onDidChangeShellType etc.

	// --- RPC Methods Called BY Mountain (ExtHostTerminalServiceRpcShape) ---
	public $acceptTerminalOpened(
		id: number,

		name: string,

		_shellLaunchConfigName?: string,

		_isFeatureTerminal?: boolean,
	): void {
		this._log(`$acceptTerminalOpened: id=${id}, name=${name}`);

		let terminal = this.#terminals.get(id);

		if (!terminal) {
			// Terminal might have been created by main thread directly or createTerminal promise not yet resolved on ext host side.
			// Need creationOptions to properly create ShimTerminalImpl.
			// For now, use defaults if creating implicitly.
			// TODO: MainThread should ideally send enough info (like original options) if it expects ExtHost to create the object.
			// Or, ExtHost's createTerminal should fully await the MainThread creation and then $acceptTerminalOpened is just a confirmation/update.
			// Minimal
			const creationOpts: VscodeTerminalOptions = { name };

			terminal = new ShimTerminalImpl(
				id,

				name,

				creationOpts,

				this.#mainThreadTerminalProxy,

				this._logService,
			);

			this.#terminals.set(id, terminal);

			this._log(
				`   Terminal shim for ID ${id} implicitly created by $acceptTerminalOpened.`,
			);
		} else {
			// Update name if different
			terminal._setNameInternal(name);
		}

		this.#onDidOpenTerminalEmitter.fire(terminal);

		// Opening is a state change
		this.#onDidChangeTerminalStateEmitter.fire(terminal);
	}

	public $acceptTerminalClosed(
		id: number,

		exitCode: number | undefined,

		exitReason: VscodeTerminalExitReason | undefined,
	): void {
		const reasonStr =
			exitReason !== undefined
				? VscodeTerminalExitReason[exitReason]
				: "Unknown";

		this._log(
			`$acceptTerminalClosed: id=${id}, code=${exitCode}, reason=${reasonStr}`,
		);

		const terminal = this.#terminals.get(id);

		if (terminal) {
			terminal._setExitStatusInternal({
				code: exitCode,

				reason: exitReason ?? VscodeTerminalExitReason.Unknown,
			});

			this.#terminals.delete(id);

			// API expects the Terminal instance
			this.#onDidCloseTerminalEmitter.fire(terminal);

			// Ensure internal cleanup
			terminal.dispose();
		} else {
			this._logWarn(
				`Received $acceptTerminalClosed for unknown terminal ID: ${id}`,
			);
		}
	}

	public $acceptTerminalProcessId(id: number, processId: number): void {
		this._log(`$acceptTerminalProcessId: id=${id}, pid=${processId}`);

		this.#terminals.get(id)?._setProcessIdInternal(processId);
	}

	public $acceptActiveTerminalChanged(id: number | null): void {
		this._log(`$acceptActiveTerminalChanged: new active ID=${id}`);

		const activeTerminal =
			id === null ? undefined : this.#terminals.get(id);

		// TODO: Update internal state for `this.activeTerminal` getter.
		this.#onDidChangeActiveTerminalEmitter.fire(activeTerminal);
	}

	public $acceptTerminalTitleChanged(id: number, name: string): void {
		this._log(`$acceptTerminalTitleChanged: id=${id}, newName=${name}`);

		const terminal = this.#terminals.get(id);

		if (terminal) {
			terminal._setNameInternal(name);

			this.#onDidChangeTerminalStateEmitter.fire(terminal);
		} else {
			this._logWarn(
				`Received $acceptTerminalTitleChange for unknown terminal ID: ${id}`,
			);
		}
	}

	// TODO: Implement other $accept* methods if PTY data, dimensions, process state changes are proxied.
	// public $acceptTerminalData(id: number, data: string): void {

	//     const terminal = this.#terminals.get(id);

	// terminal?._onDidWriteDataEmitter.fire(data); // If terminal has this emitter
	//
	// }
}
