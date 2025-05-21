/*---------------------------------------------------------------------------------------------
 * Cocoon Terminal Service Shim (shims/terminal-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.window` terminal-related APIs (`IExtHostTerminalService`).
 * Handles terminal creation, state management, process interaction (if applicable),
 *
 *
 *
 *
 * and environment variable collections, proxying most actions to Mountain.
 *
 * Responsibilities:
 * - Implementing `createTerminal` by proxying to Mountain via RPC.
 * - Managing terminal instances (`ShimTerminalImpl`) created via the API (`#terminals`).
 * - Handling `show`, `hide`, `sendText`, `dispose` calls on `ShimTerminalImpl` instances
 *   by proxying them to Mountain (`$show`, `$hide`, `$sendText`, `$dispose` RPC calls).
 * - Providing terminal lifecycle events (`onDidOpenTerminal`, `onDidCloseTerminal`, etc.)
 *   by listening to notifications from Mountain via RPC (`$acceptTerminalOpened`, `$acceptTerminalClosed`).
 * - Implementing `getEnvironmentVariableCollection` to return a shimmed collection object (`ShimEnvironmentVariableCollectionImpl`).
 * - Proxying changes made to the environment variable collection (`set`, `delete`, `clear`)
 *   back to Mountain via **Vine IPC notifications** (`terminal_*` methods).
 *
 * Key Interactions:
 * - Provides parts of `vscode.window` terminal APIs.
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadTerminalService)` for terminal actions.
 * - Receives terminal lifecycle events from Mountain via RPC.
 * - Sends environment variable change notifications to Mountain via `Vine` (`cocoon-ipc.js`).
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// VS Code event system

import { IDisposable } from "vs/base/common/lifecycle";
import {
	ExtHostContext,
	MainContext,
	// Import specific DTOs if available from extHost.protocol, e.g.:
	// ICreateTerminalOptions, ITerminalLaunchResult, ITerminalDimensionsDto
} from "vs/workbench/api/common/extHost.protocol";
// Needs bundling
import {
	EnvironmentVariableCollection,
	EnvironmentVariableMutator,
	EnvironmentVariableMutatorType,
	// For getEnvironmentVariableCollection
	Extension,
	// For createTerminal options
	ExtensionTerminalOptions,
	Terminal,
	TerminalExitReason,
	// Type for exitStatus
	TerminalExitStatus,
	// Enum
	TerminalLocation,
	TerminalOptions,
	// Type for state
	TerminalState,
	// If createTerminal with profile is supported
	// TerminalProfile,
	// If registering profile providers
	// TerminalProfileProvider,
	// If PTYs are handled
	// Pseudoterminal,
	// For onDidWriteData
	// TerminalDataWriteEvent,
} from "vscode";

// Assuming API objects from 'vscode' shim
// Access to Vine IPC layer
import * as ipc from "..";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// --- Interfaces based on VS Code API and internal usage ---

// For MainThreadTerminalService RPC proxy
interface MainThreadTerminalServiceShape {
	$createTerminal(
		options: any /* ICreateTerminalOptions */,
	): Promise<any /* ITerminalLaunchResult */ | undefined>;

	$show(terminalId: number, preserveFocus?: boolean): Promise<void>;

	$hide(terminalId: number): Promise<void>;

	$sendText(terminalId: number, text: string): Promise<void>;

	$dispose(terminalId: number): Promise<void>;

	// Add other methods like $getXtermColor?(id), $getDimensions?(id), $setDimensions?(id, dim)
}

// For ExtHostTerminalService (methods called BY Mountain)
interface ExtHostTerminalServiceShape {
	$acceptTerminalOpened(
		id: number,

		name: string,

		isFeatureTerminal?: boolean,

		// isFeatureTerminal might be part of launch result instead
	): void;

	$acceptTerminalClosed(
		id: number,

		exitCode: number | undefined,

		exitReason: TerminalExitReason | undefined,
	): void;

