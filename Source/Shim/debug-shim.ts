/*---------------------------------------------------------------------------------------------
 * Cocoon Debug API Shim (debug-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `vscode.debug` API namespace.
 * The `vscode.debug` API allows extensions to interact with VS Code's debugging
 * capabilities, such as starting debug sessions, managing breakpoints, and registering
 * debug configuration providers or debug adapter factories.
 *
 * For Cocoon's MVP (Minimum Viable Product), most of these debugging functionalities
 * are not implemented. This shim provides the necessary API surface to allow extensions
 * that use the debug API to compile and run, but calls to most methods will result
 * in warnings, NOPs (No Operations), default/failure return values, or throw
 * "Not Implemented" errors for critical actions that cannot be meaningfully stubbed.
 *
 * Responsibilities (as a stub):
 * - Implementing the `vscode.debug` API interface shape.
 * - Providing NOP or default-returning stubs for all `vscode.debug` methods and properties.
 * - Logging warnings when unimplemented debugging methods are called.
 * - Explicitly throwing an error for `executeTask` (though this is a tasks API method) if debug
 *   were to invoke it, and for `startDebugging`'s core promise if it cannot proceed.
 * - Exposing NOP event emitters for debug-related lifecycle events.
 *
 * Key Interactions:
 * - An instance is made available as `vscode.debug` via the API factory.
 * - In a full implementation, it would interact heavily with a `MainThreadDebugService`
 *   on Mountain via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import {
	// Assuming this shape from extHost.protocol.ts
	MainContext,
	MainThreadDebugServiceShape,
	// DTO for DebugConfiguration
	IDebugConfiguration as RpcDebugConfiguration,
	// Add other DTOs as needed, e.g., for Breakpoint, DebugSession
} from "vs/workbench/api/common/extHost.protocol";
// Import vscode API types for the debug namespace
import {
	DebugConfigurationProviderTriggerKind,
	Uri as VscodeUri,
	type Breakpoint,
	type BreakpointsChangeEvent,
	type DebugAdapterDescriptorFactory,
	type DebugConfiguration,
	type DebugConfigurationProvider,
	type DebugConsole,
	type DebugProtocolBreakpoint,
	type DebugProtocolSource,
	type DebugSession,
	type DebugSessionCustomEvent,
	type DebugSessionOptions,
	type WorkspaceFolder as VscodeWorkspaceFolder,
} from "vscode";

import {
	BaseCocoonShim,
	// For future RPC error handling
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions & Placeholders ---

// Placeholder for the DTO of vscode.DebugSession if sent over RPC
interface RpcDebugSessionDto {
	id: string;

	type: string;

	name: string;

	workspaceFolderUri?: import("vs/base/common/uri").UriComponents;

	configuration: RpcDebugConfiguration;

	// Add other relevant fields from MainThreadDebugService's view of a session
}

/**
 * Defines the service interface for `vscode.debug` that this shim implements for DI.
 */
export interface IExtHostDebugServiceShape {
	readonly _serviceBrand: undefined;

	readonly activeDebugSession: DebugSession | undefined;

	readonly activeDebugConsole: DebugConsole;

	readonly breakpoints: readonly Breakpoint[];

	readonly onDidStartDebugSession: VscodeEvent<DebugSession>;

	readonly onDidTerminateDebugSession: VscodeEvent<DebugSession>;

	readonly onDidChangeActiveDebugSession: VscodeEvent<
		DebugSession | undefined
	>;

	readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent>;

	readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent>;

	startDebugging(
		folder: VscodeWorkspaceFolder | undefined,

		nameOrConfiguration: string | DebugConfiguration,

		options?: DebugSessionOptions | undefined,

		// Returns true if debugging started, false otherwise
	): Promise<boolean>;

	stopDebugging(session?: DebugSession): Promise<void>;

	registerDebugConfigurationProvider(
		debugType: string,

		provider: DebugConfigurationProvider,

		triggerKind?: DebugConfigurationProviderTriggerKind,
	): IDisposable;

	registerDebugAdapterDescriptorFactory(
		debugType: string,

		factory: DebugAdapterDescriptorFactory,
	): IDisposable;

	registerDebugAdapterTrackerFactory(
		debugType: string,

		factory: import("vscode").DebugAdapterTrackerFactory,
	): IDisposable;

	addBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void>;

	removeBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void>;

	asDebugSourceUri(
		source: DebugProtocolSource,

		session?: DebugSession,
	): VscodeUri;

	getDebugProtocolBreakpoint(
		breakpoint: Breakpoint,

		session?: DebugSession,
	): Promise<DebugProtocolBreakpoint | undefined>;

