/*
 * File: Cocoon/Source/Shim/Debug.ts
 * Responsibility: Provides a TypeScript shim implementation of the VS Code debug API namespace for the Cocoon sidecar, stubbing critical debugging functionality to enable extension compatibility while preparing for future RPC integration with the Mountain backend.
 * Modified: 2025-06-07 05:37:41 UTC
 * Dependency: vs/base/common/lifecycle, vs/base/common/uri
 * Export: IExtHostDebugServiceShapeApi, ShimExtHostDebugService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Debug API Shim
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
 * - Explicitly logging an error for `startDebugging` as it's a critical non-functional API.
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
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import { type UriComponents } from "vs/base/common/uri"; // For RPC DTOs
import {
	type IBreakpointDto as RpcBreakpointDto,
	type IDebugConfiguration as RpcDebugConfiguration,
	type IDebugSessionOptionsDto as RpcDebugSessionOptionsDto,
	type IRunInTerminalRequestDto as RpcRunInTerminalRequestDto,
	type ExtHostDebugServiceShape as VscodeExtHostDebugServiceShape, // RPC shape this service implements
} from "vs/workbench/api/common/extHost.protocol";
// Import vscode API types for the debug namespace
import {
	DebugConfigurationProviderTriggerKind,
	Uri as VscodeUri,
	type Breakpoint,
	type BreakpointsChangeEvent,
	type DebugAdapterDescriptorFactory,
	type DebugAdapterTrackerFactory,
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
	// refineErrorForShim, // For future RPC error handling
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // Not used if proxy is not obtained in stub
} from "./_baseShim";

// --- Type Definitions & Placeholders ---

// Placeholder for the DTO of vscode.DebugSession if sent over RPC
interface RpcDebugSessionDto {
	id: string;
	type: string;
	name: string;
	workspaceFolderUri?: UriComponents;
	configuration: RpcDebugConfiguration;
	parentSessionID?: string;
	compact?: boolean;
}

/** Defines the service interface for `vscode.debug` that this shim implements for DI. */
export interface IExtHostDebugServiceShapeApi
	extends VscodeExtHostDebugServiceShape {
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
		factory: DebugAdapterTrackerFactory,
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
		public name: string,
		public readonly workspaceFolder: VscodeWorkspaceFolder | undefined,
		public readonly configuration: DebugConfiguration,
		public readonly parentSession?: DebugSession,
		private _logService?: ILogServiceForShim,
	) {}

	customRequest(_command: string, _args?: any): Promise<any> {
		const errorMsg = `[StubDebugSession(${this.id})] STUB: customRequest('${_command}') called. Not implemented.`;
		this._logService?.warn(errorMsg);
		return Promise.reject(new Error(errorMsg));
	}

	getDebugProtocolBreakpoint(
		_breakpoint: Breakpoint,
	): Promise<DebugProtocolBreakpoint | undefined> {
		const errorMsg = `[StubDebugSession(${this.id})] STUB: getDebugProtocolBreakpoint called. Not implemented.`;
		this._logService?.warn(errorMsg);
		return Promise.resolve(undefined);
	}
}

/** Helper to create a NOP IDisposable */
const toDisposable = (fn: () => void): IDisposable => ({ dispose: fn });