	$acceptTerminalProcessId(id: number, processId: number): void;

	$acceptActiveTerminalChanged(id: number | null): void;

	$acceptTerminalTitleChange(id: number, name: string): void;

	// $acceptTerminalData?(id: number, data: string): void;

	// $acceptTerminalInteraction?(id: number): void;

	// $acceptProcessStateChange?(id: number, isRunning: boolean): void;
}

// Options for createTerminal (combined for simplicity)
type CreateTerminalOptions =
	| string
	| TerminalOptions
	| ExtensionTerminalOptions;

class ShimTerminalImpl implements Terminal {
	readonly #proxy: MainThreadTerminalServiceShape | null;

	// Terminal ID assigned by Mountain
	readonly #id: number;

	#nameProp: string;

	readonly #onDidDisposeEmitter = new VscodeEmitter<void>();

	#logService?: ILogService;

	#isDisposed: boolean = false;

	#processIdPromise: Promise<number | undefined>;

	// Asserted as it's set in constructor
	#processIdPromiseComplete!: (pid: number | undefined) => void;

	// Store exit status
	#exitStatusProp: TerminalExitStatus | undefined = undefined;

	// Store creation options
	#creationOpts: Readonly<TerminalOptions | ExtensionTerminalOptions>;

	constructor(
		id: number,

		initialName: string,

		// Store original options
		creationOptions: Readonly<TerminalOptions | ExtensionTerminalOptions>,

		proxy: MainThreadTerminalServiceShape | null,

		logService?: ILogService,
	) {
		this.#id = id;

		this.#nameProp = initialName;

		this.#creationOpts = creationOptions;

		this.#proxy = proxy;

		this.#logService = logService;

		this.#processIdPromise = new Promise<number | undefined>((resolve) => {
			this.#processIdPromiseComplete = resolve;
		});

		this._log(`Created`);
	}

	private _log(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[TerminalShim][${this.#nameProp}(${this.#id})] ${msg}`,

			...args,
		);
	}

	private _logError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[TerminalShim][${this.#nameProp}(${this.#id})] ${msg}`,

			...args,
		);
	}

	private _validate(): void {
		if (this.#isDisposed) throw new Error("Terminal has been disposed");
	}

	get name(): string {
		return this.#nameProp;
	}

	_setName(newName: string): void {
		this.#nameProp = newName;

		// Internal setter for title changes
	}

	get exitStatus(): TerminalExitStatus | undefined {
		return this.#exitStatusProp;
	}

	_setExitStatus(status: TerminalExitStatus): void {
		this.#exitStatusProp = status;
	}

	get processId(): Promise<number | undefined> {
		return this.#processIdPromise;
	}

	_setProcessId(pid: number | undefined): void {
		if (this.#processIdPromiseComplete) {
			this.#processIdPromiseComplete(pid);

			// Prevent future resolution, tricky with strict null checks
			// this.#processIdPromiseComplete = undefined as any;
		}
	}

	get creationOptions(): Readonly<
		TerminalOptions | ExtensionTerminalOptions
	> {
		return this.#creationOpts;
	}

	// Simplified state, real one might involve more detailed info from main thread
	get state(): TerminalState {
		return Object.freeze({ isInteractedWith: false });
	}

	// No direct PTY access in this shim model
	// get pty(): Pseudoterminal | undefined { return undefined; }

	public sendText(text: string, addNewLine: boolean = true): void {
		this._validate();

		// Terminals often expect \r
		const message = text + (addNewLine ? "\r" : "");

		this._log(
			`sendText: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
		);

		this.#proxy
			?.$sendText(this.#id, message)
			.catch((e: any) =>
				this._logError("Error sending text via RPC:", e),
			);
	}

	public show(preserveFocus: boolean = false): void {
		this._validate();

		this._log(`show: preserveFocus=${preserveFocus}`);

		this.#proxy
			?.$show(this.#id, preserveFocus)
			.catch((e: any) =>
				this._logError("Error showing terminal via RPC:", e),
			);
	}

	public hide(): void {
		this._validate();

		this._log(`hide`);

		this.#proxy
			?.$hide(this.#id)
			.catch((e: any) =>
				this._logError("Error hiding terminal via RPC:", e),
			);
	}

	public dispose(): void {
		if (!this.#isDisposed) {
			this._log(`dispose`);

			this.#isDisposed = true;

			this.#proxy
				?.$dispose(this.#id)
				.catch((e: any) =>
					this._logError("Error disposing terminal via RPC:", e),
				);

			this.#onDidDisposeEmitter.fire();

			this.#onDidDisposeEmitter.dispose();

			if (this.#processIdPromiseComplete) {
				this._setProcessId(undefined);

				// Resolve PID promise
			}

			this.#proxy = null;

			this.#logService = undefined;
		}
	}

	public readonly onDidDispose: VscodeEvent<void> =
		this.#onDidDisposeEmitter.event;
}

class ShimEnvironmentVariableCollectionImpl
	implements EnvironmentVariableCollection
{
	readonly #extensionId: string;

	// Default to persistent
	#persistentProp: boolean = true;

	readonly #map = new Map<string, EnvironmentVariableMutator>();

	// Store IPC layer
	readonly #ipc: typeof ipc;

	#logService?: ILogService;

	// Optional description for the collection
	readonly #description?: string;

	constructor(
		// Use vscode.Extension type
		extension: Extension<any>,

		options: { persistent?: boolean; description?: string } | undefined,

		ipcLayer: typeof ipc,

		logService?: ILogService,
	) {
		this.#extensionId = extension.id;

		if (options?.persistent !== undefined)
			this.#persistentProp = options.persistent;

		this.#description = options?.description;

		this.#ipc = ipcLayer;

		this.#logService = logService;

		this._log(
			`Created (persistent=${this.#persistentProp}, description=${this.#description || "none"})`,
		);
	}

	private _log(msg: string, ...args: any[]): void {
		this.#logService?.trace(
			`[EnvVarCollectionShim][${this.#extensionId}] ${msg}`,

			...args,
		);
	}

	private _logError(msg: string, ...args: any[]): void {
		this.#logService?.error(
			`[EnvVarCollectionShim][${this.#extensionId}] ${msg}`,

			...args,
		);
	}

	get persistent(): boolean {
		return this.#persistentProp;
	}

	get description(): string | undefined {
		return this.#description;

		// Added description
	}

	public replace(variable: string, value: string): void {
		this.set(variable, {
			value,

			type: EnvironmentVariableMutatorType.Replace,
		});
	}

	public append(variable: string, value: string): void {
		this.set(variable, {
			value,

			type: EnvironmentVariableMutatorType.Append,
		});
	}

	public prepend(variable: string, value: string): void {
		this.set(variable, {
			value,

			type: EnvironmentVariableMutatorType.Prepend,
		});
	}

	// Internal set method to handle common logic, called by replace, append, prepend
	private set(variable: string, mutator: EnvironmentVariableMutator): void {
		if (typeof variable !== "string" || variable.length === 0)
			throw new Error("Invalid variable name");

		this._log(
			`set: variable=${variable}, mutator=${JSON.stringify(mutator)}`,
		);

		// Store a copy
		this.#map.set(variable, { ...mutator });

		try {
			this.#ipc.sendNotificationToMountain(
				"terminal_setEnvironmentVariable",

				{
					extensionId: this.#extensionId,

					variable: variable,

					// Send copy
					mutator: { ...mutator },

					persistent: this.#persistentProp,
				},
			);
		} catch (e: any) {
			this._logError(
				`Error sending IPC notification for set EnvironmentVariable:`,

				e,
			);
		}
	}

	public get(variable: string): EnvironmentVariableMutator | undefined {
		const mutator = this.#map.get(variable);

		return mutator ? Object.freeze({ ...mutator }) : undefined;
	}

	public delete(variable: string): void {
		if (typeof variable !== "string" || variable.length === 0)
			throw new Error("Invalid variable name");

		this._log(`delete: variable=${variable}`);

		if (this.#map.delete(variable)) {
			try {
				this.#ipc.sendNotificationToMountain(
					"terminal_deleteEnvironmentVariable",

					{
						extensionId: this.#extensionId,

						variable: variable,

						persistent: this.#persistentProp,
					},
				);
			} catch (e: any) {
				this._logError(
					`Error sending IPC notification for delete EnvironmentVariable:`,

					e,
				);
			}
		} else {
			this._log(
				`delete: Variable '${variable}' not found in local cache. Notifying Mountain anyway.`,
			);

			// Still send notification as Mountain might have state we don't know, or to ensure consistency.
			try {
				this.#ipc.sendNotificationToMountain(
					"terminal_deleteEnvironmentVariable",

					{
						extensionId: this.#extensionId,

						variable: variable,

						persistent: this.#persistentProp,
					},
				);
			} catch (e: any) {
				this._logError(
					`Error sending IPC notification for delete EnvironmentVariable (not in cache):`,

					e,
				);
			}
		}
	}

	public clear(): void {
		this._log(`clear`);

		if (this.#map.size > 0) {
			this.#map.clear();

			try {
				this.#ipc.sendNotificationToMountain(
					"terminal_clearEnvironmentVariableCollection",

					{
						extensionId: this.#extensionId,

						persistent: this.#persistentProp,
					},
				);
			} catch (e: any) {
				this._logError(
					`Error sending IPC notification for clear EnvironmentVariableCollection:`,

					e,
				);
			}
		}
	}

	public forEach(
		callback: (
			variable: string,

			mutator: EnvironmentVariableMutator,

			collection: EnvironmentVariableCollection,
		) => any,

		thisArg?: any,
	): void {
		this.#map.forEach((value, key) => {
			callback.call(thisArg, key, Object.freeze({ ...value }), this);
		});
	}

	public [Symbol.iterator](): IterableIterator<
		[string, EnvironmentVariableMutator]
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
					value: [key, Object.freeze({ ...value })],

					done: false,
				};
			},

			[Symbol.iterator]: function () {
				return this;
			},
		};
	}
}

