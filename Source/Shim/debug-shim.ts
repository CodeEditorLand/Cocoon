/*---------------------------------------------------------------------------------------------
 * Cocoon Debug API Shim (shims/debug-shim.ts)
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
 * - Exposing NOP event emitters for debug-related lifecycle events.
 *
 * Key Interactions:
 * - An instance is made available as `vscode.debug` via the API factory (e.g., in `index.ts`).
 * - In a full implementation, it would interact heavily with a `MainThreadDebugService`
 *   on the main thread (Mountain) via RPC.
 * - Uses `BaseCocoonShim` for common utilities like logging and RPC proxy acquisition.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the debug namespace
import {
	// Enum from vscode API
	DebugConfigurationProviderTriggerKind,
	// For asDebugSourceUri return type
	Uri as VscodeUri,
	// Interfaces for providers and sessions that define the API surface
	// Base type for various breakpoint kinds (SourceBreakpoint, FunctionBreakpoint, etc.)
	type Breakpoint,
	type BreakpointsChangeEvent,
	// Abstract type, specific implementations below
	// type DebugAdapterDescriptor,
	type DebugAdapterDescriptorFactory,
	// Example of DebugAdapterDescriptor content
	// type DebugAdapterExecutable,

	// Example of DebugAdapterDescriptor content
	// type DebugAdapterInlineImplementation,

	// Example of DebugAdapterDescriptor content
	// type DebugAdapterNamedPipeServer,

	// Example of DebugAdapterDescriptor content
	// type DebugAdapterServer,
	type DebugAdapterTrackerFactory,
	type DebugConfiguration,
	type DebugConfigurationProvider,
	type DebugConsole,
	// Return type for getDebugProtocolBreakpoint
	type DebugProtocolBreakpoint,
	// Parameter type for asDebugSourceUri
	type DebugProtocolSource,
	// This is an enum, usually imported directly if used
	// type DebugConsoleMode,
	type DebugSession,
	type DebugSessionCustomEvent,
	type DebugSessionOptions,
	// Parameter type for startDebugging
	type WorkspaceFolder as VscodeWorkspaceFolder,
} from "vscode";

// Assuming path to the API type definitions

import {
	BaseCocoonShim,
	// Specific logger type for shims
	type ILogServiceForShim,
	// Use if RPC calls are made and errors need refinement
	// refineErrorForShim,

	// For RPC communication
	type IRpcProtocolServiceAdapter,
	// Uncomment if RPC proxy is used
	// type ProxyIdentifier,
} from "./_baseShim";

// If RPCing
// import { MainContext, ExtHostContext } from "vs/workbench/api/common/extHost.protocol";

// --- Type Definitions ---

/**
 * Placeholder for the RPC shape of `MainThreadDebugService`.
 * This interface would define the methods callable on the main thread service.
 */
// interface MainThreadDebugServiceShape {

//     $startDebugging(folderUriComponents: any | undefined, nameOrConfiguration: string | DebugConfiguration, options?: DebugSessionOptions): Promise<boolean>;

//     $stopDebugging(sessionId?: string): Promise<void>;

//     $customDebugAdapterRequest(sessionId: string, command: string, args?: any): Promise<any>;

// Example, DTOs would be used
//     $addBreakpoints(breakpoints: DebugProtocolBreakpoint[]): Promise<DebugProtocolBreakpoint[]>;

//     $removeBreakpoints(breakpointIds: string[]): Promise<void>;

// ... other RPC methods for configurations, adapter factories, trackers, etc.
//
// }

/**
 * Defines the service interface for `vscode.debug` that this shim implements for DI.
 * This aligns with the public `vscode.debug` API surface that extensions consume.
 */
export interface IExtHostDebugServiceShape {
	// Standard mechanism for type-safe DI
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

	// TODO: Add stubs for other vscode.debug methods as needed by extensions:
	// customDebugAdapterRequest, saveState, readMemory, writeMemory, etc.
}

/**
 * Cocoon's stub implementation of the `vscode.debug` API.
 * Most methods are NOPs (No Operations) or return default/failure values in this
 * MVP (Minimum Viable Product) version, primarily to allow extensions to compile
 * and run without crashing, rather than providing full debugging functionality.
 */
