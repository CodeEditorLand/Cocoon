/*---------------------------------------------------------------------------------------------
 * Cocoon Terminal Service Shim (terminal-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.window` terminal-related APIs, primarily governed by
 * the `IExtHostTerminalService` interface. This shim manages terminal lifecycle,
 * interactions, and environment variable collections.
 *
 * Most actions involving actual terminal backends are proxied to a
 * `MainThreadTerminalService` in Mountain via RPC. Environment variable changes
 * are notified to Mountain via direct Vine IPC.
 *
 * Responsibilities:
 * - `ShimExtHostTerminalService`:
 *   - Implements `createTerminal()`. Shell terminal creation is proxied to Mountain via RPC.
 *     PTY terminal creation is heavily stubbed for MVP.
 *   - Manages `ExtHostTerminal` instances (internal representation for `vscode.Terminal`).
 *   - Provides `vscode.window.terminals` and `vscode.window.activeTerminal`, updated by RPC.
 *   - Exposes terminal lifecycle events, fired based on RPCs from Mountain.
 *   - Implements `getEnvironmentVariableCollection()`, returning `ShimEnvironmentVariableCollectionImpl`.
 *   - Handles RPC calls from Mountain (`ExtHostTerminalServiceShape`) to update terminal states.
 * - `ExtHostTerminal` (internal class): Wraps `vscode.Terminal` API object, proxies actions.
 * - `ShimEnvironmentVariableCollectionImpl`: Implements `vscode.EnvironmentVariableCollection`,
 *   sends changes to Mountain via direct IPC ("terminal_setEnvironmentVariableCollection").
 *
 * Key Interactions:
 * - Registered with DI. Its methods contribute to `vscode.window`.
 * - RPC with `MainContext.MainThreadTerminalService`.
 * - Direct IPC for environment variable collection changes.
 * - PTY support is a major TODO for full functionality.
 * - Terminal Profiles API is stubbed.
 *
 * TODO (Major Features for Full Implementation):
 * - Full PTY data streaming and lifecycle management via RPC.
 * - Complete DTO conversions for all `TerminalOptions` and `ExtensionTerminalOptions`.
 * - Implement Terminal Profiles API (`getProfiles`, `registerTerminalProfileProvider`, etc.).
 * - Implement Shell Integration event propagation from MainThread.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	Disposable,
	DisposableStore,
	MutableDisposable,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
import { ThemeColor, ThemeIcon } from "vs/base/common/themables"; // For TerminalOptions.iconPath
import {
	URI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import { generateUuid } from "vs/base/common/uuid";
import {
	ExtHostContext,
	MainContext,
	type EnvironmentVariableCollectionSerialized,
	type EnvironmentVariableScopeTuple,
	type ExtHostTerminalIdentifier, // Represents the terminal ID used across RPC
	type ExtHostTerminalServiceShape,
	type IProcessPropertyMapDto,
	type IShellLaunchConfigDto, // DTO for terminal creation options
	// type ITerminalCommandDto, type ITerminalDimensionsDto, type ITerminalLaunchErrorDto,
	// type ITerminalProfileDto,
	type MainThreadTerminalServiceShape,
} from "vs/workbench/api/common/extHost.protocol";
// Placeholder for a more specific ITerminalInternalOptions if needed for differentiating API options from internal flags
import type { ITerminalInternalOptions as InternalTerminalOptions } from "vs/workbench/api/node/extHostTerminalService"; // Borrowing type
import {
	EnvironmentVariableMutatorType as VscodeEnvironmentVariableMutatorType,
	Pseudoterminal as VscodePseudoterminal,
	TerminalDimensions as VscodeTerminalDimensions, // For PTY onDidOpen dimensions
	TerminalExitReason as VscodeTerminalExitReason,
	Uri as VscodeUri,
	ViewColumn as VscodeViewColumn, // For TerminalOptions.location
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type EnvironmentVariableMutator as VscodeEnvironmentVariableMutator,
	type Extension as VscodeExtension,
	type ExtensionTerminalOptions as VscodeExtensionTerminalOptions,
	type Terminal as VscodeTerminal,
	type TerminalCreationOptions as VscodeTerminalCreationOptions, // Union type
	type TerminalDimensionsChangeEvent as VscodeTerminalDimensionsChangeEvent,
	type TerminalExitStatus as VscodeTerminalExitStatus,
	type TerminalOptions as VscodeTerminalOptions,
	type TerminalProfile as VscodeTerminalProfile,
	type TerminalProfileProvider as VscodeTerminalProfileProvider,
	// TerminalShellIntegration related types
	type TerminalShellExecution as VscodeTerminalShellExecution,
	type TerminalShellIntegration as VscodeTerminalShellIntegration,
	type TerminalShellIntegrationContext as VscodeTerminalShellIntegrationContext,
	type TerminalShellIntegrationShellExecutionContext as VscodeTerminalShellIntegrationShellExecutionContext,
	type TerminalState as VscodeTerminalState,
} from "vscode";

// API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// For asTerminalColor helper

// --- Helper Functions ---
function asTerminalIcon(
	iconPath?: VscodeUri | { light: VscodeUri; dark: VscodeUri } | ThemeIcon,
):
	| VSCodeInternalUriComponents
	| { light: VSCodeInternalUriComponents; dark: VSCodeInternalUriComponents }
	| { id: string; color?: string }
	| undefined {
	if (!iconPath) return undefined;
	if (iconPath instanceof VscodeUri) return iconPath.toJSON(); // Converts to UriComponents
	if (iconPath instanceof ThemeIcon)
		return { id: iconPath.id, color: iconPath.color?.id };
	if (
		"light" in iconPath &&
		"dark" in iconPath &&
		iconPath.light instanceof VscodeUri &&
		iconPath.dark instanceof VscodeUri
	) {
		return { light: iconPath.light.toJSON(), dark: iconPath.dark.toJSON() };
	}
	return undefined; // Or log warning for unsupported type
}
function asTerminalColor(color?: ThemeColor | string): string | undefined {
	if (!color) return undefined;
	return typeof color === "string" ? color : color.id;
}

// --- Internal Classes ---
interface ActiveTerminal {
	id: ExtHostTerminalIdentifier; // Can be string (extHost-generated UUID) or number (MainThread-assigned)
	name?: string;
	apiTerminal: VscodeTerminal;
	ptyId?: number; // If PTY-backed, for ExtHostPseudoterminal mapping
	processIdPromise: Promise<number | undefined>;
	processIdResolve?: (pid: number | undefined) => void;
	processIdReject?: (reason?: any) => void; // For PTY launch failures reported by MainThread
	exitStatus?: VscodeTerminalExitStatus;
	state: VscodeTerminalState; // Mutable state
	_lastDimensions?: VscodeTerminalDimensions; // For onDidChangeTerminalDimensions
	_creationOptions: VscodeTerminalCreationOptions; // Store for API object
}

class ShimEnvironmentVariableCollectionImpl
	implements VscodeEnvironmentVariableCollection
{
	readonly #map: Map<string, VscodeEnvironmentVariableMutator> = new Map();
	readonly #persistent = true; // Default for extension-contributed env vars
	readonly #description?: string;
	readonly #scope?: import("vscode").EnvironmentVariableScope; // VS Code API type
	readonly #onDidChangeCollectionEmitter = new VscodeEmitter<void>();
	public readonly onDidChange: VscodeEvent<void> =
		this.#onDidChangeCollectionEmitter.event;
	private readonly _disposables = new DisposableStore();

	constructor(
		private readonly _extensionId: string, // Changed from VscodeExtension<any> to string ID
		private readonly _service: ShimExtHostTerminalService, // Parent service to call IPC
		private readonly _logService?: ILogServiceForShim,
		scope?: import("vscode").EnvironmentVariableScope,
	) {
		this.#scope = scope;
		this._disposables.add(this.#onDidChangeCollectionEmitter);
	}
	private _serializeAndNotify(): void {
		const serializedCollection: EnvironmentVariableCollectionSerialized =
			[];
		this.#map.forEach((mutator, variable) => {
			serializedCollection.push([
				variable,
				{
					value: mutator.value,
					type: mutator.type,
					options: mutator.options,
				},
			]);
		});
		let scopeDto: EnvironmentVariableScopeTuple | undefined = undefined;
		if (this.#scope?.workspaceFolder) {
			const workspaceFolderUriDto = (
				this._service as any as BaseCocoonShim
			)._convertApiArgToInternal(this.#scope.workspaceFolder.uri) as
				| VSCodeInternalUriComponents
				| undefined;
			scopeDto = workspaceFolderUriDto
				? [{ workspaceFolder: workspaceFolderUriDto }]
				: undefined;
		}
		const ipcParams: IProcessPropertyMapDto = {
			envCollection: serializedCollection,
			scope: scopeDto,
			extensionIdentifier: this._extensionId,
		};
		this._service._ipcNotify(
			"terminal_setEnvironmentVariableCollection",
			ipcParams,
		);
		this.#onDidChangeCollectionEmitter.fire();
	}
	get persistent(): boolean {
		return this.#persistent;
	}
	get description(): string | undefined {
		return this.#description;
	} // API field
	get scope(): import("vscode").EnvironmentVariableScope | undefined {
		return this.#scope;
	} // API field
	replace(v: string, val: string, opt?: any): void {
		this.#map.set(v, {
			value: val,
			type: VscodeEnvironmentVariableMutatorType.Replace,
			options: opt,
		});
		this._serializeAndNotify();
	}
	append(v: string, val: string, opt?: any): void {
		this.#map.set(v, {
			value: val,
			type: VscodeEnvironmentVariableMutatorType.Append,
			options: opt,
		});
		this._serializeAndNotify();
	}
	prepend(v: string, val: string, opt?: any): void {
		this.#map.set(v, {
			value: val,
			type: VscodeEnvironmentVariableMutatorType.Prepend,
			options: opt,
		});
		this._serializeAndNotify();
	}
	get(v: string): VscodeEnvironmentVariableMutator | undefined {
		return this.#map.get(v);
	}
	forEach(
		cb: (
			v: string,
			m: VscodeEnvironmentVariableMutator,
			c: VscodeEnvironmentVariableCollection,
		) => any,
		thisArg?: any,
	): void {
		this.#map.forEach((m, v) => cb.call(thisArg, v, m, this));
	}
	delete(v: string): void {
		if (this.#map.delete(v)) {
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
	public dispose(): void {
		this._disposables.dispose();
	}
}

export class ShimExtHostTerminalService
	extends BaseCocoonShim
	implements ExtHostTerminalServiceShape
{
	public readonly _serviceBrand: undefined;
	readonly #mainThreadTerminalServiceProxy: MainThreadTerminalServiceShape | null =
		null;
	readonly #terminals: Map<ExtHostTerminalIdentifier, ActiveTerminal> =
		new Map(); // Key: MainThread ID (number) or ExtHost UUID (string)
	#activeTerminalId: ExtHostTerminalIdentifier | undefined = undefined;
	readonly #envVariableCollections = new Map<
		string,
		ShimEnvironmentVariableCollectionImpl
	>(); // Key: composite key (extId + scope)
	readonly #onDidOpenTerminalEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTerminal>(),
	);
	public readonly onDidOpenTerminal: VscodeEvent<VscodeTerminal> =
		this.#onDidOpenTerminalEmitter.event;
	readonly #onDidCloseTerminalEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTerminal>(),
	);
	public readonly onDidCloseTerminal: VscodeEvent<VscodeTerminal> =
		this.#onDidCloseTerminalEmitter.event;
	readonly #onDidChangeActiveTerminalEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTerminal | undefined>(),
	);
	public readonly onDidChangeActiveTerminal: VscodeEvent<
		VscodeTerminal | undefined
	> = this.#onDidChangeActiveTerminalEmitter.event;
	readonly #onDidChangeTerminalStateEmitter = this._instanceDisposables.add(
		new VscodeEmitter<VscodeTerminal>(),
	);
	public readonly onDidChangeTerminalState: VscodeEvent<VscodeTerminal> =
		this.#onDidChangeTerminalStateEmitter.event;
	readonly #onDidWriteDataEmitterForPty = this._instanceDisposables.add(
		new VscodeEmitter<{ id: number /*ptyId*/; data: string }>(),
	); // For PTY output
	// New events from VscodeExtHostTerminalServiceShape
	readonly #onDidChangeShellEmitter = this._instanceDisposables.add(
		new Emitter<string>(),
	);
	public readonly onDidChangeShell: Event<string> =
		this.#onDidChangeShellEmitter.event;
	readonly #onDidWriteTerminalDataEmitter = this._instanceDisposables.add(
		new Emitter<vscode.TerminalDataWriteEvent>(),
	);
	public readonly onDidWriteTerminalData: Event<vscode.TerminalDataWriteEvent> =
		this.#onDidWriteTerminalDataEmitter.event;
	readonly #onDidChangeTerminalDimensionsEmitter =
		this._instanceDisposables.add(
			new Emitter<vscode.TerminalDimensionsChangeEvent>(),
		);
	public readonly onDidChangeTerminalDimensions: Event<vscode.TerminalDimensionsChangeEvent> =
		this._onDidChangeTerminalDimensionsEmitter.event;

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
				"MainThreadTerminalService RPC proxy NOT obtained. Terminal features will fail.",
			);
		}
	}

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
		let terminalOptions:
			| VscodeTerminalOptions
			| VscodeExtensionTerminalOptions;
		if (typeof nameOrOptions === "string") {
			terminalOptions = { name: nameOrOptions, shellPath, shellArgs };
		} else {
			terminalOptions = nameOrOptions || {};
		}
		this._logDebug(
			`API createTerminal called. Name: '${terminalOptions.name}', Options:`,
			terminalOptions,
		);

		if (!this.#mainThreadTerminalServiceProxy) {
			this._logError(
				"Cannot create terminal: MainThread RPC proxy unavailable.",
			);
			throw new Error("Terminal service is currently unavailable.");
		}

		if ((terminalOptions as VscodeExtensionTerminalOptions).pty) {
			return this._createTerminalPty(
				terminalOptions as VscodeExtensionTerminalOptions,
			);
		} else {
			return this._createShellTerminal(terminalOptions);
		}
	}

	private _createShellTerminal(
		options: VscodeTerminalOptions,
	): VscodeTerminal {
		const extHostTerminalId = generateUuid(); // ExtHost generates a UUID for tracking before MainThread ID is known
		const { apiTerminal, pidPromiseResolve, pidPromiseReject } =
			this._createTerminalApiObjectAndState(extHostTerminalId, options);

		const activeTerminal: ActiveTerminal = {
			id: extHostTerminalId,
			name: options.name,
			apiTerminal,
			processIdPromise: apiTerminal.processId,
			processIdResolve: pidPromiseResolve,
			processIdReject,
			state: { isInteractedWith: false },
			_creationOptions: options,
		};
		this.#terminals.set(extHostTerminalId, activeTerminal); // Store with temporary ExtHost ID

		const optionsDto = this._serializeTerminalOptionsForRpc(
			options,
			extHostTerminalId,
		);
		this._logDebug(
			"Requesting MainThread to create shell terminal with DTO:",
			optionsDto,
		);

		this.#mainThreadTerminalServiceProxy!.$createTerminal(optionsDto)
			.then((mainThreadId) => {
				// MainThread returns its internal ID upon successful request (not opening yet)
				// This ID is not usually the one used to identify the terminal instance,
				// $acceptTerminalOpened provides the final `id` that matches `_id` on the terminal.
				// For now, we assume the extHostTerminalId IS the tracking ID until $acceptTerminalOpened potentially updates it.
				// This part of the flow needs to be robustly handled with $acceptTerminalOpened.
				// If `$createTerminal` directly returns the ID that `$acceptTerminalOpened` will use, that's simpler.
				// Let's assume `$createTerminal` is fire-and-forget here, and `$acceptTerminalOpened` provides the real MainThread ID.
				this._logDebug(
					`$createTerminal RPC sent for ExtHost ID '${extHostTerminalId}'. Awaiting $acceptTerminalOpened with MainThread ID.`,
				);
			})
			.catch((e) => {
				const error = refineErrorForShim(
					e,
					this._logService,
					"$createTerminal RPC",
				);
				this._logError(
					`RPC $createTerminal for ExtHost ID '${extHostTerminalId}' failed:`,
					error,
				);
				// If creation request fails, reject the PID promise and remove the terminal
				activeTerminal.processIdReject?.(error);
				this.#terminals.delete(extHostTerminalId);
				// TODO: Should an onDidCloseTerminal event be fired here or an error thrown from createTerminal?
				// For now, the promise for PID will reject. Extensions might not get a terminal object.
			});
		return apiTerminal;
	}

	private _createTerminalPty(
		options: VscodeExtensionTerminalOptions,
	): VscodeTerminal {
		const pty = options.pty;
		if (!pty) {
			this._logError(
				"PTY object missing in ExtensionTerminalOptions for _createTerminalPty",
			);
			throw new Error("PTY object missing.");
		}

		const extHostPtyId = Date.now(); // Simple unique ID for PTY for now, not sent to MainThread this way
		const extHostTerminalId = generateUuid();
		this._logInfo(
			`Creating PTY-backed terminal. ExtHost PTY ID: ${extHostPtyId}, ExtHostTerminalID: ${extHostTerminalId}, Name: '${options.name}'`,
		);

		// TODO: Full PTY Implementation (as outlined in previous analysis)
		// 1. RPC $createTerminal with pty-specific options DTO (includes extHostTerminalId, extHostPtyId)
		//    MainThread returns its mainThreadId for the terminal.
		// 2. ShimExtHostTerminalService then calls $startPty on MainThread, passing mainThreadId and initial dimensions.
		// 3. Setup bi-directional data flow via RPCs:
		//    - ExtHost (pty.onDidWrite) -> $ptyWriteData(mainThreadId, data)
		//    - MainThread (pty output)  -> $acceptPtyData(mainThreadId, data) -> pty.handleInput() (on ext's pty)
		//    - MainThread (UI input)    -> $acceptPtyInput(mainThreadId, data) -> pty.handleInput()
		this._logWarn(
			`PTY terminal creation for '${options.name}' is STUBBED. Data flow and full lifecycle not implemented.`,
		);

		const { apiTerminal, pidPromiseResolve, pidPromiseReject } =
			this._createTerminalApiObjectAndState(
				extHostTerminalId,
				options,
				true /* isPty */,
				pty,
			);
		const activeTerminal: ActiveTerminal = {
			id: extHostTerminalId,
			name: options.name,
			apiTerminal,
			ptyId: extHostPtyId,
			processIdPromise: apiTerminal.processId,
			processIdResolve,
			processIdReject,
			state: { isInteractedWith: false },
			_creationOptions: options,
		};
		this.#terminals.set(extHostTerminalId, activeTerminal);

		// Simulate async PTY opening and PID resolution for stub
		setTimeout(() => {
			try {
				pty.onDidOpen?.(
					options.initialDimensions || { rows: 24, cols: 80 },
				); // Call onDidOpen
				pidPromiseResolve(undefined); // PTYs often don't have a real PID visible this way, or it's -1
				this.$acceptTerminalOpened(
					extHostTerminalId as any,
					extHostTerminalId,
					options.name || `pty-${extHostPtyId}`,
					this._serializeTerminalOptionsForRpc(
						options,
						extHostTerminalId,
					) as IShellLaunchConfigDto,
				);
			} catch (e: any) {
				pidPromiseReject(e);
			}
		}, 10);

		return apiTerminal;
	}

	private _createTerminalApiObjectAndState(
		currentId: ExtHostTerminalIdentifier, // Initially ExtHost UUID, later MainThread ID (number)
		options: VscodeTerminalCreationOptions,
		isPty: boolean = false,
		ptyInstance?: VscodePseudoterminal, // Only for PTY
	): {
		apiTerminal: VscodeTerminal;
		pidPromiseResolve: (pid: number | undefined) => void;
		pidPromiseReject: (reason?: any) => void;
	} {
		let pidPromiseResolve!: (pid: number | undefined) => void;
		let pidPromiseReject!: (reason?: any) => void;
		const pidPromise = new Promise<number | undefined>(
			(resolve, reject) => {
				pidPromiseResolve = resolve;
				pidPromiseReject = reject;
			},
		);
		const self = this; // For closures

		const apiTerminal: VscodeTerminal = {
			get name(): string {
				return (
					self.#terminals.get(currentId)?.name || options.name || ""
				);
			},
			processId: pidPromise,
			creationOptions: Object.freeze(options), // Store a copy of the options
			get exitStatus(): VscodeTerminalExitStatus | undefined {
				return self.#terminals.get(currentId)?.exitStatus;
			},
			get state(): VscodeTerminalState {
				return (
					self.#terminals.get(currentId)?.state || {
						isInteractedWith: false,
					}
				);
			},
			sendText: (text: string, addNewLine: boolean = true) => {
				const term = self.#terminals.get(currentId);
				if (!term) {
					self._logWarn(
						`sendText on potentially disposed/unknown terminal (currentId: ${currentId})`,
					);
					return;
				}
				if (isPty && ptyInstance?.handleInput) {
					// PTY: route to local PTY's handleInput
					ptyInstance.handleInput(
						text +
							(addNewLine
								? ptyInstance.onDidWriteData
									? "\r\n"
									: "\r"
								: ""),
					); // PTYs might expect \r or \r\n
				} else if (!isPty && self.#mainThreadTerminalServiceProxy) {
					// Shell: RPC
					self.#mainThreadTerminalServiceProxy
						.$sendText(term.id as number, text, addNewLine)
						.catch((e) =>
							self._logError(
								`RPC $sendText for terminal ${term.id} failed:`,
								e,
							),
						);
				} else {
					self._logWarn(
						`sendText for terminal ${term.id} NOP (no proxy or not shell).`,
					);
				}
			},
			show: (preserveFocus?: boolean) => {
				const term = self.#terminals.get(currentId);
				if (!term) return;
				self.#mainThreadTerminalServiceProxy
					?.$show(term.id as number, preserveFocus)
					.catch((e) =>
						self._logError(
							`RPC $show for terminal ${term.id} failed:`,
							e,
						),
					);
			},
			hide: () => {
				const term = self.#terminals.get(currentId);
				if (!term) return;
				self.#mainThreadTerminalServiceProxy
					?.$hide(term.id as number)
					.catch((e) =>
						self._logError(
							`RPC $hide for terminal ${term.id} failed:`,
							e,
						),
					);
			},
			dispose: () => {
				const term = self.#terminals.get(currentId);
				if (!term) return;
				self.#mainThreadTerminalServiceProxy
					?.$dispose(term.id as number)
					.catch((e) =>
						self._logError(
							`RPC $dispose for terminal ${term.id} failed:`,
							e,
						),
					);
				// MainThread will call $acceptTerminalClosed, which handles local cleanup.
			},
			get dimensions(): VscodeTerminalDimensions | undefined {
				return self.#terminals.get(currentId)?._lastDimensions;
			},
			// PTY specific events (on the API object itself)
			onDidWriteData: isPty
				? this.#onDidWriteDataEmitterForPty.event
				: VscodeEvent.None, // Only for PTY, needs filtering by ptyId
			onDidOpen:
				isPty && ptyInstance?.onDidOpen
					? ptyInstance.onDidOpen.bind(ptyInstance)
					: VscodeEvent.None,
			onDidClose:
				isPty && ptyInstance?.onDidClose
					? ptyInstance.onDidClose.bind(ptyInstance)
					: VscodeEvent.None,
			onDidChangeDimensions:
				isPty && ptyInstance?.onDidChangeDimensions
					? ptyInstance.onDidChangeDimensions.bind(ptyInstance)
					: VscodeEvent.None,
		};
		return { apiTerminal, pidPromiseResolve, pidPromiseReject };
	}

	public getEnvironmentVariableCollection(
		extension: VscodeExtension<any>,
		scope?: import("vscode").EnvironmentVariableScope | undefined,
	): VscodeEnvironmentVariableCollection {
		this._logDebug(
			`API getEnvironmentVariableCollection called for extension: ${extension.id}, Scope: ${JSON.stringify(scope)}`,
		);
		// Key by extension ID and a scope identifier (e.g., workspace folder URI string)
		const workspaceFolderUriString =
			scope?.workspaceFolder?.uri.toString() ?? "";
		const collectionKey = `${extension.id}:${workspaceFolderUriString}`;

		let collection = this.#envVariableCollections.get(collectionKey);
		if (!collection) {
			collection = new ShimEnvironmentVariableCollectionImpl(
				extension.id,
				this,
				this._logService,
				scope,
			);
			this.#envVariableCollections.set(collectionKey, collection);
		}
		return collection;
	}

	// --- RPC Methods Called by MainThread (ExtHostTerminalServiceShape) ---
	public $acceptTerminalOpened(
		mainThreadId: number,
		extHostTerminalId: string | undefined,
		name: string,
		shellLaunchConfigDto: IShellLaunchConfigDto,
	): void {
		this._logInfo(
			`RPC $acceptTerminalOpened: MainThreadID='${mainThreadId}', ExtHostID='${extHostTerminalId}', Name='${name}'`,
		);
		let activeTerminalEntry = extHostTerminalId
			? this.#terminals.get(extHostTerminalId)
			: undefined;

		if (activeTerminalEntry) {
			// This is a shell terminal created by extHost via $createTerminal
			if (activeTerminalEntry.id !== extHostTerminalId) {
				// Should not happen if map key is extHostTerminalId
				this._logError(
					`Internal ID mismatch for terminal! Initial ExtHostID='${extHostTerminalId}', existing entry ID='${activeTerminalEntry.id}'. MainThreadID='${mainThreadId}'. This is a bug.`,
				);
			}
			// Update the map to use MainThread ID as the primary key now
			this.#terminals.delete(extHostTerminalId);
			activeTerminalEntry.id = mainThreadId;
			this.#terminals.set(mainThreadId, activeTerminalEntry);
			// Update properties on the existing API object
			(activeTerminalEntry.apiTerminal as any).name = name; // Assuming name can be updated by MainThread
			// creationOptions should reflect what MainThread used, deserialize DTO
			(activeTerminalEntry.apiTerminal as any).creationOptions =
				Object.freeze(
					this._deserializeShellLaunchConfig(shellLaunchConfigDto),
				);
			this._logDebug(
				`Finalized shell terminal: MainThreadID='${mainThreadId}', Name='${name}'.`,
			);
		} else {
			// This terminal was likely created by the user directly in the UI, or PTY flow
			const options =
				this._deserializeShellLaunchConfig(shellLaunchConfigDto);
			const { apiTerminal, pidPromiseResolve, pidPromiseReject } =
				this._createTerminalApiObjectAndState(mainThreadId, options);
			activeTerminalEntry = {
				id: mainThreadId,
				name,
				apiTerminal,
				processIdPromise: apiTerminal.processId,
				processIdResolve,
				processIdReject,
				state: { isInteractedWith: false },
				_creationOptions: options,
			};
			this.#terminals.set(mainThreadId, activeTerminalEntry);
			this._logDebug(
				`Accepted new terminal from MainThread: MainThreadID='${mainThreadId}', Name='${name}'.`,
			);
		}
		activeTerminalEntry.state.isInteractedWith = false; // Reset on open
		(activeTerminalEntry.apiTerminal.state as any).isInteractedWith = false;

		this.#onDidOpenTerminalEmitter.fire(activeTerminalEntry.apiTerminal);
	}

	public $acceptTerminalClosed(
		id: number,
		exitCode: number | undefined,
		exitReason: VscodeTerminalExitReason | undefined,
	): void {
		this._logInfo(
			`RPC $acceptTerminalClosed: ID='${id}', ExitCode=${exitCode}, Reason=${exitReason !== undefined ? VscodeTerminalExitReason[exitReason] : "N/A"}`,
		);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal) {
			activeTerminal.exitStatus = { code: exitCode, reason: exitReason };
			(activeTerminal.apiTerminal as any).exitStatus =
				activeTerminal.exitStatus; // Update API object
			this.#onDidCloseTerminalEmitter.fire(activeTerminal.apiTerminal);
			this.#terminals.delete(id);
			if (this.#activeTerminalId === id) {
				this.$acceptActiveTerminalChanged(undefined); // Clear active terminal
			}
		} else {
			this._logWarn(
				`$acceptTerminalClosed for unknown terminal ID: ${id}`,
			);
		}
	}

	public $acceptActiveTerminalChanged(id: number | undefined): void {
		const newActiveId = id; // id from MainThread is number (or undefined)
		this._logInfo(
			`RPC $acceptActiveTerminalChanged: New Active ID='${newActiveId ?? "none"}'`,
		);
		const oldActiveTerminalApi = this.activeTerminal;
		this.#activeTerminalId = newActiveId;
		const newActiveTerminalApi = this.activeTerminal;
		if (oldActiveTerminalApi !== newActiveTerminalApi) {
			this.#onDidChangeActiveTerminalEmitter.fire(newActiveTerminalApi);
		}
	}

	public $acceptTerminalProcessId(id: number, processId: number): void {
		this._logInfo(
			`RPC $acceptTerminalProcessId: ID='${id}', PID=${processId}`,
		);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal?.processIdResolve) {
			activeTerminal.processIdResolve(processId);
		} else {
			this._logWarn(
				`$acceptTerminalProcessId for unknown terminal ID ${id} or PID promise already resolved.`,
			);
		}
	}

	public $acceptTerminalTitleChange(id: number, name: string): void {
		this._logInfo(
			`RPC $acceptTerminalTitleChange: ID='${id}', New Name='${name}'`,
		);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal) {
			activeTerminal.name = name;
			(activeTerminal.apiTerminal as any).name = name; // Update API object
			// TODO: VS Code fires onDidChangeTerminalState for title changes.
			// this.#onDidChangeTerminalStateEmitter.fire(activeTerminal.apiTerminal);
		}
	}

	public $acceptTerminalDimensions(
		id: number,
		columns: number,
		rows: number,
	): void {
		this._logInfo(
			`RPC $acceptTerminalDimensions: ID='${id}', Cols=${columns}, Rows=${rows}`,
		);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal) {
			const newDimensions = { columns, rows };
			activeTerminal._lastDimensions = newDimensions;
			this.#onDidChangeTerminalDimensionsEmitter.fire({
				terminal: activeTerminal.apiTerminal,
				dimensions: newDimensions,
			});

			if (activeTerminal.ptyId) {
				// If it's a PTY-backed terminal
				const pty = (
					activeTerminal._creationOptions as VscodeExtensionTerminalOptions
				).pty;
				pty?.setDimensions?.(newDimensions); // Notify the extension's PTY
			}
		}
	}
	public $acceptTerminalMaximumDimensions(
		id: number,
		columns: number,
		rows: number,
	): void {
		this._logInfo(
			`RPC $acceptTerminalMaximumDimensions: ID='${id}', MaxCols=${columns}, MaxRows=${rows}`,
		);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal?.ptyId) {
			const pty = (
				activeTerminal._creationOptions as VscodeExtensionTerminalOptions
			).pty;
			// VS Code's ExtHostPseudoterminal calls pty.setMaximumDimensions if it exists
			if (typeof (pty as any).setMaximumDimensions === "function") {
				(pty as any).setMaximumDimensions({ columns, rows });
			}
		}
	}
	public $acceptTerminalInteraction(id: number): void {
		this._logInfo(`RPC $acceptTerminalInteraction: ID='${id}'`);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal && !activeTerminal.state.isInteractedWith) {
			activeTerminal.state.isInteractedWith = true;
			// No direct (activeTerminal.apiTerminal.state as any).isInteractedWith = true;
			// because state is a getter. The public event is the signal.
			this.#onDidChangeTerminalStateEmitter.fire(
				activeTerminal.apiTerminal,
			);
		}
	}
	public $acceptTerminalData(id: number, data: string): void {
		// Data from terminal process to UI
		this._logDebug(
			`RPC $acceptTerminalData: ID='${id}', Data (len)=${data.length}`,
		);
		const activeTerminal = this.#terminals.get(id);
		if (activeTerminal) {
			this.#onDidWriteTerminalDataEmitter.fire({
				terminal: activeTerminal.apiTerminal,
				data,
			});
			if (activeTerminal.ptyId) {
				// If PTY, forward to its _onProcessData emitter
				this.#onDidWriteDataEmitterForPty.fire({
					id: activeTerminal.ptyId,
					data,
				});
			}
		} else {
			this._logWarn(
				`$acceptTerminalData for unknown terminal ID '${id}'.`,
			);
		}
	}
	public $acceptTerminalProcessRequestInitialCwd(id: number): void {
		/* TODO for PTYs */ this._logWarn(
			`RPC STUB: $acceptTerminalProcessRequestInitialCwd for ID ${id}.`,
		);
	}
	public $acceptTerminalProcessRequestCwd(id: number): void {
		/* TODO for PTYs */ this._logWarn(
			`RPC STUB: $acceptTerminalProcessRequestCwd for ID ${id}.`,
		);
	}
	public async $acceptProcessRequestLatency(id: number): Promise<number> {
		this._logWarn(`RPC STUB: $acceptProcessRequestLatency for ID ${id}.`);
		return id;
	}
	public $acceptProcessAckDataEvent(_id: number, _charCount: number): void {
		/* NOP in this shim, for flow control */
	}
	public $acceptProcessInput(_id: number, _data: string): void {
		/* TODO for PTYs: forward to pty.handleInput */ this._logWarn(
			`RPC STUB: $acceptProcessInput for ID ${_id}.`,
		);
	}
	public $acceptProcessResize(
		_id: number,
		_cols: number,
		_rows: number,
	): void {
		/* TODO for PTYs: forward to pty.setDimensions */ this._logWarn(
			`RPC STUB: $acceptProcessResize for ID ${_id}.`,
		);
	}
	public $acceptProcessShutdown(_id: number, _immediate: boolean): void {
		/* TODO for PTYs: forward to pty.close */ this._logWarn(
			`RPC STUB: $acceptProcessShutdown for ID ${_id}.`,
		);
	}
	public $acceptProcessTitle(_id: number, _title: string): void {
		this.$acceptTerminalTitleChange(_id, _title);
	} // Alias
	public $acceptProcessOverrideDimensions(
		_id: number,
		_dimensions: ITerminalDimensionsDto | undefined,
	): void {
		/* TODO for PTYs if they support this */ this._logWarn(
			`RPC STUB: $acceptProcessOverrideDimensions for ID ${_id}.`,
		);
	}
	public $acceptProcessShellIntegration(
		_id: number,
		_data: any /*IShellIntegrationDataDto*/,
	): void {
		/* TODO for shell integration */ this._logWarn(
			`RPC STUB: $acceptProcessShellIntegration for ID ${_id}.`,
		);
	}
	public $triggerTerminalRenderer(
		_id: number,
		_cols: number,
		_rows: number,
		_data: VSBuffer,
	): void {
		/* TODO for specific renderer actions */ this._logWarn(
			`RPC STUB: $triggerTerminalRenderer for ID ${_id}.`,
		);
	}
	public $triggerRunCommand(
		_id: number,
		_commandId: string,
		_commandLine: string,
		_cwd: string,
		_nonce: number,
		_cwdUri: VSCodeInternalUriComponents | undefined,
	): void {
		/* TODO for run command feature */ this._logWarn(
			`RPC STUB: $triggerRunCommand for ID ${_id}.`,
		);
	}

	// --- Helpers ---
	private _deserializeShellLaunchConfig(
		dto: IShellLaunchConfigDto,
	): VscodeTerminalOptions {
		this._logService?.trace("Deserializing IShellLaunchConfigDto:", dto);
		return {
			name: dto.name,
			shellPath: dto.executable,
			shellArgs: dto.args,
			cwd:
				dto.cwd &&
				(typeof dto.cwd === "string"
					? dto.cwd
					: VscodeUri.from(VSCodeInternalURI.revive(dto.cwd))),
			env: dto.env,
			strictEnv: dto.strictEnv,
			hideFromUser: dto.hideFromUser,
			isTransient: dto.isTransient,
			// iconPath and color need DTO to API conversion
			iconPath:
				dto.iconPath &&
				(typeof dto.iconPath === "string" /* old theme icon id */
					? new ThemeIcon(dto.iconPath)
					: VscodeUri.revive(
							dto.iconPath as VSCodeInternalUriComponents,
						)), // Simplified
			color:
				dto.color &&
				(typeof dto.color === "string"
					? new ThemeColor(dto.color)
					: undefined), // Simplified
			location:
				dto.location &&
				(typeof dto.location === "number"
					? (dto.location as VscodeViewColumn)
					: (dto.location as any).viewColumn !== undefined
						? {
								viewColumn: (dto.location as any)
									.viewColumn as VscodeViewColumn,
								preserveFocus: (dto.location as any)
									.preserveFocus,
							}
						: undefined), // Simplified
			message: dto.initialText,
		};
	}
	private _serializeTerminalOptionsForRpc(
		options: VscodeTerminalOptions | VscodeExtensionTerminalOptions,
		extHostTerminalId: string,
	): IShellLaunchConfigDto {
		this._logService?.trace(
			"Serializing TerminalOptions to IShellLaunchConfigDto:",
			options,
		);
		const result: IShellLaunchConfigDto = {
			name: options.name,
			executable: options.shellPath,
			args: options.shellArgs,
			cwd:
				options.cwd &&
				(typeof options.cwd === "string"
					? options.cwd
					: (this._convertApiArgToInternal(
							options.cwd,
						) as VSCodeInternalUriComponents)),
			env: options.env,
			strictEnv: options.strictEnv,
			hideFromUser: options.hideFromUser,
			isTransient: options.isTransient,
			iconPath: options.iconPath
				? asTerminalIcon(options.iconPath)
				: undefined,
			color: options.color ? asTerminalColor(options.color) : undefined,
			initialText: (options as VscodeTerminalOptions).message, // `message` is on TerminalOptions
			isFeatureTerminal: (options as InternalTerminalOptions)
				.isFeatureTerminal, // Internal option
			useShellEnvironment: (options as InternalTerminalOptions)
				.useShellEnvironment, // Internal option
			extHostTerminalId, // Pass our temporary ID
			isPty: !!(options as VscodeExtensionTerminalOptions).pty,
		};
		if (options.location) {
			if (typeof options.location === "number") {
				// ViewColumn
				result.location = options.location;
			} else if ("viewColumn" in options.location) {
				// TerminalEditorLocationOptions
				result.location = {
					viewColumn: (options.location as any).viewColumn,
					preserveFocus: (options.location as any).preserveFocus,
				};
			} else if ("parentTerminal" in options.location) {
				// TerminalSplitLocationOptions
				const parentTerm = (options.location as any).parentTerminal as
					| VscodeTerminal
					| undefined;
				const parentActiveTerm = parentTerm
					? this.#terminals.get(
							this._findTerminalIdByApiObject(parentTerm)!,
						)
					: undefined;
				if (parentActiveTerm) {
					result.location = { parentTerminal: parentActiveTerm.id };
				} else {
					this._logWarn(
						"Could not find parentTerminal ID for split location.",
					);
				}
			}
		}
		return result;
	}
	private _findTerminalIdByApiObject(
		apiTerminal: VscodeTerminal,
	): ExtHostTerminalIdentifier | undefined {
		for (const [id, activeTerm] of this.#terminals) {
			if (activeTerm.apiTerminal === apiTerminal) return id;
		}
		return undefined;
	}

	public override dispose(): void {
		super.dispose(); // Handles emitters via _instanceDisposables
		this.#terminals.forEach((t) => t.apiTerminal.dispose()); // Should trigger $dispose RPCs
		this.#terminals.clear();
		this.#envVariableCollections.forEach((c) => c.dispose());
		this.#envVariableCollections.clear();
		this._logInfo("Disposed.");
	}

	// --- Proposed API: Terminal Profiles (Stubs) ---
	public async getProfiles(_options: {
		includeExtensionProfiles?: boolean;
	}): Promise<VscodeTerminalProfile[]> {
		this._logWarnOnce("API STUB: window.getProfiles. Returning [].");
		return [];
	}
	public get onDidChangeAvailableProfiles(): VscodeEvent<void> {
		this._logWarnOnce(
			"API STUB: window.onDidChangeAvailableProfiles. NOP event.",
		);
		return VscodeEvent.None;
	}
	public registerTerminalProfileProvider(
		id: string,
		_provider: VscodeTerminalProfileProvider,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: window.registerTerminalProfileProvider (id: ${id}). NOP disposable.`,
		);
		return Disposable.None;
	}
}