export class ShimExtHostTerminalService
	extends BaseCocoonShim
	implements ExtHostTerminalServiceShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadTerminalProxy: MainThreadTerminalServiceShape | null = null;

	// Key: terminal ID (number)
	readonly #terminals = new Map<number, ShimTerminalImpl>();

	readonly #envVariableCollections = new Map<
		string,
		ShimEnvironmentVariableCollectionImpl
		// Key: extension ID
	>();

	readonly #onDidOpenTerminalEmitter = new VscodeEmitter<Terminal>();

	// VSCode API uses Terminal, not TerminalExitStatus obj
	readonly #onDidCloseTerminalEmitter = new VscodeEmitter<Terminal>();

	readonly #onDidChangeActiveTerminalEmitter = new VscodeEmitter<
		Terminal | undefined
	>();

	readonly #onDidChangeTerminalStateEmitter = new VscodeEmitter<Terminal>();

	// If PTY data is proxied
	// #onDidWriteTerminalDataEmitter = new VscodeEmitter<TerminalDataWriteEvent>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostTerminalService", rpcService, logService);

		if (this._rpcService) {
			this.#mainThreadTerminalProxy = this._getProxy(
				MainContext.MainThreadTerminalService as ProxyIdentifier<MainThreadTerminalServiceShape>,
			);
		}

		if (!this.#mainThreadTerminalProxy) {
			this._logError(
				"Failed to get MainThreadTerminalService proxy! Terminal features may be limited.",
			);
		}

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostTerminalService as ProxyIdentifier<ExtHostTerminalServiceShape>,

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
		} else {
			this._logError(
				"RPCService is not available, cannot set ExtHostTerminalService for RPC.",
			);
		}
	}

	// --- Public API Methods (vscode.window.terminals) ---
	public async createTerminal(
		nameOrOptions?: CreateTerminalOptions,

		shellPath?: string,

		shellArgs?: string[] | string,
	): Promise<Terminal> {
		let options: TerminalOptions | ExtensionTerminalOptions;

		if (typeof nameOrOptions === "string") {
			options = { name: nameOrOptions, shellPath, shellArgs };
		} else {
			// Default to empty object if undefined
			options = nameOrOptions || {};
		}

		this._log(
			`createTerminal: name=${options.name}, shellPath=${options.shellPath}`,
		);

		if (!this.#mainThreadTerminalProxy) {
			this._logError(
				"Cannot create terminal, MainThreadTerminalService proxy unavailable.",
			);

			throw new Error(
				"Cannot create terminal: Terminal service proxy is not available.",
			);
		}

		try {
			// Map VS Code API options to internal protocol options (ICreateTerminalOptions)
			const internalOptions: any = {
				// Type this with ICreateTerminalOptions if defined
				name: options.name,

				shellPath: options.shellPath,

				shellArgs: options.shellArgs,

				cwd: options.cwd
					? options.cwd instanceof Uri
						? this._convertApiArgToInternal(options.cwd)
						: options.cwd
					: undefined,

				env: options.env,

				iconPath: options.iconPath
					? options.iconPath instanceof Uri
						? this._convertApiArgToInternal(options.iconPath)
						: options.iconPath
					: undefined,

				// If color is TerminalColor
				color: (options as any).color,

				message: (options as any).message,

				// TerminalLocation enum or { viewColumn, preserveFocus }

				location: (options as any).location,

				isTransient: (options as any).isTransient,

				// PTY handling would be complex, assume not used by shim for now
				// pty: (options as ExtensionTerminalOptions).pty,
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
				// result should be ITerminalLaunchResult
				this._logError(
					"Failed to create terminal via RPC: Main thread returned invalid result.",

					result,
				);

				throw new Error("Failed to create terminal backend.");
			}

			const terminal = new ShimTerminalImpl(
				result.id,

				result.name || options.name || "Terminal",

				options,

				this.#mainThreadTerminalProxy,

				this._logService,
			);

			this.#terminals.set(result.id, terminal);

			// $acceptTerminalOpened will fire the onDidOpenTerminal event when main thread confirms
			return terminal;
		} catch (e: any) {
			this._logError("Failed to create terminal via RPC:", e);

			throw e;
		}
	}

	get terminals(): readonly Terminal[] {
		return [...this.#terminals.values()];
	}

	get activeTerminal(): Terminal | undefined {
		this._logWarnOnce(
			"activeTerminal is not fully implemented in shim (relies on $acceptActiveTerminalChanged).",
		);

		// This would be set by $acceptActiveTerminalChanged
		// For now, find first non-disposed or return undefined.
		for (const term of this.#terminals.values()) {
			// A more robust check for "disposed" might be needed on ShimTerminalImpl if it has such a property
			// Hacky access to private
			// if (!(term as any).#isDisposed) return term;

			// Simplistic: return first one
			return term;
		}

		return undefined;
	}

	public getEnvironmentVariableCollection(
		extension: Extension<any>,

		options?: { persistent?: boolean; description?: string },
	): EnvironmentVariableCollection {
		if (!extension?.id) {
			this._logError(
				"getEnvironmentVariableCollection called without valid extension object.",
			);

			throw new Error(
				"Invalid extension provided to getEnvironmentVariableCollection",
			);
		}

		const extId = extension.id;

		this._log(`getEnvironmentVariableCollection: extId=${extId}`);

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

		// Assert not undefined
		return this.#envVariableCollections.get(extId)!;
	}

	// --- Events ---
	get onDidOpenTerminal(): VscodeEvent<Terminal> {
		return this.#onDidOpenTerminalEmitter.event;
	}

	get onDidCloseTerminal(): VscodeEvent<Terminal> {
		return this.#onDidCloseTerminalEmitter.event;
	}

	get onDidChangeActiveTerminal(): VscodeEvent<Terminal | undefined> {
		return this.#onDidChangeActiveTerminalEmitter.event;
	}

	get onDidChangeTerminalState(): VscodeEvent<Terminal> {
		return this.#onDidChangeTerminalStateEmitter.event;
	}

	// get onDidWriteTerminalData(): VscodeEvent<TerminalDataWriteEvent> { return this.#onDidWriteTerminalDataEmitter.event; }

	// --- RPC Methods Called BY Mountain ---
	public $acceptTerminalOpened(
		id: number,

		name: string,

		_isFeatureTerminal?: boolean,
	): void {
		this._log(`$acceptTerminalOpened: id=${id}, name=${name}`);

		let terminal = this.#terminals.get(id);

		if (!terminal) {
			this._log(
				`   Terminal shim for ID ${id} created implicitly by $acceptTerminalOpened.`,
			);

			// Need creationOptions. For now, use a default.
			const creationOpts: TerminalOptions = { name };

			terminal = new ShimTerminalImpl(
				id,

				name,

				creationOpts,

				this.#mainThreadTerminalProxy,

				this._logService,
			);

			this.#terminals.set(id, terminal);
		} else {
			// Update name if it changed
			terminal._setName(name);
		}

		this.#onDidOpenTerminalEmitter.fire(terminal);

		// Opening is a state change
		this.#onDidChangeTerminalStateEmitter.fire(terminal);
	}

	public $acceptTerminalClosed(
		id: number,

		exitCode: number | undefined,

		exitReason: TerminalExitReason | undefined,
	): void {
		this._log(
			`$acceptTerminalClosed: id=${id}, code=${exitCode}, reason=${exitReason !== undefined ? TerminalExitReason[exitReason] : "unknown"}`,
		);

		const terminal = this.#terminals.get(id);

		if (terminal) {
			terminal._setExitStatus({
				code: exitCode,

				reason: exitReason || TerminalExitReason.Unknown,
			});

			this.#terminals.delete(id);

			// API expects the terminal instance
			this.#onDidCloseTerminalEmitter.fire(terminal);

			// Ensure internal disposal
			(terminal as ShimTerminalImpl).dispose();
		} else {
			this._logWarn(
				`Received $acceptTerminalClosed for unknown terminal ID: ${id}`,
			);
		}
	}

	public $acceptTerminalProcessId(id: number, processId: number): void {
		this._log(`$acceptTerminalProcessId: id=${id}, pid=${processId}`);

		const terminal = this.#terminals.get(id);

		terminal?._setProcessId(processId);
	}

	public $acceptActiveTerminalChanged(id: number | null): void {
		this._log(`$acceptActiveTerminalChanged: id=${id}`);

		const activeTerminal =
			id === null ? undefined : this.#terminals.get(id);

		this.#onDidChangeActiveTerminalEmitter.fire(activeTerminal);
	}

	public $acceptTerminalTitleChange(id: number, name: string): void {
		this._log(`$acceptTerminalTitleChange: id=${id}, name=${name}`);

		const terminal = this.#terminals.get(id);

		if (terminal) {
			terminal._setName(name);

			this.#onDidChangeTerminalStateEmitter.fire(terminal);
		} else {
			this._logWarn(
				`Received $acceptTerminalTitleChange for unknown terminal ID: ${id}`,
			);
		}
	}
}

// export { ShimExtHostTerminalService, ShimTerminalImpl as ShimTerminal, ShimEnvironmentVariableCollectionImpl as ShimEnvironmentVariableCollection };

// Classes are already exported.