export class ShimExtHostDebugService
	extends BaseCocoonShim
	implements IExtHostDebugServiceShape
{
	public readonly _serviceBrand: undefined;

	// RPC proxy instance
	// private _mainThreadDebugProxy: MainThreadDebugServiceShape | null = null;

	// --- Stubbed Properties ---
	public activeDebugSession: DebugSession | undefined = undefined;

	public readonly activeDebugConsole: DebugConsole;

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

	/**
	 * Creates an instance of ShimExtHostDebugService.
	 * @param rpcService The RPC service adapter (passed to base, currently unused by this stub for its primary functions).
	 * @param logService The logging service for shim-specific messages.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDebugService", rpcService, logService);

		this._log(
			"Initialized (STUBBED implementation). Debug functionality is minimal.",
		);

		// Example of RPC proxy initialization (currently commented out as it's a stub)
		// if (this._rpcService) {

		//     this._mainThreadDebugProxy = this._getProxy(
		//         MainContext.MainThreadDebugService as ProxyIdentifier<MainThreadDebugServiceShape>
		//     );

		// }

		// if (!this._mainThreadDebugProxy) {

		//     this._logWarn("MainThreadDebugService proxy NOT available. All debugging features will be non-functional.");

		// }

		// Stub for activeDebugConsole
		this.activeDebugConsole = Object.freeze({
			append: (value: string) =>
				this._logWarnOnce(
					`activeDebugConsole.append STUB: "${String(value).substring(0, 50)}..."`,
				),

			appendLine: (value: string) =>
				this._logWarnOnce(
					`activeDebugConsole.appendLine STUB: "${String(value).substring(0, 50)}..."`,
				),
		});
	}

	/**
	 * Indicates whether this shim requires RPC communication.
	 * For the current stub implementation, RPC is not strictly required as most operations are NOPs.
	 * A full implementation would return `true`.
	 */
	protected override _requiresRpc(): boolean {
		// Set to true if/when RPC calls to MainThreadDebugService are implemented.
		return false;
	}

	/** {@inheritDoc IExtHostDebugServiceShape.startDebugging} */
	public async startDebugging(
		folder: VscodeWorkspaceFolder | undefined,

		nameOrConfiguration: string | DebugConfiguration,

		options?: DebugSessionOptions | undefined,
	): Promise<boolean> {
		const folderUriString = folder ? folder.uri.toString() : "undefined";

		const configNameOrType =
			typeof nameOrConfiguration === "string"
				? nameOrConfiguration
				: nameOrConfiguration.name;

		const optionsString = options ? JSON.stringify(options) : "undefined";

		this._logWarn(
			`vscode.debug.startDebugging STUB: folder='${folderUriString}', config='${configNameOrType}', options=${optionsString}. Returning false.`,
		);

		// In a real implementation:
		// if (!this._mainThreadDebugProxy) {

		//     this._logError("Cannot start debugging: MainThreadDebugService proxy unavailable.");

		//     return false;

		// }

		// try {

		//     const folderUriDto = folder ? this._convertApiArgToInternal(folder.uri) : undefined;

		//     const success = await this._mainThreadDebugProxy.$startDebugging(folderUriDto, nameOrConfiguration, options);

		// If successful, MainThread would later call $acceptDebugSessionStarted, which updates activeDebugSession
		//
		// and fires onDidStartDebugSession/onDidChangeActiveDebugSession.
		//
		//     return success;

		// } catch (e: any) {

		//     this._logError("startDebugging RPC failed:", refineErrorForShim(e, this._logService, "startDebugging"));

		//     return false;

		// }

		// Simulate failure or no debugger available/attached.
		return Promise.resolve(false);
	}

	/** {@inheritDoc IExtHostDebugServiceShape.stopDebugging} */
	public async stopDebugging(session?: DebugSession): Promise<void> {
		this._logWarn(
			`vscode.debug.stopDebugging STUB: session_id='${session?.id ?? "active (or undefined)"}'. NOP.`,
		);

		// In a real implementation:
		// if (!this._mainThreadDebugProxy) { /* ... handle error ... */ return; }

		// try {

		//     await this._mainThreadDebugProxy.$stopDebugging(session?.id);

		// MainThread would later call $acceptDebugSessionTerminated.
		//
		// } catch (e: any) { /* ... handle error ... */ }

		return Promise.resolve();
	}

	/** {@inheritDoc IExtHostDebugServiceShape.registerDebugConfigurationProvider} */
	public registerDebugConfigurationProvider(
		debugType: string,

		// Provider argument kept for API compliance
		provider: DebugConfigurationProvider,

		triggerKind?: DebugConfigurationProviderTriggerKind,
	): IDisposable {
		const triggerKindString =
			triggerKind !== undefined
				? DebugConfigurationProviderTriggerKind[triggerKind]
				: "undefined";

		this._logWarn(
			`vscode.debug.registerDebugConfigurationProvider STUB: type='${debugType}', triggerKind=${triggerKindString}. Provider not registered. Returning NOP disposable.`,
		);

		// TODO: In a real implementation:
		// 1. Store the provider locally.
		// 2. Generate a handle.
		// 3. Call `this._mainThreadDebugProxy?.$registerDebugConfigurationProvider(handle, debugType, hasProvideMethod, hasResolveMethod, hasResolve2Method, triggerKind);`
		// 4. Return a Disposable that calls `$unregisterDebugConfigurationProvider(handle)`.
		// NOP disposable
		return Disposable.None;
	}

	/** {@inheritDoc IExtHostDebugServiceShape.registerDebugAdapterDescriptorFactory} */
	public registerDebugAdapterDescriptorFactory(
		debugType: string,

		factory: DebugAdapterDescriptorFactory,
	): IDisposable {
		this._logWarn(
			`vscode.debug.registerDebugAdapterDescriptorFactory STUB: type='${debugType}'. Factory not registered. Returning NOP disposable.`,
		);

		// TODO: In a real implementation, store the factory, handle its calls, and register with MainThread.
		return Disposable.None;
	}

	/** {@inheritDoc IExtHostDebugServiceShape.registerDebugAdapterTrackerFactory} */
	public registerDebugAdapterTrackerFactory(
		debugType: string,

		factory: DebugAdapterTrackerFactory,
	): IDisposable {
		this._logWarn(
			`vscode.debug.registerDebugAdapterTrackerFactory STUB: type='${debugType}'. Factory not registered. Returning NOP disposable.`,
		);

		// TODO: Similar to other factories, store and potentially notify MainThread.
		return Disposable.None;
	}

	/** {@inheritDoc IExtHostDebugServiceShape.addBreakpoints} */
	public async addBreakpoints(
		breakpointsToAdd: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`vscode.debug.addBreakpoints STUB: count=${breakpointsToAdd.length}. NOP.`,
		);

		// In a real implementation:
		// 1. Convert `Breakpoint[]` (API type) to `DebugProtocolBreakpoint[]` (DTOs).
		// 2. Call `this._mainThreadDebugProxy?.$addBreakpoints(dtos)`.
		// 3. MainThread would respond, and this service would update `this.breakpoints` and fire `onDidChangeBreakpoints`.
		return Promise.resolve();
	}

	/** {@inheritDoc IExtHostDebugServiceShape.removeBreakpoints} */
	public async removeBreakpoints(
		breakpointsToRemove: readonly Breakpoint[],
	): Promise<void> {
		this._logWarn(
			`vscode.debug.removeBreakpoints STUB: count=${breakpointsToRemove.length}. NOP.`,
		);

		// Similar to addBreakpoints, convert to IDs or DTOs and call MainThread.
		return Promise.resolve();
	}

	/** {@inheritDoc IExtHostDebugServiceShape.asDebugSourceUri} */
	public asDebugSourceUri(
		source: DebugProtocolSource,

		session?: DebugSession,
	): VscodeUri {
		const sessionPart = session ? ` (session: ${session.id})` : "";

		this._logWarn(
			`vscode.debug.asDebugSourceUri STUB: source name='${source.name}', path='${source.path}'${sessionPart}. Returning dummy URI.`,
		);

		// This is a complex conversion potentially involving source maps, adapter specific logic, and remote paths.
		// Return a dummy, uniquely identifiable URI for stub purposes.
		const sourceIdentifier =
			source.path ||
			source.sourceReference?.toString() ||
			source.name ||
			"unknown_source_" + Date.now();

		return VscodeUri.parse(
			`debug-source-stub:${encodeURIComponent(sourceIdentifier)}`,
		);
	}

	/** {@inheritDoc IExtHostDebugServiceShape.getDebugProtocolBreakpoint} */
	public async getDebugProtocolBreakpoint(
		breakpoint: Breakpoint,

		session?: DebugSession,
	): Promise<DebugProtocolBreakpoint | undefined> {
		// Breakpoint objects typically have an `id` property.
		const bpId = (breakpoint as any).id || "unknown_id";

		const sessionPart = session ? ` (session: ${session.id})` : "";

		this._logWarn(
			`vscode.debug.getDebugProtocolBreakpoint STUB for breakpoint ID '${bpId}'${sessionPart}. Returning undefined.`,
		);

		// TODO: Would involve RPC to MainThread to get the DAP representation for a given API Breakpoint.
		return Promise.resolve(undefined);
	}

	// TODO: Add stubs for other methods on `vscode.debug` as they become relevant or are encountered by extensions:
	// - `customDebugAdapterRequest(sessionId: string, command: string, args?: any): Promise<any>;`
	// - `startProfiling(sessionId?: string): Promise<void>;`
	// - `stopProfiling(sessionId?: string): Promise<void>;`
	// - `getDebugAdapterImplementationName(debugType: string): Promise<string | undefined>;`
	// - etc.

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this._onDidStartDebugSessionEmitter.dispose();

		this._onDidTerminateDebugSessionEmitter.dispose();

		this._onDidChangeActiveDebugSessionEmitter.dispose();

		this._onDidReceiveDebugSessionCustomEventEmitter.dispose();

		this._onDidChangeBreakpointsEmitter.dispose();

		this._log("Disposed.");
	}
}