/** Cocoon's stub implementation of the `vscode.debug` API. */
export class ShimExtHostDebugService
	extends BaseCocoonShim
	implements IExtHostDebugServiceShapeApi
{
	// Combined API and RPC shape
	public readonly _serviceBrand: undefined;

	public activeDebugSession: DebugSession | undefined = undefined;
	public readonly activeDebugConsole: DebugConsole;
	public breakpoints: readonly Breakpoint[] = [];

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

	private readonly _debugConfigProviders = new Map<
		string, // debugType
		{
			provider: DebugConfigurationProvider;
			trigger: DebugConfigurationProviderTriggerKind;
			handle: number;
		}
	>();
	private readonly _debugAdapterFactories = new Map<
		string, // debugType
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
		return false; // For MVP stub. Would be true for functional.
	}

	public async startDebugging(
		folder: VscodeWorkspaceFolder | undefined,
		nameOrConfiguration: string | DebugConfiguration,
		optionsOrParentSession?: DebugSessionOptions | DebugSession,
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
		);
		return Promise.resolve(false);
	}

	public async stopDebugging(session?: DebugSession): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.stopDebugging called. SessionID='${session?.id ?? "active (or undefined)"}'. NOP.`,
		);
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
		return toDisposable(() => {
			this._logDebug(
				`Disposing stub registration for DebugConfigurationProvider Handle=${handle}, Type='${debugType}'.`,
			);
			this._debugConfigProviders.delete(debugType);
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
		return toDisposable(() => {
			this._logDebug(
				`Disposing stub registration for DebugAdapterDescriptorFactory Handle=${handle}, Type='${debugType}'.`,
			);
			this._debugAdapterFactories.delete(debugType);
		});
	}

	public registerDebugAdapterTrackerFactory(
		debugType: string,
		_factory: DebugAdapterTrackerFactory,
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
		return Promise.resolve();
	}

	public async removeBreakpoints(
		breakpointsToRemove: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`API STUB: vscode.debug.removeBreakpoints called. Count=${breakpointsToRemove.length}. NOP.`,
		);
		return Promise.resolve();
	}

	public asDebugSourceUri(
		source: DebugProtocolSource,
		session?: DebugSession,
	): VscodeUri {
		const sessionPart = session ? ` (session: ${session.id})` : "";
		const sourcePath =
			source.path || `ref:${source.sourceReference ?? "unknown"}`;
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
		const bpId = (breakpoint as any).id || "unknown_bp_id";
		this._logWarnOnce(
			`API STUB: vscode.debug.getDebugProtocolBreakpoint called for BreakpointID='${bpId}', SessionID='${session?.id || "none"}'. Returning undefined.`,
		);
		return Promise.resolve(undefined);
	}

	// --- RPC Callbacks from MainThread (VscodeExtHostDebugServiceShape) ---
	public $acceptDebugSessionStarted(sessionDto: RpcDebugSessionDto): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionStarted received. SessionID='${sessionDto.id}', Type='${sessionDto.type}', Name='${sessionDto.name}'.`,
		);
		// In a full implementation:
		// const workspaceFolder = sessionDto.workspaceFolderUri ? this._reviveApiArgument<VscodeWorkspaceFolder>(sessionDto.workspaceFolderUri) : undefined;
		// const parentSession = sessionDto.parentSessionID ? /* find session by ID */ undefined : undefined;
		// const revivedConfig = /* revive RpcDebugConfiguration to DebugConfiguration */;
		// const session = new StubDebugSessionImpl(sessionDto.id, sessionDto.type, sessionDto.name, workspaceFolder, revivedConfig, parentSession, this._logService);
		// this.activeDebugSession = session;
		// this._onDidStartDebugSessionEmitter.fire(session);
		// this._onDidChangeActiveDebugSessionEmitter.fire(session);
	}

	public $acceptDebugSessionTerminated(sessionDto: RpcDebugSessionDto): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionTerminated received. SessionID='${sessionDto.id}'.`,
		);
		// if (this.activeDebugSession && this.activeDebugSession.id === sessionDto.id) {
		//     const terminatedSession = this.activeDebugSession;
		//     this.activeDebugSession = undefined;
		//     this._onDidTerminateDebugSessionEmitter.fire(terminatedSession);
		//     this._onDidChangeActiveDebugSessionEmitter.fire(undefined);
		// }
	}

	public $acceptDebugSessionNameChanged(
		sessionDto: RpcDebugSessionDto,
		name: string,
	): void {
		this._logInfo(
			`RPC STUB: $acceptDebugSessionNameChanged received for session '${sessionDto.id}' to name '${name}'.`,
		);
		// if (this.activeDebugSession && this.activeDebugSession.id === sessionDto.id) {
		//     (this.activeDebugSession as StubDebugSessionImpl).name = name; // If mutable
		// }
	}

	public $acceptDebugSessionCustomEvent(
		event: DebugSessionCustomEvent,
	): void {
		// Assuming event is already revived
		this._logInfo(
			`RPC STUB: $acceptDebugSessionCustomEvent received. Event type: ${event?.event}, Session ID: ${event?.session?.id}`,
		);
		// this._onDidReceiveDebugSessionCustomEventEmitter.fire(event);
	}

	public $acceptBreakpointsDelta(delta: {
		added?: RpcBreakpointDto[];
		removed?: string[]; // Array of breakpoint IDs
		changed?: RpcBreakpointDto[];
	}): void {
		this._logInfo(
			`RPC STUB: $acceptBreakpointsDelta received. Added: ${delta.added?.length ?? 0}, Removed: ${delta.removed?.length ?? 0}, Changed: ${delta.changed?.length ?? 0}.`,
		);
		// TODO (Full Implementation): Update local `this.breakpoints` array and fire `_onDidChangeBreakpointsEmitter`.
		// Needs DTO to API type conversion for Breakpoint.
	}

	public async $provideDebugConfigurations(
		handle: number,
		folderUriDto?: UriComponents,
		_tokenDto?: any,
	): Promise<RpcDebugConfiguration[]> {
		// Return type should be RpcDebugConfiguration[]
		const folderUri = folderUriDto
			? VscodeUri.revive(folderUriDto).toString()
			: "undefined";
		this._logWarn(
			`RPC STUB: $provideDebugConfigurations called for Handle=${handle}, Folder=${folderUri}. Returning empty array.`,
		);
		// const providerData = Array.from(this._debugConfigProviders.values()).find(p => p.handle === handle);
		// if (providerData?.provider.provideDebugConfigurations) { /* ... call provider ... convert to DTO ... */ }
		return [];
	}

	public async $resolveDebugConfiguration(
		handle: number,
		folderUriDto?: UriComponents,
		configDto?: RpcDebugConfiguration,
		_tokenDto?: any,
	): Promise<RpcDebugConfiguration | null | undefined> {
		// Return type should be RpcDebugConfiguration
		const folderUri = folderUriDto
			? VscodeUri.revive(folderUriDto).toString()
			: "undefined";
		this._logWarn(
			`RPC STUB: $resolveDebugConfiguration called for Handle=${handle}, Folder=${folderUri}. Returning null.`,
		);
		return null;
	}

	public async $resolveDebugConfigurationWithSubstitutedVariables(
		handle: number,
		folderUriDto?: UriComponents,
		configDto?: RpcDebugConfiguration,
		_tokenDto?: any,
	): Promise<RpcDebugConfiguration | null | undefined> {
		// Return type should be RpcDebugConfiguration
		const folderUri = folderUriDto
			? VscodeUri.revive(folderUriDto).toString()
			: "undefined";
		this._logWarn(
			`RPC STUB: $resolveDebugConfigurationWithSubstitutedVariables called for Handle=${handle}, Folder=${folderUri}. Returning null.`,
		);
		return null;
	}

	public async $provideDebugAdapterDescriptor(
		handle: number,
		sessionDto: RpcDebugSessionDto,
	): Promise<any /* DebugAdapterDescriptor DTO */> {
		this._logWarn(
			`RPC STUB: $provideDebugAdapterDescriptor called for Handle=${handle}, SessionID=${sessionDto.id}. Returning undefined.`,
		);
		return undefined;
	}

	public async $runInTerminal(
		_args: RpcRunInTerminalRequestDto,
		_tokenDto?: any,
	): Promise<number | undefined> {
		this._logWarn(`RPC STUB: $runInTerminal called. Returning undefined.`);
		return undefined;
	}

	// This is an ExtHost -> MainThread call usually, not MainThread -> ExtHost. Included for completeness of VscodeExtHostDebugServiceShape
	public async $startDASession(
		_options: RpcDebugSessionOptionsDto,
	): Promise<string /* session ID */> {
		this._logWarn(
			`RPC STUB: $startDASession called (unexpected direction for MainThread -> ExtHost). Returning dummy ID.`,
		);
		return "dummy-da-session-id-from-stub";
	}

	public override dispose(): void {
		super.dispose();
		this._debugConfigProviders.clear();
		this._debugAdapterFactories.clear();
		this._logInfo("Disposed.");
	}
}
