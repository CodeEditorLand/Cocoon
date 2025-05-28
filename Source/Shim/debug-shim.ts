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
 * - Explicitly throwing an error for `startDebugging` if it cannot proceed (e.g. no proxy).
 * - Exposing NOP event emitters for debug-related lifecycle events.
 * - Implementing RPC stubs for methods expected to be called by `MainThreadDebugService` (e.g., `$acceptDebugSessionStarted`),
 *   primarily for contract definition and logging unexpected calls.
 *
 * Key Interactions:
 * - An instance is made available as `vscode.debug` via the API factory.
 * - In a full implementation, it would interact heavily with a `MainThreadDebugService`
 *   on Mountain via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *
 * TODO (Major Features for Full Implementation):
 * - Implement `startDebugging` to proxy to MainThread, handle session creation, and fire events.
 * - Implement breakpoint management (`addBreakpoints`, `removeBreakpoints`, `breakpoints` property, `onDidChangeBreakpoints` event) via RPC.
 * - Implement `DebugConfigurationProvider` registration and RPC handlers for `provide`/`resolve` methods.
 * - Implement `DebugAdapterDescriptorFactory` registration and RPC handler for `provide` method.
 * - Implement `stopDebugging` via RPC.
 * - Fully implement all `ExtHostDebugServiceShape` RPC methods to update local state and fire events.
 * - Implement type converters for all debug-related DTOs and API types (e.g., DebugConfiguration, Breakpoint, DebugSessionOptions, DebugAdapterDescriptor).
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import {
	type IBreakpointDto as RpcBreakpointDto, // DTO for Breakpoint
	// Assuming this shape from extHost.protocol.ts
	// MainContext, // Not used for proxy in stub
	// MainThreadDebugServiceShape, // Not used for proxy in stub
	type IDebugConfiguration as RpcDebugConfiguration, // DTO for DebugConfiguration
	type IDebugSessionOptionsDto as RpcDebugSessionOptionsDto, // DTO for DebugSessionOptions
	type ExtHostDebugServiceShape as VscodeExtHostDebugServiceShape, // RPC shape this service implements
	// type MainThreadDebugServiceShape as VscodeMainThreadDebugServiceShape // Proxy type
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
	refineErrorForShim, // For future RPC error handling
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // Not used if proxy is not obtained in stub
} from "./_baseShim";

// --- Type Definitions & Placeholders ---

// Placeholder for the DTO of vscode.DebugSession if sent over RPC
interface RpcDebugSessionDto {
	id: string; // MainThread-assigned session ID
	type: string;
	name: string;
	workspaceFolderUri?: import("vs/base/common/uri").UriComponents;
	configuration: RpcDebugConfiguration;
	parentSessionID?: string; // ID of parent session if this is a child
	compact?: boolean; // If UI should be compact
	// Add other relevant fields from MainThreadDebugService's view of a session
}

