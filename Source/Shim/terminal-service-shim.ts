/*---------------------------------------------------------------------------------------------
 * Cocoon Terminal Service Shim (terminal-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.window` terminal-related APIs, primarily governed by
 * the `IExtHostTerminalService` interface (or a compatible shape for DI). This shim is
 * responsible for managing the lifecycle of terminals (creation, disposal), interactions
 * with them (sending text, showing/hiding), and handling terminal-specific environment
 * variable collections for extensions.
 *
 * Most actions that involve creating or interacting with actual terminal backends
 * (e.g., the underlying pseudoterminal or shell process) are proxied to a
 * `MainThreadTerminalService` running in the Mountain host process via RPC.
 * Environment variable changes made by extensions through the
 * `vscode.EnvironmentVariableCollection` API are typically sent to Mountain via
 * direct Vine IPC notifications (e.g., "terminal_setEnvironmentVariableCollection").
 *
 * Responsibilities:
 * - `ShimExtHostTerminalService`:
 *   - Implements `createTerminal()` (and its overloads for `TerminalOptions` and
 *     `ExtensionTerminalOptions` which may include a `Pseudoterminal` for custom PTYs).
 *     Terminal creation requests are proxied to Mountain via RPC.
 *   - Manages a collection of active `ShimTerminalImpl` instances, representing
 *     terminals known to the extension host.
 *   - Provides the `vscode.window.terminals` (readonly array of active terminals) and
 *     `vscode.window.activeTerminal` properties. The state of these is updated based
 *     on RPC notifications from Mountain.
 *   - Exposes terminal lifecycle events (`onDidOpenTerminal`, `onDidCloseTerminal`, *     `onDidChangeActiveTerminal`, `onDidChangeTerminalState`, etc.), which are fired
 *     based on RPC notifications from Mountain.
 *   - Implements `getEnvironmentVariableCollection()`: Returns an instance of
 *     `ShimEnvironmentVariableCollectionImpl` scoped to a given extension.
 *   - Handles RPC calls from Mountain (as part of `ExtHostTerminalServiceShape`) to
 *     update terminal states, process IDs, exit statuses, and trigger events
 *     (e.g., `$acceptTerminalOpened`, `$acceptTerminalClosed`, `$acceptTerminalProcessId`, *     `$acceptTerminalTitleChange`).
 * - `ShimTerminalImpl` (implements `vscode.Terminal`):
 *   - Represents a single terminal instance within the extension host.
 *   - Proxies actions like `show()`, `hide()`, `sendText(text, addNewLine?)`, and
 *     `dispose()` to Mountain via RPC calls to `MainThreadTerminalService`.
 *   - Manages properties like `name`, `processId` (as a promise that resolves when
 *     Mountain provides the PID), `state` (e.g., `isInteractedWith`), and `exitStatus`, *     all of which are updated by RPC calls from Mountain.
 * - `ShimEnvironmentVariableCollectionImpl` (implements `vscode.EnvironmentVariableCollection`):
 *   - Manages a collection of environment variable mutators (replace, append, prepend)
 *     for a specific extension.
 *   - When the collection changes, it notifies Mountain via a direct Vine IPC call
 *     (e.g., `terminal_setEnvironmentVariableCollection`) with the serialized collection.
 *
 * Key Interactions:
 * - `ShimExtHostTerminalService` is registered with Dependency Injection (DI) in
 *   `Cocoon/index.ts` (e.g., as `IExtHostTerminalService`). Its methods and properties
 *   contribute to the `vscode.window` API namespace provided to extensions.
 * - Uses `RPCProtocol` for most terminal operations (creation, actions, lifecycle events)
 *   by communicating with `MainContext.MainThreadTerminalService` on Mountain.
 * - Uses direct Vine IPC (via `cocoon-ipc.ts`) for `ShimEnvironmentVariableCollectionImpl`
 *   to notify Mountain of environment variable changes for terminals.
 * - Relies on `BaseCocoonShim` for common utilities (logging, RPC proxy, IPC calls).
 * - PTY (Pseudoterminal) support for custom terminal backends (`ExtensionTerminalOptions.pty`)
 *   is a complex feature involving bi-directional data streaming over RPC and is
 *   likely STUBBED or partially implemented in an MVP.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	Disposable,
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
// For URI DTOs if iconPath is URI
import { MarshalledId } from "vs/base/common/marshalling";
// For TerminalOptions.iconPath if it's a ThemeIcon
import { ThemeIcon } from "vs/base/common/themables";
import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// For proxying to MainThreadTerminalService
	MainContext,
	// For env var collection DTO
	type EnvironmentVariableCollectionSerialized,
	// For env var collection DTO
	type EnvironmentVariableScopeTuple,
	// Import DTOs and RPC shapes from extHost.protocol.ts
	// RPC shape this service implements for calls from MainThread
	type ExtHostTerminalServiceShape,
	// DTO for environment variable collection
	type IProcessPropertyMapDto,
	// DTO for terminal quick fix commands
	type ITerminalCommandDto,
	// DTO for terminal dimensions
	type ITerminalDimensionsDto,
	// DTO for terminal launch errors
	type ITerminalLaunchErrorDto,
	// DTO for terminal profiles
	type ITerminalProfileDto,
	// RPC shape of the MainThread service
	type MainThreadTerminalServiceShape,
} from "vs/workbench/api/common/extHost.protocol";
// Import types from the public 'vscode' API
import {
	EnvironmentVariableMutatorType as VscodeEnvironmentVariableMutatorType,
	// For ExtensionTerminalOptions.pty
	Pseudoterminal as VscodePseudoterminal,
	// For PTY onDidOpen dimensions
	TerminalDimensions as VscodeTerminalDimensions,
	TerminalExitReason as VscodeTerminalExitReason,
	// For TerminalOptions.cwd or iconPath
	Uri as VscodeUri,
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type EnvironmentVariableMutator as VscodeEnvironmentVariableMutator,
	// For getEnvironmentVariableCollection parameter
	type Extension as VscodeExtension,
	type ExtensionTerminalOptions as VscodeExtensionTerminalOptions,
	type Terminal as VscodeTerminal,
	// Union of TerminalOptions and ExtensionTerminalOptions
	type TerminalCreationOptions as VscodeTerminalCreationOptions,
	// For PTY event
	type TerminalDimensionsChangeEvent as VscodeTerminalDimensionsChangeEvent,
	type TerminalExitStatus as VscodeTerminalExitStatus,
	type TerminalOptions as VscodeTerminalOptions,
	type TerminalProfile as VscodeTerminalProfile,
	type TerminalProfileProvider as VscodeTerminalProfileProvider,
	type TerminalState as VscodeTerminalState,
	// For TerminalOptions.location (if it were a ViewColumn directly)
	// type ViewColumn as VscodeViewColumn,
	// Note: TerminalOptions.location can be TerminalEditorLocationOptions | TerminalViewColumn, handle appropriately.
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
 * Internal representation of an active terminal within the ExtHost.
 */