	// TODO: Add stubs for other vscode.debug methods: customDebugAdapterRequest, saveState, etc.
}

/**
 * Stub implementation for vscode.DebugSession
 */
class StubDebugSessionImpl implements DebugSession {
	constructor(
		public readonly id: string,

		public readonly type: string,

		// Can be changed by MainThread via $acceptDebugSessionNameChanged
		public name: string,

		public readonly workspaceFolder: VscodeWorkspaceFolder | undefined,

		public readonly configuration: DebugConfiguration,

		// For logging NOP calls
		private _logService?: ILogServiceForShim,
	) {}

	customRequest(_command: string, _args?: any): Promise<any> {
		this._logService?.warn(
			`[StubDebugSession(${this.id})] STUB: customRequest('${_command}') called. Not implemented.`,
		);

		return Promise.reject(
			new Error(
				`DebugSession.customRequest for command '${_command}' is not implemented in Cocoon.`,
			),
		);
	}

	getDebugProtocolBreakpoint(
		_breakpoint: Breakpoint,
	): Promise<DebugProtocolBreakpoint | undefined> {
		this._logService?.warn(
			`[StubDebugSession(${this.id})] STUB: getDebugProtocolBreakpoint called. Not implemented.`,
		);

		return Promise.resolve(undefined);
	}

	// Stubs for proposed API parts if they were to be added
	// readMemory?(memoryReference: string, offset?: number, count?: number): Promise<vscode.DebugMemoryRegion | undefined>;

	// writeMemory?(memoryReference: string, offset: number, data: Uint8Array, options?: vscode.DebugMemoryWriteOptions): Promise<{ bytesWritten?: number; } | undefined>;
}

/**
 * Cocoon's stub implementation of the `vscode.debug` API.
 */