/** Defines the service interface for `vscode.debug` that this shim implements for DI. */
export interface IExtHostDebugServiceShape
	extends VscodeExtHostDebugServiceShape {
	// Extends RPC shape
	readonly _serviceBrand: undefined;
	// API properties
	readonly activeDebugSession: DebugSession | undefined;
	readonly activeDebugConsole: DebugConsole;
	readonly breakpoints: readonly Breakpoint[];
	// API events
	readonly onDidStartDebugSession: VscodeEvent<DebugSession>;
	readonly onDidTerminateDebugSession: VscodeEvent<DebugSession>;
	readonly onDidChangeActiveDebugSession: VscodeEvent<
		DebugSession | undefined
	>;
	readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent>;
	readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent>;
	// API methods
	startDebugging(
		folder: VscodeWorkspaceFolder | undefined,
		nameOrConfiguration: string | DebugConfiguration,
		options?: DebugSessionOptions | DebugSession,
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
}

/** Stub implementation for vscode.DebugSession */
class StubDebugSessionImpl implements DebugSession {
	constructor(
		public readonly id: string,
		public readonly type: string,
		public name: string, // Can be changed by MainThread via $acceptDebugSessionNameChanged
		public readonly workspaceFolder: VscodeWorkspaceFolder | undefined,
		public readonly configuration: DebugConfiguration,
		public readonly parentSession?: DebugSession, // Added from DebugSessionOptions
		private _logService?: ILogServiceForShim,
	) {}

	customRequest(_command: string, _args?: any): Promise<any> {
		const errorMsg = `[StubDebugSession(${this.id})] STUB: customRequest('${_command}') called. Not implemented in Cocoon.`;
		this._logService?.warn(errorMsg);
		return Promise.reject(new Error(errorMsg));
	}

	getDebugProtocolBreakpoint(
		_breakpoint: Breakpoint,
	): Promise<DebugProtocolBreakpoint | undefined> {
		const errorMsg = `[StubDebugSession(${this.id})] STUB: getDebugProtocolBreakpoint called. Not implemented in Cocoon.`;
		this._logService?.warn(errorMsg);
		return Promise.resolve(undefined);
	}
}

/** Cocoon's stub implementation of the `vscode.debug` API. */
export class ShimExtHostDebugService
	extends BaseCocoonShim
	implements IExtHostDebugServiceShape
{
	// Implements both DI shape and RPC shape
	public readonly _serviceBrand: undefined;
	// #mainThreadDebugProxy: VscodeMainThreadDebugServiceShape | null = null; // Use VS Code's shape type

	// --- Stubbed Properties ---
	public activeDebugSession: DebugSession | undefined = undefined;
	public readonly activeDebugConsole: DebugConsole;
	public breakpoints: readonly Breakpoint[] = []; // Mutable array for internal updates

	// --- Stubbed Event Emitters ---
	private readonly _onDidStartDebugSessionEmitter =
		this._instanceDisposables.add(new VscodeEmitter<DebugSession>());
	public readonly onDidStartDebugSession: VscodeEvent<DebugSession> =
		this._onDidStartDebugSessionEmitter.event;
	private readonly _onDidTerminateDebugSessionEmitter =
		this._instanceDisposables.add(new VscodeEmitter<DebugSession>());
	public readonly onDidTerminateDebugSession: VscodeEvent<DebugSession> =
		this._onDidTerminateDebugSessionEmitter.event;
	private readonly _onDidChangeActiveDebugSessionEmitter =
		this._instanceDisposables.add(
			new VscodeEmitter<DebugSession | undefined>(),
		);
	public readonly onDidChangeActiveDebugSession: VscodeEvent<
		DebugSession | undefined
	> = this._onDidChangeActiveDebugSessionEmitter.event;
	private readonly _onDidReceiveDebugSessionCustomEventEmitter =
		this._instanceDisposables.add(
			new VscodeEmitter<DebugSessionCustomEvent>(),
		);
	public readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent> =
		this._onDidReceiveDebugSessionCustomEventEmitter.event;
	private readonly _onDidChangeBreakpointsEmitter =
		this._instanceDisposables.add(
			new VscodeEmitter<BreakpointsChangeEvent>(),
		);
	public readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent> =
		this._onDidChangeBreakpointsEmitter.event;

	// For managing locally "stub-registered" providers
	private readonly _debugConfigProviders = new Map<
		string,
		{
			provider: DebugConfigurationProvider;
			trigger: DebugConfigurationProviderTriggerKind;
			handle: number;
		}
	>();
	private readonly _debugAdapterFactories = new Map<
		string,
		{ factory: DebugAdapterDescriptorFactory; handle: number }
	>();
	private _providerHandlePool = 0;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDebugService", rpcService, logService);
		this._logInfo(
			"Initialized (STUBBED implementation). Debug functionality is minimal.",
		);

		// if (this._rpcService) {
		// this.#mainThreadDebugProxy = this._getProxy(
		// MainContext.MainThreadDebugService as ProxyIdentifier<VscodeMainThreadDebugServiceShape>
		// );
		// }
		// if (!this.#mainThreadDebugProxy) {
		// this._logWarn("MainThreadDebugService proxy NOT available. All debugging features will be non-functional.");
		// }

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
		return false;
	} // For MVP stub. Would be true for functional.

	public async startDebugging(
		folder: VscodeWorkspaceFolder | undefined,
		nameOrConfiguration: string | DebugConfiguration,
		optionsOrParentSession?: DebugSessionOptions | DebugSession, // API allows DebugSession as parent
	): Promise<boolean> {
		const folderUriString = folder ? folder.uri.toString() : "undefined";
		const configName =
			typeof nameOrConfiguration === "string"
				? nameOrConfiguration
				: nameOrConfiguration.name;
		const parentSessionId =
			optionsOrParentSession && "id" in optionsOrParentSession
				? (optionsOrParentSession as DebugSession).id
				: undefined;
		const optionsForLog =
			optionsOrParentSession && !("id" in optionsOrParentSession)
				? optionsOrParentSession
				: {};

		const errorMsg = `API STUB: vscode.debug.startDebugging called. Folder='${folderUriString}', ConfigName='${configName}', ParentSessionID='${parentSessionId ?? "N/A"}'. This will NOT start a real debug session. Returning false.`;
		this._logError(
			errorMsg,
			"Full Config/Options:",
			nameOrConfiguration,
			optionsForLog,
		); // Log as error because it's a non-functional critical API.

		// if (!this.#mainThreadDebugProxy) {
		// this._logError("Cannot start debugging: MainThreadDebugService proxy unavailable.");
		// return false;
		// }
		// TODO (Full Implementation): outlined in previous analysis.
		return Promise.resolve(false); // Simulate failure or no debugger for stub
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
		const handle = ++this._providerHandlePool;
		this._logWarnOnce(
			`API STUB: vscode.debug.registerDebugConfigurationProvider called. Type='${debugType}', Trigger=${DebugConfigurationProviderTriggerKind[actualTrigger]}, Handle=${handle}. Provider is stored locally but NOT registered with MainThread.`,
		);
		this._debugConfigProviders.set(debugType, {
			provider,
			trigger: actualTrigger,
			handle,
		});
		// TODO (Full Implementation): RPC to `this.#mainThreadDebugProxy?.$registerDebugConfigurationProvider(...)`.
		return toDisposable(() => {
			this._logDebug(
				`Disposing stub registration for DebugConfigurationProvider Handle=${handle}, Type='${debugType}'.`,
			);
			this._debugConfigProviders.delete(debugType); // Simplistic, real one uses handle
			// TODO: RPC to `$unregisterDebugConfigurationProvider(handle)`.
		});
	}

	public registerDebugAdapterDescriptorFactory(
		debugType: string,
		factory: DebugAdapterDescriptorFactory,
	): IDisposable {
		const handle = ++this._providerHandlePool;
		this._logWarnOnce(
			`API STUB: vscode.debug.registerDebugAdapterDescriptorFactory called. Type='${debugType}', Handle=${handle}. Factory is stored locally but NOT registered with MainThread.`,
		);
		this._debugAdapterFactories.set(debugType, { factory, handle });
		// TODO (Full Implementation): RPC to `this.#mainThreadDebugProxy?.$registerDebugAdapterDescriptorFactory(...)`.
		return toDisposable(() => {
			this._logDebug(
				`Disposing stub registration for DebugAdapterDescriptorFactory Handle=${handle}, Type='${debugType}'.`,
			);
			this._debugAdapterFactories.delete(debugType); // Simplistic
			// TODO: RPC to `$unregisterDebugAdapterDescriptorFactory(handle)`.
		});
	}

	public registerDebugAdapterTrackerFactory(
		debugType: string,
		_factory: import("vscode").DebugAdapterTrackerFactory,
	): IDisposable {
		this._logWarnOnce(
			`API STUB: vscode.debug.registerDebugAdapterTrackerFactory called. Type='${debugType}'. This is a No-Operation.`,
		);
		return Disposable.None;
	}

	public async addBreakpoints(
		breakpointsToAdd: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.addBreakpoints called. Count=${breakpointsToAdd.length}. NOP.`,
		);
		// TODO (Full Implementation)
		return Promise.resolve();
	}

	public async removeBreakpoints(
		breakpointsToRemove: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.removeBreakpoints called. Count=${breakpointsToRemove.length}. NOP.`,
		);
		// TODO (Full Implementation)
		return Promise.resolve();
	}

	public asDebugSourceUri(
		source: DebugProtocolSource,
		session?: DebugSession,
	): VscodeUri {
		const sessionPart = session ? ` (session: ${session.id})` : "";
		const sourcePath =
			source.path || `ref:${source.sourceReference || "unknown"}`; // Ensure sourceReference is handled
		this._logWarnOnce(
			`API STUB: vscode.debug.asDebugSourceUri called. SourcePath='${sourcePath}'${sessionPart}. Returning dummy 'debug-source-stub:' URI.`,
		);
		return VscodeUri.parse(
			`debug-source-stub:${encodeURIComponent(sourcePath)}?session=${session?.id || "none"}`,
		);
	}

	public async getDebugProtocolBreakpoint(
		breakpoint: Breakpoint,
		session?: DebugSession,
	): Promise<DebugProtocolBreakpoint | undefined> {
		const bpId = (breakpoint as any).id || "unknown_bp_id"; // `id` is not on public vscode.Breakpoint
		this._logWarnOnce(
			`API STUB: vscode.debug.getDebugProtocolBreakpoint called for BreakpointID='${bpId}', SessionID='${session?.id || "none"}'. Returning undefined.`,
		);
		// TODO (Full Implementation)
		return Promise.resolve(undefined);
	}

	// --- RPC Callbacks from MainThread (VscodeExtHostDebugServiceShape) ---
	// These are stubs for methods that MainThreadDebugService would call on this ExtHost service.
	public $acceptDebugSessionStarted(sessionDto: RpcDebugSessionDto): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionStarted received. SessionID='${sessionDto.id}', Type='${sessionDto.type}', Name='${sessionDto.name}'.`,
		);
		// TODO (Full Implementation): Create StubDebugSessionImpl, update activeDebugSession, fire events.
		// const workspaceFolder = sessionDto.workspaceFolderUri ? this._reviveApiArgument<VscodeWorkspaceFolder>(sessionDto.workspaceFolderUri) : undefined;
		// const parentSession = sessionDto.parentSessionID ? this._findSessionById(sessionDto.parentSessionID) : undefined;
		// const revivedConfig = this._reviveRpcDebugConfiguration(sessionDto.configuration);
		// const session = new StubDebugSessionImpl(sessionDto.id, sessionDto.type, sessionDto.name, workspaceFolder, revivedConfig, parentSession, this._logService);
		// this.activeDebugSession = session;
		// this._onDidStartDebugSessionEmitter.fire(session);
		// this._onDidChangeActiveDebugSessionEmitter.fire(session);
	}

	public $acceptDebugSessionTerminated(sessionDto: RpcDebugSessionDto): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionTerminated received. SessionID='${sessionDto.id}'.`,
		);
		// TODO (Full Implementation): Find session by ID, update activeDebugSession if needed, fire events.
		// if (this.activeDebugSession && this.activeDebugSession.id === sessionDto.id) {
		//     this.activeDebugSession = undefined;
		//     this._onDidTerminateDebugSessionEmitter.fire(this.activeDebugSession); // Should fire the old session
		//     this._onDidChangeActiveDebugSessionEmitter.fire(undefined);
		// }
	}

	public $acceptDebugSessionNameChanged(
		_sessionDto: RpcDebugSessionDto,
		_name: string,
	): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionNameChanged received for session '${_sessionDto.id}' to name '${_name}'.`,
		);
		// TODO (Full Implementation)
	}

	public $acceptDebugSessionCustomEvent(event: any): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionCustomEvent received. Event type: ${event?.event}, Session ID: ${event?.session?.id}`,
		);
		// TODO (Full Implementation): Revive event DTO, find session, fire `_onDidReceiveDebugSessionCustomEventEmitter`.
		// this._onDidReceiveDebugSessionCustomEventEmitter.fire(revivedEvent);
	}

	public $acceptBreakpointsDelta(delta: {
		added?: RpcBreakpointDto[];
		removed?: string[];
		changed?: RpcBreakpointDto[];
	}): void {
		this._logInfo(
			`RPC STUB: $acceptBreakpointsDelta received. Added: ${delta.added?.length ?? 0}, Removed: ${delta.removed?.length ?? 0}, Changed: ${delta.changed?.length ?? 0}.`,
		);
		// TODO (Full Implementation): Update local `this.breakpoints` array and fire `_onDidChangeBreakpointsEmitter`.
		// Needs DTO to API type conversion for Breakpoint.
	}

	// --- RPC Stubs for Provider Invocation by MainThread ---
	public async $provideDebugConfigurations(
		_handle: number,
		_folderUriDto?: UriComponents,
		_tokenDto?: any,
	): Promise<DebugConfiguration[]> {
		this._logWarn(
			`RPC STUB: $provideDebugConfigurations called for Handle=${_handle}. Returning empty array.`,
		);
		return [];
	}
	public async $resolveDebugConfiguration(
		_handle: number,
		_folderUriDto?: UriComponents,
		_configDto?: RpcDebugConfiguration,
		_tokenDto?: any,
	): Promise<DebugConfiguration | null | undefined> {
		this._logWarn(
			`RPC STUB: $resolveDebugConfiguration called for Handle=${_handle}. Returning null.`,
		);
		return null;
	}
	public async $resolveDebugConfigurationWithSubstitutedVariables(
		_handle: number,
		_folderUriDto?: UriComponents,
		_configDto?: RpcDebugConfiguration,
		_tokenDto?: any,
	): Promise<DebugConfiguration | null | undefined> {
		this._logWarn(
			`RPC STUB: $resolveDebugConfigurationWithSubstitutedVariables called for Handle=${_handle}. Returning null.`,
		);
		return null;
	}
	public async $provideDebugAdapterDescriptor(
		_handle: number,
		_sessionDto: RpcDebugSessionDto,
	): Promise<any /* DebugAdapterDescriptor DTO */> {
		this._logWarn(
			`RPC STUB: $provideDebugAdapterDescriptor called for Handle=${_handle}. Returning undefined.`,
		);
		return undefined;
	}
	public async $runInTerminal(
		_args: extHostProtocol.IRunInTerminalRequestDto,
		_tokenDto?: any,
	): Promise<number | undefined> {
		this._logWarn(`RPC STUB: $runInTerminal called. Returning undefined.`);
		return undefined;
	}
	public async $startDebugging(
		_folderUriDto: UriComponents | undefined,
		_nameOrConfiguration: string | DebugConfiguration,
		_options: RpcDebugSessionOptionsDto,
	): Promise<boolean> {
		this._logWarn(
			`RPC STUB: $startDebugging called by MainThread. Returning false.`,
		);
		return false;
	}

	public override dispose(): void {
		super.dispose(); // BaseCocoonShim handles _instanceDisposables which includes emitters
		this._debugConfigProviders.clear();
		this._debugAdapterFactories.clear();
		this._logInfo("Disposed.");
	}
}