interface ActiveTerminal {
	// Terminal ID from MainThread
	id: string;

	name?: string;

	// The vscode.Terminal API object
	apiTerminal: VscodeTerminal;

	// If it's a PTY-backed terminal
	ptyId?: number;

	// PID of the terminal process
	processIdPromise?: Promise<number | undefined>;

	processIdResolve?: (pid: number | undefined) => void;

	exitStatus?: VscodeTerminalExitStatus;

	state?: VscodeTerminalState;
}

/**
 * Shim implementation for `vscode.EnvironmentVariableCollection`.
 * Manages environment variable mutators for a specific extension and notifies Mountain of changes.
 */
class ShimEnvironmentVariableCollectionImpl
	implements VscodeEnvironmentVariableCollection
{
	readonly #map: Map<string, VscodeEnvironmentVariableMutator> = new Map();

	// Default for extension-contributed env vars
	readonly #persistent = true;

	// Optional description
	readonly #description?: string;

	// Optional scope
	readonly #scope?: import("vscode").EnvironmentVariableScope;

	readonly #onDidChangeCollectionEmitter = new VscodeEmitter<void>();

	public readonly onDidChange: VscodeEvent<void> =
		this.#onDidChangeCollectionEmitter.event;

	constructor(
		// For logging/context
		private readonly _extension: VscodeExtension<any>,

		// Parent service to call IPC
		private readonly _service: ShimExtHostTerminalService,

		// VS Code API type
		scope?: import("vscode").EnvironmentVariableScope,
	) {
		// Store scope
		this.#scope = scope;

		// TODO: Description (if API supports it more directly than just for logging)
	}

	private _serializeAndNotify(): void {
		const serializedCollection: EnvironmentVariableCollectionSerialized =
			[];

		this.#map.forEach((mutator, variable) => {
			serializedCollection.push([
				variable,

				{ value: mutator.value, type: mutator.type },
			]);
		});

		// Construct the scope DTO for IPC
		let scopeDto: EnvironmentVariableScopeTuple | undefined = undefined;

		if (this.#scope) {
			if (this.#scope.workspaceFolder) {
				// Assume _service has a way to convert VscodeUri to UriComponents DTO
				const workspaceFolderUriDto = (
					this._service as any as BaseCocoonShim
				)._convertApiArgToInternal(this.#scope.workspaceFolder.uri);

				scopeDto = [{ workspaceFolder: workspaceFolderUriDto }];
			}

			// Add other scope properties if present (e.g., a specific shell integration context)
		}

		const ipcParams: IProcessPropertyMapDto = {
			envCollection: serializedCollection,

			scope: scopeDto,

			extensionIdentifier: this._extension.id,
		};

		// Use direct IPC notification to Mountain (method name TBD, e.g., "terminal_setEnvironmentVariableCollection")
		this._service._ipcNotify(
			"terminal_setEnvironmentVariableCollection",

			ipcParams,
		);

		this.#onDidChangeCollectionEmitter.fire();
	}

	public get persistent(): boolean {
		return this.#persistent;
	}

	public get description(): string | undefined {
		return this.#description;
	}

	public get scope(): import("vscode").EnvironmentVariableScope | undefined {
		return this.#scope;
	}

	replace(variable: string, value: string): void {
		this.#map.set(variable, {
			value,

			type: VscodeEnvironmentVariableMutatorType.Replace,
		});

		this._serializeAndNotify();
	}

	append(variable: string, value: string): void {
		this.#map.set(variable, {
			value,

			type: VscodeEnvironmentVariableMutatorType.Append,
		});

		this._serializeAndNotify();
	}

	prepend(variable: string, value: string): void {
		this.#map.set(variable, {
			value,

			type: VscodeEnvironmentVariableMutatorType.Prepend,
		});

		this._serializeAndNotify();
	}

	get(variable: string): VscodeEnvironmentVariableMutator | undefined {
		return this.#map.get(variable);
	}

	forEach(
		callback: (
			variable: string,

			mutator: VscodeEnvironmentVariableMutator,

			collection: VscodeEnvironmentVariableCollection,
		) => any,

		thisArg?: any,
	): void {
		this.#map.forEach((mutator, variable) =>
			callback.call(thisArg, variable, mutator, this),
		);
	}

	delete(variable: string): void {
		if (this.#map.delete(variable)) {
			this._serializeAndNotify();
		}
	}

	clear(): void {
		if (this.#map.size > 0) {
			this.#map.clear();

			this._serializeAndNotify();
		}
	}

	[Symbol.iterator](): IterableIterator<
		[string, VscodeEnvironmentVariableMutator]
	> {
		return this.#map.entries();
	}

	public toArray(): [string, VscodeEnvironmentVariableMutator][] {
		return Array.from(this.#map.entries());
	}
}