export class ShimExtHostDebugService
	extends BaseCocoonShim
	implements IExtHostDebugServiceShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadDebugProxy: MainThreadDebugServiceShape | null = null;

	// --- Stubbed Properties ---
	public activeDebugSession: DebugSession | undefined = undefined;

	public readonly activeDebugConsole: DebugConsole;

	// Mutable array for internal updates
	public breakpoints: readonly Breakpoint[] = [];

	// --- Stubbed Event Emitters ---
	private readonly _onDidStartDebugSessionEmitter =
		new VscodeEmitter<DebugSession>();

	public readonly onDidStartDebugSession: VscodeEvent<DebugSession> =
		this._onDidStartDebugSessionEmitter.event;

	private readonly _onDidTerminateDebugSessionEmitter =
		new VscodeEmitter<DebugSession>();

	public readonly onDidTerminateDebugSession: VscodeEvent<DebugSession> =
		this._onDidTerminateDebugSessionEmitter.event;

	private readonly _onDidChangeActiveDebugSessionEmitter = new VscodeEmitter<
		DebugSession | undefined
	>();

	public readonly onDidChangeActiveDebugSession: VscodeEvent<
		DebugSession | undefined
	> = this._onDidChangeActiveDebugSessionEmitter.event;

	private readonly _onDidReceiveDebugSessionCustomEventEmitter =
		new VscodeEmitter<DebugSessionCustomEvent>();

	public readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent> =
		this._onDidReceiveDebugSessionCustomEventEmitter.event;

	private readonly _onDidChangeBreakpointsEmitter =
		new VscodeEmitter<BreakpointsChangeEvent>();

	public readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent> =
		this._onDidChangeBreakpointsEmitter.event;

	// For managing locally "stub-registered" providers
	private readonly _debugConfigProviders = new Map<
		string,
		{
			provider: DebugConfigurationProvider;

			trigger: DebugConfigurationProviderTriggerKind;
		}
	>();

	private readonly _debugAdapterFactories = new Map<
		string,
		DebugAdapterDescriptorFactory
	>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDebugService", rpcService, logService);

		this._logInfo(
			"Initialized (STUBBED implementation). Debug functionality is minimal.",
		);

		if (this._rpcService) {
			this.#mainThreadDebugProxy = this._getProxy(
				MainContext.MainThreadDebugService as ProxyIdentifier<MainThreadDebugServiceShape>,
			);
		}

		if (!this.#mainThreadDebugProxy) {
			this._logWarn(
				"MainThreadDebugService proxy NOT available. All debugging features will be non-functional.",
			);
		}

		this.activeDebugConsole = Object.freeze({
			append: (value: string) =>
				this._logWarnOnce(
					`STUB: activeDebugConsole.append: "${String(value).substring(0, 50)}..."`,
				),

			appendLine: (value: string) =>
				this._logWarnOnce(
					`STUB: activeDebugConsole.appendLine: "${String(value).substring(0, 50)}..."`,
				),
		});
	}

	protected override _requiresRpc(): boolean {
		// For MVP stub. Would be true for a functional version.
		return false;
	}

	public async startDebugging(
		folder: VscodeWorkspaceFolder | undefined,

		nameOrConfiguration: string | DebugConfiguration,

		options?: DebugSessionOptions | undefined,
	): Promise<boolean> {
		const folderUriString = folder ? folder.uri.toString() : "undefined";

		const configName =
			typeof nameOrConfiguration === "string"
				? nameOrConfiguration
				: nameOrConfiguration.name;

		const parentSessionId =
			options && "parentSession" in options
				? options.parentSession?.id
				: undefined;

		this._logWarn(
			`API STUB: vscode.debug.startDebugging called. Folder='${folderUriString}', ConfigName='${configName}', ParentSessionID='${parentSessionId ?? "N/A"}'. ` +
				`This will NOT start a real debug session. Returning false.`,

			"Full Config/Options:",

			nameOrConfiguration,

			options,
		);

		if (!this.#mainThreadDebugProxy) {
			this._logError(
				"Cannot start debugging: MainThreadDebugService proxy unavailable.",
			);

			return false;
		}

		// TODO (Full Implementation):
		// 1. Convert `folder?.uri` to UriComponentsDto.
		// 2. Convert `nameOrConfiguration` (string or DebugConfiguration API type) to RpcDebugConfiguration DTO.
		// 3. Convert `options` (DebugSessionOptions API type) to RpcDebugSessionOptions DTO.
		// 4. Call `this.#mainThreadDebugProxy.$startDebugging(folderDto, configDto, optionsDto)`.
		// 5. MainThread would attempt to launch, then call `$acceptDebugSessionStarted` back to this service.
		//    That callback would create the `StubDebugSessionImpl`, update `activeDebugSession`, and fire events.

		// Simulate failure or no debugger available/attached for the stub.
		return Promise.resolve(false);
	}

	public async stopDebugging(session?: DebugSession): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.stopDebugging called. SessionID='${session?.id ?? "active (or undefined)"}'. NOP.`,
		);

		// TODO (Full Implementation): RPC to `this.#mainThreadDebugProxy?.$stopDebugging(session?.id)`.
		return Promise.resolve();
	}

	public registerDebugConfigurationProvider(
		debugType: string,

		provider: DebugConfigurationProvider,

		triggerKind?: DebugConfigurationProviderTriggerKind,
	): IDisposable {
		const actualTrigger =
			triggerKind ?? DebugConfigurationProviderTriggerKind.Initial;

		this._logWarnOnce(
			`API STUB: vscode.debug.registerDebugConfigurationProvider called. Type='${debugType}', Trigger=${DebugConfigurationProviderTriggerKind[actualTrigger]}. Provider is stored locally but NOT registered with MainThread.`,
		);

		this._debugConfigProviders.set(debugType, {
			provider,

			trigger: actualTrigger,
		});

		// TODO (Full Implementation): RPC to `this.#mainThreadDebugProxy?.$registerDebugConfigurationProvider(...)`.
		return toDisposable(() => {
			this._logDebug(
				`Disposing stub registration for DebugConfigurationProvider type='${debugType}'.`,
			);

			this._debugConfigProviders.delete(debugType);

			// TODO: RPC to `$unregisterDebugConfigurationProvider(handle)`.
		});
	}

	public registerDebugAdapterDescriptorFactory(
		debugType: string,

		factory: DebugAdapterDescriptorFactory,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.debug.registerDebugAdapterDescriptorFactory called. Type='${debugType}'. Factory is stored locally but NOT registered with MainThread.`,
		);

		this._debugAdapterFactories.set(debugType, factory);

		// TODO (Full Implementation): RPC to `this.#mainThreadDebugProxy?.$registerDebugAdapterDescriptorFactory(...)`.
		return toDisposable(() => {
			this._logDebug(
				`Disposing stub registration for DebugAdapterDescriptorFactory type='${debugType}'.`,
			);

			this._debugAdapterFactories.delete(debugType);

			// TODO: RPC to `$unregisterDebugAdapterDescriptorFactory(handle)`.
		});
	}

	public registerDebugAdapterTrackerFactory(
		debugType: string,

		// _factory marked unused
		_factory: import("vscode").DebugAdapterTrackerFactory,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.debug.registerDebugAdapterTrackerFactory called. Type='${debugType}'. This is a No-Operation.`,
		);

		// NOP
		return Disposable.None;
	}

	public async addBreakpoints(
		breakpointsToAdd: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.addBreakpoints called. Count=${breakpointsToAdd.length}. NOP.`,
		);

		// TODO (Full Implementation): Convert Breakpoint[] to DTOs, RPC to `this.#mainThreadDebugProxy?.$addBreakpoints(dtos)`.
		// MainThread would then call `$acceptBreakpointsDelta`.
		return Promise.resolve();
	}

	public async removeBreakpoints(
		breakpointsToRemove: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.removeBreakpoints called. Count=${breakpointsToRemove.length}. NOP.`,
		);

		// TODO (Full Implementation): Convert to IDs or DTOs, RPC to `this.#mainThreadDebugProxy?.$removeBreakpoints(idsOrDtos)`.
		return Promise.resolve();
	}

	public asDebugSourceUri(
		source: DebugProtocolSource,

		session?: DebugSession,
	): VscodeUri {
		const sessionPart = session ? ` (session: ${session.id})` : "";

		const sourcePath = source.path || `ref:${source.sourceReference}`;

		this._logWarnOnce(
			`API STUB: vscode.debug.asDebugSourceUri called. SourcePath='${sourcePath}'${sessionPart}. Returning dummy URI.`,
		);

		return VscodeUri.parse(
			`debug-source-stub:${encodeURIComponent(sourcePath)}?session=${session?.id || "none"}`,
		);
	}

	public async getDebugProtocolBreakpoint(
		breakpoint: Breakpoint,

		session?: DebugSession,
	): Promise<DebugProtocolBreakpoint | undefined> {
		const bpId = (breakpoint as any).id || "unknown_bp_id";

		this._logWarnOnce(
			`API STUB: vscode.debug.getDebugProtocolBreakpoint called for BreakpointID='${bpId}', SessionID='${session?.id || "none"}'. Returning undefined.`,
		);

		// TODO (Full Implementation): RPC to `this.#mainThreadDebugProxy?.$getDebugProtocolBreakpoint(sessionId, apiBpId)`
		return Promise.resolve(undefined);
	}

	// --- RPC Callbacks from MainThread (ExtHostDebugServiceShape) ---
	// These would be called by MainThreadDebugService to update Cocoon's state.
	// For MVP stubs, they mostly log.

	public $acceptDebugSessionStarted(sessionDto: RpcDebugSessionDto): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionStarted received from MainThread. SessionID='${sessionDto.id}', Type='${sessionDto.type}', Name='${sessionDto.name}'.`,
		);

		// TODO (Full Implementation):
		// const workspaceFolder = sessionDto.workspaceFolderUri ? this._extHostWorkspace.getWorkspaceFolder(URI.revive(sessionDto.workspaceFolderUri)) : undefined;

		// const revivedConfig = this._reviveRpcDebugConfiguration(sessionDto.configuration);

		// const session = new StubDebugSessionImpl(sessionDto.id, sessionDto.type, sessionDto.name, workspaceFolder, revivedConfig, this._logService);

		// Clear breakpoints for new session? Or are they global?
		// (this.breakpoints as Breakpoint[]) = [];

		// this.activeDebugSession = session;

		// this._onDidStartDebugSessionEmitter.fire(session);

		// this._onDidChangeActiveDebugSessionEmitter.fire(session);
	}

	public $acceptDebugSessionTerminated(sessionDto: RpcDebugSessionDto): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionTerminated received from MainThread. SessionID='${sessionDto.id}'.`,
		);

		// TODO (Full Implementation):
		// Or find by ID if managing multiple
		// const session = this.activeDebugSession;

		// if (session && session.id === sessionDto.id) {

		//     this.activeDebugSession = undefined;

		//     this._onDidTerminateDebugSessionEmitter.fire(session);

		//     this._onDidChangeActiveDebugSessionEmitter.fire(undefined);

		// }
	}

	// ... other $accept* methods from ExtHostDebugServiceShape would be stubbed similarly ...

	public override dispose(): void {
		super.dispose();

		this._onDidStartDebugSessionEmitter.dispose();

		this._onDidTerminateDebugSessionEmitter.dispose();

		this._onDidChangeActiveDebugSessionEmitter.dispose();

		this._onDidReceiveDebugSessionCustomEventEmitter.dispose();

		this._onDidChangeBreakpointsEmitter.dispose();

		this._debugConfigProviders.clear();

		this._debugAdapterFactories.clear();

		this._logInfo("Disposed.");
	}
}