/**
 * Cocoon's implementation of the `IExtHostTerminalService` interface (or its shape).
 * Manages terminals and their interaction with the Mountain host via RPC and IPC.
 */
export class ShimExtHostTerminalService
	extends BaseCocoonShim
	implements ExtHostTerminalServiceShape
{
	// Implements RPC shape for calls from MainThread
	// For DI registration as IExtHostTerminalService
	public readonly _serviceBrand: undefined;

	readonly #mainThreadTerminalServiceProxy: MainThreadTerminalServiceShape | null =
		null;

	// Key: Terminal ID from MainThread
	readonly #terminals: Map<string, ActiveTerminal> = new Map();

	#activeTerminalId: string | undefined = undefined;

	// Environment variable collections, keyed by extension ID string
	readonly #envVariableCollections: Map<
		string,
		ShimEnvironmentVariableCollectionImpl
	> = new Map();

	// --- Event Emitters for vscode.window.onDid...Terminal ---
	readonly #onDidOpenTerminalEmitter = new VscodeEmitter<VscodeTerminal>();

	public readonly onDidOpenTerminal: VscodeEvent<VscodeTerminal> =
		this.#onDidOpenTerminalEmitter.event;

	readonly #onDidCloseTerminalEmitter = new VscodeEmitter<VscodeTerminal>();

	public readonly onDidCloseTerminal: VscodeEvent<VscodeTerminal> =
		this.#onDidCloseTerminalEmitter.event;

	readonly #onDidChangeActiveTerminalEmitter = new VscodeEmitter<
		VscodeTerminal | undefined
	>();

	public readonly onDidChangeActiveTerminal: VscodeEvent<
		VscodeTerminal | undefined
	> = this.#onDidChangeActiveTerminalEmitter.event;

	readonly #onDidChangeTerminalStateEmitter =
		new VscodeEmitter<VscodeTerminal>();

	public readonly onDidChangeTerminalState: VscodeEvent<VscodeTerminal> =
		this.#onDidChangeTerminalStateEmitter.event;

	// For PTYs
	readonly #onDidWriteDataEmitter = new VscodeEmitter<{
		id: number;

		data: string;
	}>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostTerminalService", rpcService, logService);

		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadTerminalServiceProxy = this._getProxy(
				MainContext.MainThreadTerminalService as ProxyIdentifier<MainThreadTerminalServiceShape>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostTerminalService as ProxyIdentifier<ExtHostTerminalServiceShape>,

					this,
				);

				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostTerminalService).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostTerminalService:",

					e,
				);
			}
		}

		if (!this.#mainThreadTerminalServiceProxy) {
			this._logError(
				"MainThreadTerminalService RPC proxy NOT obtained. Terminal features will be severely impaired or non-functional.",
			);
		}
	}

	// --- Public API (vscode.window.terminals, activeTerminal, createTerminal) ---
	get terminals(): readonly VscodeTerminal[] {
		return Array.from(this.#terminals.values()).map((t) => t.apiTerminal);
	}

	get activeTerminal(): VscodeTerminal | undefined {
		return this.#activeTerminalId
			? this.#terminals.get(this.#activeTerminalId)?.apiTerminal
			: undefined;
	}

	public createTerminal(
		name?: string,

		shellPath?: string,

		shellArgs?: string[] | string,
	): VscodeTerminal;

	public createTerminal(options: VscodeTerminalOptions): VscodeTerminal;

	public createTerminal(
		options: VscodeExtensionTerminalOptions,
	): VscodeTerminal;

	public createTerminal(
		nameOrOptions?:
			| string
			| VscodeTerminalOptions
			| VscodeExtensionTerminalOptions,

		shellPath?: string,

		shellArgs?: string[] | string,
	): VscodeTerminal {
		let terminalName: string | undefined;

		let terminalOptions:
			| VscodeTerminalOptions
			| VscodeExtensionTerminalOptions = {};

		if (typeof nameOrOptions === "string") {
			terminalName = nameOrOptions;

			// Set name in options
			terminalOptions.name = terminalName;

			terminalOptions.shellPath = shellPath;

			terminalOptions.shellArgs = shellArgs;
		} else if (nameOrOptions) {
			// It's VscodeTerminalOptions or VscodeExtensionTerminalOptions
			terminalOptions = nameOrOptions;

			terminalName = terminalOptions.name;
		}

		this._logDebug(
			`API createTerminal called. Name: '${terminalName}', Options:`,

			terminalOptions,
		);

		if (!this.#mainThreadTerminalServiceProxy) {
			this._logError(
				"Cannot create terminal: MainThreadTerminalService RPC proxy is unavailable. Throwing error.",
			);

			throw new Error("Terminal service is currently unavailable.");
		}

		// For standard terminals (not PTY), ExtHost sends request, MainThread creates and calls back with $acceptTerminalOpened.
		// For PTY terminals, the flow is more complex.
		if ((terminalOptions as VscodeExtensionTerminalOptions).pty) {
			return this._createTerminalPty(
				terminalOptions as VscodeExtensionTerminalOptions,
			);
		} else {
			// Convert options to DTO for RPC. This requires careful marshalling.
			// TODO: Implement robust options to DTO conversion.
			const optionsDto =
				this._serializeTerminalOptionsForRpc(terminalOptions);

			this._logDebug(
				"Requesting MainThread to create shell terminal with DTO:",

				optionsDto,
			);

			this.#mainThreadTerminalServiceProxy
				.$createTerminal(optionsDto)
				.catch((e) =>
					this._logError(
						"RPC $createTerminal failed:",

						refineErrorForShim(
							e,

							this._logService,

							"$createTerminal RPC",
						),
					),
				);

			// The actual VscodeTerminal object is created and returned *after* MainThread calls $acceptTerminalOpened.
			// This means createTerminal() in ExtHost is effectively async in its effect, even if API is sync.
			// For a shim, we might need to return a placeholder that gets populated, or make createTerminal async.
			// VS Code's real ExtHostTerminalService returns a proxy object immediately.
			// Let's create a temporary placeholder and wait for $acceptTerminalOpened. This is complex.

			// Simplified for MVP: Assume $acceptTerminalOpened will be called quickly.
			// A more robust solution might involve a temporary proxy or making this method async if API allowed.
			this._logWarn(
				"createTerminal for non-PTY is simplified. It relies on a subsequent $acceptTerminalOpened call from MainThread to fully initialize.",
			);

			// Create a "dummy" terminal for now that will be replaced or updated. This is not ideal.
			// The real ExtHostTerminalService creates a _TerminalProcess proxy.
			// For now, let's throw until $acceptTerminalOpened flow is fully integrated for non-PTY return.
			throw new Error(
				"Non-PTY terminal creation flow not fully shimmed for synchronous return. Awaiting $acceptTerminalOpened.",
			);
		}
	}

	public getEnvironmentVariableCollection(
		extension: VscodeExtension<any>,

		scope?: import("vscode").EnvironmentVariableScope | undefined,
	): VscodeEnvironmentVariableCollection {
		this._logDebug(
			`API getEnvironmentVariableCollection called for extension: ${extension.id}`,
		);

		// Simple key based on extId and workspaceFolder
		const key = `${extension.id}${scope?.workspaceFolder?.uri.toString() ?? ""}`;

		let collection = this.#envVariableCollections.get(key);

		if (!collection) {
			collection = new ShimEnvironmentVariableCollectionImpl(
				extension,

				this,

				scope,
			);

			this.#envVariableCollections.set(key, collection);
		}

		return collection;
	}

	// --- PTY Handling (complex, mostly stubbed for MVP) ---
	private _createTerminalPty(
		options: VscodeExtensionTerminalOptions,
	): VscodeTerminal {
		const pty = options.pty;

		if (!pty)
			throw new Error("PTY object missing in ExtensionTerminalOptions");

		// Simple unique ID for PTY for now
		const ptyId = Date.now();

		this._logInfo(
			`Creating PTY-backed terminal. PTY ID (ExtHost-side): ${ptyId}, Name: '${options.name}'`,
		);

		// TODO: Full PTY Implementation
		// 1. Call MainThread: `$startPty(ptyId, optionsDto)` to inform MainThread a PTY is starting.
		// 2. MainThread creates its side of the PTY.
		// 3. Data flow:
		//    - ExtHost (pty.onDidWrite) -> RPC `$sendProcessData(ptyId, data)` to MainThread.
		//    - MainThread (native PTY output) -> RPC `$acceptProcessData(ptyId, data)` to ExtHost -> pty.handleInput(data).
		//    - MainThread (user input in UI) -> RPC `$sendProcessInput(ptyId, data)` to ExtHost -> pty.handleInput(data).
		// 4. Lifecycle:
		//    - pty.open() -> RPC `$sendProcessReady(ptyId, initialDimensions)`
		//    - pty.close() -> RPC `$sendProcessExit(ptyId, exitCode?)`
		//    - Terminal.dispose() from extension -> RPC `$disposePty(ptyId)`

		// For this shim, we'll create a local API object but without full RPC data flow.
		const terminalName = options.name || `pty-${ptyId}`;

		const processIdPromise = new Promise<number | undefined>((resolve) => {
			/* TODO: Resolve with PID from MainThread */
		});

		const apiTerminal: VscodeTerminal = {
			name: terminalName,

			processId: processIdPromise,

			// Store creation options
			creationOptions: Object.freeze(options),

			// To be updated by $acceptTerminalClosed
			exitStatus: undefined,

			// To be updated by $acceptTerminalState
			state: { isInteractedWith: false },

			sendText: (text: string, addNewLine?: boolean) => {
				this._logWarn(
					`PTY Terminal (${terminalName}): sendText STUB. Data: "${text.substring(0, 50)}...", AddNewline: ${addNewLine}`,
				);

				// Real: RPC to MainThread `$sendProcessInput(ptyId, text + (addNewLine ? '\r' : ''))` -> pty.handleInput()
				// Simulate direct call for stub
				pty.handleInput?.(text + (addNewLine ? "\r" : ""));
			},

			show: (preserveFocus?: boolean) => {
				this._logWarn(
					`PTY Terminal (${terminalName}): show STUB. PreserveFocus: ${preserveFocus}`,
				); /* RPC $showTerminal(ptyId) */
			},

			hide: () => {
				this._logWarn(
					`PTY Terminal (${terminalName}): hide STUB.`,
				); /* RPC $hideTerminal(ptyId) */
			},

			dispose: () => {
				this._logWarn(`PTY Terminal (${terminalName}): dispose STUB.`);

				// RPC `$disposePty(ptyId)`
				// This would also trigger $acceptTerminalClosed from MainThread if not already.
				this.$acceptTerminalClosed(
					String(ptyId) /* Use PTY ID as terminal ID for stub */,

					undefined,
				);
			},

			// This is for when *this* PTY writes data
			onDidWriteData: this.#onDidWriteDataEmitter.event,

			onDidOpen: pty.onDidOpen
				? pty.onDidOpen.bind(pty)
				: VscodeEvent.None,

			onDidClose: pty.onDidClose
				? pty.onDidClose.bind(pty)
				: VscodeEvent.None,

			onDidChangeDimensions: pty.onDidChangeDimensions
				? pty.onDidChangeDimensions.bind(pty)
				: VscodeEvent.None,

			// TODO
			onDidFocus: VscodeEvent.None,

			// TODO
			onDidBlur: VscodeEvent.None,

			// TODO
			onDidInput: VscodeEvent.None,

			// TODO
			onDidSendText: VscodeEvent.None,
		};

		const activePtyTerminal: ActiveTerminal = {
			// Use PTY ID as main terminal ID for this stub
			id: String(ptyId),

			name: terminalName,

			apiTerminal,

			ptyId,

			processIdPromise,

			processIdResolve: (pid) => {
				/* Resolve the promise */
			},
		};

		this.#terminals.set(activePtyTerminal.id, activePtyTerminal);

		// Fire event immediately for PTY stub
		this.#onDidOpenTerminalEmitter.fire(apiTerminal);

		// Simulate initial dimensions or ready signal
		// Call onDidOpen if provider has it
		pty.onDidOpen?.(options.initialDimensions || { rows: 24, cols: 80 });

		return apiTerminal;
	}

	// --- RPC Methods Called by MainThread (ExtHostTerminalServiceShape) ---
	public $acceptTerminalOpened(
		id: string,

		name: string,

		shellLaunchConfigData: any /* DTO for ShellLaunchConfig */,
	): void {
		this._logInfo(`RPC $acceptTerminalOpened: ID='${id}', Name='${name}'`);

		if (this.#terminals.has(id)) {
			this._logWarn(
				`Terminal with ID ${id} already exists. Updating its properties.`,
			);

			// Potentially update name or other properties if MainThread can change them post-creation.
			const existing = this.#terminals.get(id)!;

			// Update name if mutable
			(existing.apiTerminal as any).name = name;

			return;
		}

		let pidPromiseResolve: ((pid: number | undefined) => void) | undefined;

		const pidPromise = new Promise<number | undefined>((resolve) => {
			pidPromiseResolve = resolve;
		});

		const apiTerminal: VscodeTerminal = {
			name: name,

			processId: pidPromise,

			creationOptions: Object.freeze(
				this._deserializeShellLaunchConfig(shellLaunchConfigData),
			),

			exitStatus: undefined,

			// Initial state
			state: { isInteractedWith: false },

			sendText: (text: string, addNewLine?: boolean) =>
				this.#mainThreadTerminalServiceProxy
					?.$sendText(id, text, addNewLine ?? true)
					.catch((e) =>
						this._logError(
							`RPC $sendText for terminal ${id} failed:`,

							e,
						),
					),

			show: (preserveFocus?: boolean) =>
				this.#mainThreadTerminalServiceProxy
					?.$show(id, preserveFocus)
					.catch((e) =>
						this._logError(
							`RPC $show for terminal ${id} failed:`,

							e,
						),
					),

			hide: () =>
				this.#mainThreadTerminalServiceProxy?.$hide(id).catch((e) =>
					this._logError(
						`RPC $hide for terminal ${id} failed:`,

						e,
					),
				),

			dispose: () =>
				this.#mainThreadTerminalServiceProxy?.$dispose(id).catch((e) =>
					this._logError(
						`RPC $dispose for terminal ${id} failed:`,

						e,
					),
				),

			// Events for standard terminals are harder to shim without full PTY proxying
			// TODO: This would require MainThread to stream data back
			onDidWriteData: VscodeEvent.None,

			// Open is signified by $acceptTerminalOpened
			onDidOpen: VscodeEvent.None,

			// Close is signified by $acceptTerminalClosed
			onDidClose: VscodeEvent.None,

			// Would need $acceptTerminalDimensions
			onDidChangeDimensions: VscodeEvent.None,

			// TODO
			onDidFocus: VscodeEvent.None,

			// TODO
			onDidBlur: VscodeEvent.None,

			// TODO
			onDidInput: VscodeEvent.None,

			// TODO
			onDidSendText: VscodeEvent.None,
		};

		this.#terminals.set(id, {
			id,

			name,

			apiTerminal,

			processIdPromise: pidPromise,

			processIdResolve: pidPromiseResolve,
		});

		this.#onDidOpenTerminalEmitter.fire(apiTerminal);
	}

	public $acceptTerminalClosed(
		id: string,

		exitCode: number | undefined,

		exitReason: VscodeTerminalExitReason | undefined,
	): void {
		this._logInfo(
			`RPC $acceptTerminalClosed: ID='${id}', ExitCode=${exitCode}, Reason=${exitReason ? VscodeTerminalExitReason[exitReason] : "undefined"}`,
		);

		const activeTerminal = this.#terminals.get(id);

		if (activeTerminal) {
			activeTerminal.exitStatus = { code: exitCode, reason: exitReason };

			(activeTerminal.apiTerminal as any).exitStatus =
				// Update API object
				activeTerminal.exitStatus;

			this.#onDidCloseTerminalEmitter.fire(activeTerminal.apiTerminal);

			// Remove from active list
			this.#terminals.delete(id);

			if (this.#activeTerminalId === id) {
				// No active terminal if current one closed
				this.$acceptActiveTerminalChanged(undefined);
			}
		} else {
			this._logWarn(
				`Received $acceptTerminalClosed for unknown or already closed terminal ID: ${id}`,
			);
		}
	}

	public $acceptActiveTerminalChanged(id: string | undefined): void {
		this._logInfo(
			`RPC $acceptActiveTerminalChanged: New Active ID='${id ?? "none"}'`,
		);

		const oldActiveTerminalApi = this.activeTerminal;

		this.#activeTerminalId = id;

		const newActiveTerminalApi = this.activeTerminal;

		if (oldActiveTerminalApi !== newActiveTerminalApi) {
			this.#onDidChangeActiveTerminalEmitter.fire(newActiveTerminalApi);
		}
	}

	public $acceptTerminalProcessId(id: string, processId: number): void {
		this._logInfo(
			`RPC $acceptTerminalProcessId: ID='${id}', PID=${processId}`,
		);

		const activeTerminal = this.#terminals.get(id);

		if (activeTerminal && activeTerminal.processIdResolve) {
			activeTerminal.processIdResolve(processId);
		} else {
			this._logWarn(
				`Received $acceptTerminalProcessId for unknown terminal ID ${id} or PID already resolved.`,
			);
		}
	}

	public $acceptTerminalTitleChange(id: string, name: string): void {
		this._logInfo(
			`RPC $acceptTerminalTitleChange: ID='${id}', New Name='${name}'`,
		);

		const activeTerminal = this.#terminals.get(id);

		if (activeTerminal) {
			activeTerminal.name = name;

			// Update the API object (if name is mutable)
			(activeTerminal.apiTerminal as any).name = name;

			// TODO: Fire onDidChangeTerminalState if name change implies state change for API
			// this.#onDidChangeTerminalStateEmitter.fire(activeTerminal.apiTerminal);
		}
	}

	public $acceptTerminalDimensions(
		id: string,

		columns: number,

		rows: number,
	): void {
		this._logInfo(
			`RPC $acceptTerminalDimensions: ID='${id}', Cols=${columns}, Rows=${rows}`,
		);

		const activeTerminal = this.#terminals.get(id);

		if (activeTerminal?.ptyId) {
			// This is primarily for PTYs
			const pty = (
				activeTerminal.apiTerminal
					.creationOptions as VscodeExtensionTerminalOptions
			).pty;

			if (pty && pty.onDidChangeDimensions) {
				// If the PTY provider has onDidChangeDimensions, it should be an Emitter.
				// This assumes pty.onDidChangeDimensions is an Emitter.
				// For ExtHost -> Provider, we'd call pty.setDimensions()
				// For Provider -> ExtHost -> MainThread, provider fires event, ExtHost might inform MainThread.
				// This $accept is MainThread -> ExtHost -> Provider.
				if (typeof (pty as any).setDimensions === "function") {
					// If PTY has setDimensions method
					(pty as any).setDimensions({
						columns,

						rows,
					} as VscodeTerminalDimensions);
				} else {
					this._logWarn(
						`PTY for terminal ID ${id} does not have a setDimensions method to accept new dimensions.`,
					);
				}
			}
		} else {
			this._logDebug(
				`Received $acceptTerminalDimensions for non-PTY terminal ID ${id} or PTY has no listener.`,
			);
		}
	}

	public $acceptTerminalMaximumDimensions(
		id: string,

		columns: number,

		rows: number,
	): void {
		this._logInfo(
			`RPC $acceptTerminalMaximumDimensions: ID='${id}', MaxCols=${columns}, MaxRows=${rows}`,
		);

		// TODO: Store and potentially expose max dimensions if API supports it, or pass to PTY.
	}

	public $acceptTerminalInteraction(id: string): void {
		this._logInfo(`RPC $acceptTerminalInteraction: ID='${id}'`);

		const activeTerminal = this.#terminals.get(id);

		if (
			activeTerminal &&
			activeTerminal.state &&
			!activeTerminal.state.isInteractedWith
		) {
			activeTerminal.state.isInteractedWith = true;

			(activeTerminal.apiTerminal as any).state.isInteractedWith = true;

			this.#onDidChangeTerminalStateEmitter.fire(
				activeTerminal.apiTerminal,
			);
		}
	}

	public $acceptTerminalData(id: string, data: string): void {
		// This is for data flowing FROM the terminal process TO the UI (via ExtHost if PTY)
		this._logDebug(
			`RPC $acceptTerminalData: ID='${id}', Data (first 50 chars)='${data.substring(0, 50)}...'`,
		);

		const activeTerminal = this.#terminals.get(id);

		if (activeTerminal?.ptyId) {
			const pty = (
				activeTerminal.apiTerminal
					.creationOptions as VscodeExtensionTerminalOptions
			).pty;

			// The PTY should be listening to an onDidWrite event from this service
			// or this service directly calls a method on the PTY.
			// VS Code ExtHost uses an emitter on ExtHostPseudoterminal: `pty._onProcessData.fire(data);`
			this.#onDidWriteDataEmitter.fire({
				id: activeTerminal.ptyId,

				data,

				// Internal event for PTY's onDidWrite
			});
		} else {
			this._logWarn(
				`Received $acceptTerminalData for non-PTY terminal ID '${id}' or PTY not found.`,
			);
		}
	}

	// --- Helper for Deserializing Options ---
	private _deserializeShellLaunchConfig(
		dto: any,
	): VscodeTerminalOptions | VscodeExtensionTerminalOptions {
		// TODO: Robustly convert DTO back to VscodeTerminalOptions / VscodeExtensionTerminalOptions.
		// This needs to handle `cwd` (UriComponents to VscodeUri), `iconPath` (UriComponents/ThemeIcon DTO to VscodeUri/ThemeIcon),

		// `env` (object), `strictEnv`, `hideFromUser`, `isFeatureTerminal`, `useShellEnvironment`, etc.
		// For PTYs, it would need to find the local PTY instance if `ptyId` were part of DTO (which it isn't here).
		this._logWarnOnce(
			"_deserializeShellLaunchConfig is a STUB. Full DTO to API options conversion needed.",
		);

		return {
			name: dto?.name,

			// Assuming DTO maps 'executable' to 'shellPath'
			shellPath: dto?.executable,

			shellArgs: dto?.args,

			// Example for URI revival
			// cwd: dto.cwd ? VscodeUri.revive(dto.cwd) : undefined,

			// env: dto.env,
		} as VscodeTerminalOptions;
	}

	private _serializeTerminalOptionsForRpc(
		options: VscodeTerminalOptions | VscodeExtensionTerminalOptions,
	): any {
		// TODO: Robustly convert VscodeTerminalOptions / VscodeExtensionTerminalOptions to a serializable DTO.
		// This needs to handle `cwd` (VscodeUri to UriComponents DTO), `iconPath` (VscodeUri/ThemeIcon to DTO), etc.
		// For PTYs, the `pty` object itself is not sent; instead, a PTY is created on MainThread side based on info.
		this._logWarnOnce(
			"_serializeTerminalOptionsForRpc is a STUB. Full API options to DTO conversion needed.",
		);

		return {
			name: options.name,

			shellPath: options.shellPath,

			shellArgs: options.shellArgs,

			// Example
			// cwd: options.cwd ? this._convertApiArgToInternal(options.cwd) : undefined,

			// env: options.env,
		};
	}

	public override dispose(): void {
		super.dispose();

		this.#onDidOpenTerminalEmitter.dispose();

		this.#onDidCloseTerminalEmitter.dispose();

		this.#onDidChangeActiveTerminalEmitter.dispose();

		this.#onDidChangeTerminalStateEmitter.dispose();

		this.#onDidWriteDataEmitter.dispose();

		// Dispose all active terminals
		this.#terminals.forEach((t) => t.apiTerminal.dispose());

		this.#terminals.clear();

		// If collections have dispose
		this.#envVariableCollections.forEach((c) => (c as any).dispose?.());

		this.#envVariableCollections.clear();

		this._logInfo("Disposed.");
	}

	// --- Proposed API: Terminal Profiles ---
	public async getProfiles(options: {
		includeExtensionProfiles?: boolean;
	}): Promise<VscodeTerminalProfile[]> {
		this._logWarnOnce(
			"API STUB: window.getProfiles. Returning empty array.",
		);

		// TODO: RPC to MainThread: $getProfiles(options)
		return [];
	}

	public get onDidChangeAvailableProfiles(): VscodeEvent<void> {
		this._logWarnOnce(
			"API STUB: window.onDidChangeAvailableProfiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	public registerTerminalProfileProvider(
		id: string,

		provider: VscodeTerminalProfileProvider,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: window.registerTerminalProfileProvider (id: ${id}). Returning NOP disposable.`,
		);

		// TODO: RPC to MainThread: $registerTerminalProfileProvider(internalId, id, extensionId)
		// And handle provider.provideTerminalProfiles calls via RPC $provideTerminalProfiles(internalId, cancellationToken)
		return Disposable.None;
	}
}
