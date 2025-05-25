// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/104_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): b00233e89ab8c3e7a37fffde206a3ba2efd64b3d140388d4d95f53be55ae0ec9
// Extracted to File: Backup/TSFMSC/Code/debug-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:56.996Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE debug-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Debug API Shim (shims/debug-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `vscode.debug` API namespace.
 * For Cocoon's MVP, most debugging functionalities are not implemented and will
 * return default values, NOP disposables, or throw "Not Implemented" errors.
 *--------------------------------------------------------------------------------------------*/

import { Emitter as VscodeEmitter, Event as VscodeEvent } from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the debug namespace
import {
    DebugConfigurationProviderTriggerKind, // Enum
    // Interfaces for providers and sessions
    type DebugAdapterDescriptor,
    type DebugAdapterDescriptorFactory,
    type DebugAdapterExecutable,
    type DebugAdapterInlineImplementation,
    type DebugAdapterNamedPipeServer,
    type DebugAdapterServer,
    type DebugConfiguration,
    type DebugConfigurationProvider,
    type DebugConsole,
    type DebugConsoleMode as VscodeDebugConsoleMode, // Already exported from vscode.ts
    type DebugSession,
    type DebugSessionCustomEvent,
    type DebugSessionOptions,
    type WorkspaceFolder as VscodeWorkspaceFolder, // For startDebugging scope
    // Breakpoint types (can be complex if fully shimmed)
    type Breakpoint, // Keep for type an
    type SourceBreakpoint,
    type FunctionBreakpoint,
    type DataBreakpoint,
    type InstructionBreakpoint,
    type DebugAdapterTracker, // For registerDebugAdapterTrackerFactory
    type DebugAdapterTrackerFactory, // For registerDebugAdapterTrackerFactory
    type BreakpointsChangeEvent, // For onDidChangeBreakpoints
} from "vscode";

import {
    BaseCocoonShim,
    refineError,
    type IExtHostRpcService, // For potential future RPC
    type ILogService,
    type ProxyIdentifier,
} from "./_baseShim";
// import { MainContext, ExtHostContext } from "vs/workbench/api/common/extHost.protocol"; // If RPCing

// --- Type Definitions ---

// If we were to proxy to MainThreadDebugService:
// interface MainThreadDebugServiceShape {
//     $startDebugging(folderUriComponents: any | undefined, nameOrConfiguration: string | DebugConfiguration, options?: DebugSessionOptions): Promise<boolean>;
//     $stopDebugging(sessionId?: string): Promise<void>;
//     $customDebugAdapterRequest(sessionId: string, command: string, args?: any): Promise<any>;
//     // ... other RPC methods for breakpoints, configurations, etc.
// }

// Interface for the service this shim provides (matches vscode.debug)
export interface IExtHostDebugServiceShape {
    readonly _serviceBrand: undefined; // For DI
    readonly activeDebugSession: DebugSession | undefined;
    readonly activeDebugConsole: DebugConsole;
    readonly breakpoints: readonly Breakpoint[];
    readonly onDidStartDebugSession: VscodeEvent<DebugSession>;
    readonly onDidTerminateDebugSession: VscodeEvent<DebugSession>;
    readonly onDidChangeActiveDebugSession: VscodeEvent<DebugSession | undefined>;
    readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent>;
    readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent>;

    startDebugging(
        folder: VscodeWorkspaceFolder | undefined,
        nameOrConfiguration: string | DebugConfiguration,
        options?: DebugSessionOptions | undefined
    ): Promise<boolean>;
    stopDebugging(session?: DebugSession): Promise<void>;
    registerDebugConfigurationProvider(
        debugType: string,
        provider: DebugConfigurationProvider,
        triggerKind?: DebugConfigurationProviderTriggerKind
    ): IDisposable;
    registerDebugAdapterDescriptorFactory(debugType: string, factory: DebugAdapterDescriptorFactory): IDisposable;
    registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): IDisposable;
    addBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void>;
    removeBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void>;
    asDebugSourceUri(source: import("vscode").DebugProtocolSource, session?: DebugSession): import("vscode").Uri;
    getDebugProtocolBreakpoint(breakpoint: Breakpoint, session?: DebugSession): Promise<import("vscode").DebugProtocolBreakpoint | undefined>;

    // TODO: Add other vscode.debug methods like customDebugAdapterRequest, saveState, etc.
}

export class ShimExtHostDebugService extends BaseCocoonShim implements IExtHostDebugServiceShape {
    public readonly _serviceBrand: undefined;
    // #mainThreadDebugProxy: MainThreadDebugServiceShape | null = null;

    // --- Stubbed Properties ---
    public activeDebugSession: DebugSession | undefined = undefined;
    public readonly activeDebugConsole: DebugConsole;
    public breakpoints: readonly Breakpoint[] = [];

    // --- Stubbed Event Emitters ---
    private readonly _onDidStartDebugSessionEmitter = new VscodeEmitter<DebugSession>();
    public readonly onDidStartDebugSession: VscodeEvent<DebugSession> = this._onDidStartDebugSessionEmitter.event;

    private readonly _onDidTerminateDebugSessionEmitter = new VscodeEmitter<DebugSession>();
    public readonly onDidTerminateDebugSession: VscodeEvent<DebugSession> = this._onDidTerminateDebugSessionEmitter.event;

    private readonly _onDidChangeActiveDebugSessionEmitter = new VscodeEmitter<DebugSession | undefined>();
    public readonly onDidChangeActiveDebugSession: VscodeEvent<DebugSession | undefined> = this._onDidChangeActiveDebugSessionEmitter.event;

    private readonly _onDidReceiveDebugSessionCustomEventEmitter = new VscodeEmitter<DebugSessionCustomEvent>();
    public readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent> = this._onDidReceiveDebugSessionCustomEventEmitter.event;

    private readonly _onDidChangeBreakpointsEmitter = new VscodeEmitter<BreakpointsChangeEvent>();
    public readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent> = this._onDidChangeBreakpointsEmitter.event;


    constructor(
        rpcService: IExtHostRpcService | undefined,
        logService: ILogService | undefined
    ) {
        super("ExtHostDebugService", rpcService, logService);
        this._log("Initialized (STUBBED).");

        // if (this._rpcService) {
        //     this.#mainThreadDebugProxy = this._getProxy(
        //         MainContext.MainThreadDebugService as ProxyIdentifier<MainThreadDebugServiceShape>
        //     );
        // }
        // if (!this.#mainThreadDebugProxy) {
        //     this._logWarn("MainThreadDebugService proxy NOT available. Debugging features will be non-functional.");
        // }

        // Stub for activeDebugConsole
        this.activeDebugConsole = Object.freeze({
            append: (value: string) => this._logWarnOnce(`activeDebugConsole.append STUB: "${value.substring(0,50)}..."`),
            appendLine: (value: string) => this._logWarnOnce(`activeDebugConsole.appendLine STUB: "${value.substring(0,50)}..."`),
        });
    }

    public async startDebugging(
        folder: VscodeWorkspaceFolder | undefined,
        nameOrConfiguration: string | DebugConfiguration,
        options?: DebugSessionOptions | undefined
    ): Promise<boolean> {
        const folderUri = folder ? folder.uri.toString() : "undefined";
        const configName = typeof nameOrConfiguration === 'string' ? nameOrConfiguration : nameOrConfiguration.name;
        this._logWarn(`vscode.debug.startDebugging STUB: folder='${folderUri}', config='${configName}', options=${JSON.stringify(options)}`);
        // if (!this.#mainThreadDebugProxy) {
        //     this._logError("Cannot start debugging: MainThreadDebugService proxy unavailable.");
        //     return false;
        // }
        // try {
        //     const folderUriDto = folder ? this._convertApiArgToInternal(folder.uri) : undefined;
        //     return await this.#mainThreadDebugProxy.$startDebugging(folderUriDto, nameOrConfiguration, options);
        // } catch (e: any) {
        //     this._logError("startDebugging RPC failed:", refineError(e, this._logService));
        //     return false;
        // }
        return Promise.resolve(false); // Simulate failure or no debugger attached
    }

    public async stopDebugging(session?: DebugSession): Promise<void> {
        this._logWarn(`vscode.debug.stopDebugging STUB: session_id='${session?.id}'`);
        // if (!this.#mainThreadDebugProxy) {
        //     this._logError("Cannot stop debugging: MainThreadDebugService proxy unavailable.");
        //     return;
        // }
        // try {
        //     await this.#mainThreadDebugProxy.$stopDebugging(session?.id);
        // } catch (e: any) {
        //     this._logError("stopDebugging RPC failed:", refineError(e, this._logService));
        // }
        return Promise.resolve();
    }

    public registerDebugConfigurationProvider(
        debugType: string,
        provider: DebugConfigurationProvider,
        triggerKind?: DebugConfigurationProviderTriggerKind
    ): IDisposable {
        this._logWarn(`vscode.debug.registerDebugConfigurationProvider STUB: type='${debugType}', trigger=${triggerKind !== undefined ? DebugConfigurationProviderTriggerKind[triggerKind] : 'undefined'}`);
        // TODO: Store provider, call its methods, and proxy to MainThreadDebugService.$registerDebugConfigurationProvider
        return Disposable.None;
    }

    public registerDebugAdapterDescriptorFactory(debugType: string, factory: DebugAdapterDescriptorFactory): IDisposable {
        this._logWarn(`vscode.debug.registerDebugAdapterDescriptorFactory STUB: type='${debugType}'`);
        // TODO: Store factory, call its methods, and proxy to MainThreadDebugService.$registerDebugAdapterDescriptorFactory
        return Disposable.None;
    }

    public registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): IDisposable {
        this._logWarn(`vscode.debug.registerDebugAdapterTrackerFactory STUB: type='${debugType}'`);
        return Disposable.None;
    }


    public addBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void> {
        this._logWarn(`vscode.debug.addBreakpoints STUB: count=${breakpoints.length}`);
        return Promise.resolve();
    }
    public removeBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void> {
        this._logWarn(`vscode.debug.removeBreakpoints STUB: count=${breakpoints.length}`);
        return Promise.resolve();
    }

    public asDebugSourceUri(source: import("vscode").DebugProtocolSource, session?: DebugSession): import("vscode").Uri {
        this._logWarn(`vscode.debug.asDebugSourceUri STUB: source name='${source.name}'`);
        // This is a complex conversion, return a dummy URI for stub.
        return import("vscode").Uri.parse(`debug-source-stub:${source.name || 'unknown_source'}`);
    }

    public async getDebugProtocolBreakpoint(breakpoint: Breakpoint, session?: DebugSession): Promise<import("vscode").DebugProtocolBreakpoint | undefined> {
        this._logWarn(`vscode.debug.getDebugProtocolBreakpoint STUB for breakpoint ID (if any): ${(breakpoint as any).id}`);
        return Promise.resolve(undefined);
    }


    // --- Other stubbed methods from vscode.debug ---
    // public customDebugAdapterRequest(sessionId: string, command: string, args?: any): Promise<any> {
    //     this._logWarn(`vscode.debug.customDebugAdapterRequest STUB: session='${sessionId}', command='${command}'`);
    //     return Promise.resolve(undefined);
    // }

    public dispose(): void {
        super.dispose();
        this._onDidStartDebugSessionEmitter.dispose();
        this._onDidTerminateDebugSessionEmitter.dispose();
        this._onDidChangeActiveDebugSessionEmitter.dispose();
        this._onDidReceiveDebugSessionCustomEventEmitter.dispose();
        this._onDidChangeBreakpointsEmitter.dispose();
        this._log("Disposed.");
    }
}
--- END OF FILE debug-shim.ts ---
// --- APPENDED_CONTENT_BELOW ---
// Block SHA256: 91b480c5e4e5453879722fac3da01f4391797eb0e54abb8696a4a76adb4e0c31
// Timestamp: 2025-05-25T14:02:57.087Z
// Source Markdown File (Name): 162_MODEL.md
// Source Markdown File (Path): Backup/TSFMSC/Document/162_MODEL.md
// Source Block Index (Overall): 1
// Original Fence Info String: (empty)
// Appended to File: debug-shim.ts (Full path when appended: Backup/TSFMSC/Code/debug-shim.ts)
// ---
--- START OF FILE debug-shim.ts ---

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
 * to compile, but calls to most methods will result in warnings, NOPs (No Operations),
 * default/failure return values, or throw "Not Implemented" errors for critical actions
 * that cannot be meaningfully stubbed.
 *
 * Responsibilities (as a stub):
 * - Implementing the `vscode.debug` API interface shape.
 * - Providing NOP or default-returning stubs for all `vscode.debug` methods and properties.
 * - Logging warnings when unimplemented debugging methods are called.
 * - Exposing NOP event emitters for debug-related lifecycle events.
 *
 * Key Interactions:
 * - An instance is made available as `vscode.debug` via the API factory in `index.ts`.
 * - In a full implementation, it would interact heavily with a `MainThreadDebugService`
 *   on Mountain via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { Emitter as VscodeEmitter, Event as VscodeEvent } from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";

// Import vscode API types for the debug namespace
import {
    DebugConfigurationProviderTriggerKind, // Enum from vscode API
    Uri as VscodeUri, // For asDebugSourceUri return
    // Interfaces for providers and sessions that define the API surface
    type Breakpoint, // Base type for various breakpoint kinds
    type BreakpointsChangeEvent,
    type DebugAdapterDescriptor,
    type DebugAdapterDescriptorFactory,
    type DebugAdapterExecutable,       // Example of DebugAdapterDescriptor content
    type DebugAdapterInlineImplementation, // Example of DebugAdapterDescriptor content
    type DebugAdapterNamedPipeServer,  // Example of DebugAdapterDescriptor content
    type DebugAdapterServer,           // Example of DebugAdapterDescriptor content
    type DebugAdapterTrackerFactory,
    type DebugConfiguration,
    type DebugConfigurationProvider,
    type DebugConsole,
    // type DebugConsoleMode, // Already available via direct export from vscode.ts
    type DebugSession,
    type DebugSessionCustomEvent,
    type DebugSessionOptions,
    type DebugProtocolSource,          // For asDebugSourceUri parameter
    type DebugProtocolBreakpoint,      // For getDebugProtocolBreakpoint return
    type WorkspaceFolder as VscodeWorkspaceFolder, // For startDebugging scope parameter
} from "vscode"; // Assuming path to the API type definitions

import {
	BaseCocoonShim,
	// refineErrorForShim, // Not used if RPC calls are not made
	type IRpcProtocolServiceAdapter,
	type ILogServiceForShim,
	// type ProxyIdentifier, // Uncomment if RPC is used
} from "./_baseShim";
// import { MainContext, ExtHostContext } from "vs/workbench/api/common/extHost.protocol"; // If RPCing

// --- Type Definitions ---

/**
 * Placeholder for the RPC shape of `MainThreadDebugService`.
 */
// interface MainThreadDebugServiceShape {
//     $startDebugging(folderUriComponents: any | undefined, nameOrConfiguration: string | DebugConfiguration, options?: DebugSessionOptions): Promise<boolean>;
//     $stopDebugging(sessionId?: string): Promise<void>;
//     $customDebugAdapterRequest(sessionId: string, command: string, args?: any): Promise<any>;
//     // ... other RPC methods for breakpoints, configurations, adapter factories, etc.
// }

/**
 * Defines the service interface for `vscode.debug` that this shim implements for DI.
 * Aligns with the public `vscode.debug` API surface.
 */
export interface IExtHostDebugServiceShape {
	readonly _serviceBrand: undefined; // For DI registration
	readonly activeDebugSession: DebugSession | undefined;
	readonly activeDebugConsole: DebugConsole;
	readonly breakpoints: readonly Breakpoint[];
	readonly onDidStartDebugSession: VscodeEvent<DebugSession>;
	readonly onDidTerminateDebugSession: VscodeEvent<DebugSession>;
	readonly onDidChangeActiveDebugSession: VscodeEvent<DebugSession | undefined>;
	readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent>;
	readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent>;

	startDebugging(folder: VscodeWorkspaceFolder | undefined, nameOrConfiguration: string | DebugConfiguration, options?: DebugSessionOptions | undefined): Promise<boolean>;
	stopDebugging(session?: DebugSession): Promise<void>;
	registerDebugConfigurationProvider(debugType: string, provider: DebugConfigurationProvider, triggerKind?: DebugConfigurationProviderTriggerKind): IDisposable;
	registerDebugAdapterDescriptorFactory(debugType: string, factory: DebugAdapterDescriptorFactory): IDisposable;
    registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): IDisposable;
	addBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void>;
	removeBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void>;
    asDebugSourceUri(source: DebugProtocolSource, session?: DebugSession): VscodeUri;
    getDebugProtocolBreakpoint(breakpoint: Breakpoint, session?: DebugSession): Promise<DebugProtocolBreakpoint | undefined>;
	// TODO: Add stubs for other vscode.debug methods as needed:
	// customDebugAdapterRequest, saveState, get mahdollinenState, readMemory, writeMemory, etc.
}

/**
 * Cocoon's stub implementation of the `vscode.debug` API.
 * Most methods are NOPs or return default/failure values in this MVP version.
 */
export class ShimExtHostDebugService extends BaseCocoonShim implements IExtHostDebugServiceShape {
	public readonly _serviceBrand: undefined;
	// #mainThreadDebugProxy: MainThreadDebugServiceShape | null = null;

	// --- Stubbed Properties ---
	public activeDebugSession: DebugSession | undefined = undefined;
	public readonly activeDebugConsole: DebugConsole;
	public breakpoints: readonly Breakpoint[] = []; // Should be Breakpoint[]

	// --- Stubbed Event Emitters ---
	private readonly _onDidStartDebugSessionEmitter = new VscodeEmitter<DebugSession>();
	public readonly onDidStartDebugSession: VscodeEvent<DebugSession> = this._onDidStartDebugSessionEmitter.event;

	private readonly _onDidTerminateDebugSessionEmitter = new VscodeEmitter<DebugSession>();
	public readonly onDidTerminateDebugSession: VscodeEvent<DebugSession> = this._onDidTerminateDebugSessionEmitter.event;

	private readonly _onDidChangeActiveDebugSessionEmitter = new VscodeEmitter<DebugSession | undefined>();
	public readonly onDidChangeActiveDebugSession: VscodeEvent<DebugSession | undefined> = this._onDidChangeActiveDebugSessionEmitter.event;

	private readonly _onDidReceiveDebugSessionCustomEventEmitter = new VscodeEmitter<DebugSessionCustomEvent>();
	public readonly onDidReceiveDebugSessionCustomEvent: VscodeEvent<DebugSessionCustomEvent> = this._onDidReceiveDebugSessionCustomEventEmitter.event;

    private readonly _onDidChangeBreakpointsEmitter = new VscodeEmitter<BreakpointsChangeEvent>();
    public readonly onDidChangeBreakpoints: VscodeEvent<BreakpointsChangeEvent> = this._onDidChangeBreakpointsEmitter.event;

	/**
	 * Creates an instance of ShimExtHostDebugService.
	 * @param rpcService The RPC service adapter (passed to base, currently unused by this stub).
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDebugService", rpcService, logService);
		this._log("Initialized (STUBBED implementation).");

		// if (this._rpcService) {
		//     this.#mainThreadDebugProxy = this._getProxy(
		//         MainContext.MainThreadDebugService as ProxyIdentifier<MainThreadDebugServiceShape>
		//     );
		// }
		// if (!this.#mainThreadDebugProxy) {
		//     this._logWarn("MainThreadDebugService proxy NOT available. Debugging features will be non-functional.");
		// }

		// Stub for activeDebugConsole
		this.activeDebugConsole = Object.freeze({
			append: (value: string) => this._logWarnOnce(`activeDebugConsole.append STUB: "${String(value).substring(0, 50)}..."`),
			appendLine: (value: string) => this._logWarnOnce(`activeDebugConsole.appendLine STUB: "${String(value).substring(0, 50)}..."`),
		});
	}

    /**
     * This shim, in its stubbed form, does not require RPC.
     */
    protected override _requiresRpc(): boolean {
        return false;
    }

	public async startDebugging(
		folder: VscodeWorkspaceFolder | undefined,
		nameOrConfiguration: string | DebugConfiguration,
		options?: DebugSessionOptions | undefined,
	): Promise<boolean> {
		const folderUri = folder ? folder.uri.toString() : "undefined";
		const configName = typeof nameOrConfiguration === 'string' ? nameOrConfiguration : nameOrConfiguration.name;
		this._logWarn(`vscode.debug.startDebugging STUB: folder='${folderUri}', config='${configName}', options=${options ? JSON.stringify(options) : 'undefined'}. Returning false.`);
		// In a real implementation:
		// if (!this.#mainThreadDebugProxy) { /* ... handle error ... */ return false; }
		// const folderUriDto = folder ? this._convertApiArgToInternal(folder.uri) : undefined;
		// return await this.#mainThreadDebugProxy.$startDebugging(folderUriDto, nameOrConfiguration, options);
		return Promise.resolve(false); // Simulate failure or no debugger available/attached.
	}

	public async stopDebugging(session?: DebugSession): Promise<void> {
		this._logWarn(`vscode.debug.stopDebugging STUB: session_id='${session?.id ?? 'undefined'}'. NOP.`);
		// In a real implementation:
		// if (!this.#mainThreadDebugProxy) { /* ... handle error ... */ return; }
		// await this.#mainThreadDebugProxy.$stopDebugging(session?.id);
		return Promise.resolve();
	}

	public registerDebugConfigurationProvider(
		debugType: string,
		provider: DebugConfigurationProvider, // Keep type for API compliance
		triggerKind?: DebugConfigurationProviderTriggerKind,
	): IDisposable {
		const triggerKindStr = triggerKind !== undefined ? DebugConfigurationProviderTriggerKind[triggerKind] : 'undefined';
		this._logWarn(`vscode.debug.registerDebugConfigurationProvider STUB: type='${debugType}', triggerKind=${triggerKindStr}. Returning NOP disposable.`);
		// TODO: In a real implementation, store the provider and register with MainThread.
		return Disposable.None;
	}

	public registerDebugAdapterDescriptorFactory(debugType: string, factory: DebugAdapterDescriptorFactory): IDisposable {
		this._logWarn(`vscode.debug.registerDebugAdapterDescriptorFactory STUB: type='${debugType}'. Returning NOP disposable.`);
		// TODO: In a real implementation, store the factory and register with MainThread.
		return Disposable.None;
	}

    public registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): IDisposable {
        this._logWarn(`vscode.debug.registerDebugAdapterTrackerFactory STUB: type='${debugType}'. Returning NOP disposable.`);
        return Disposable.None;
    }

	public async addBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void> {
		this._logWarn(`vscode.debug.addBreakpoints STUB: count=${breakpoints.length}. NOP.`);
		return Promise.resolve();
	}

	public async removeBreakpoints(breakpoints: readonly Breakpoint[]): Promise<void> {
		this._logWarn(`vscode.debug.removeBreakpoints STUB: count=${breakpoints.length}. NOP.`);
		return Promise.resolve();
	}

    public asDebugSourceUri(source: DebugProtocolSource, session?: DebugSession): VscodeUri {
        const sessionPart = session ? ` (session: ${session.id})` : '';
        this._logWarn(`vscode.debug.asDebugSourceUri STUB: source name='${source.name}'${sessionPart}. Returning dummy URI.`);
        // This is a complex conversion involving source maps and remote paths.
        // Return a dummy, uniquely identifiable URI for stub purposes.
        return VscodeUri.parse(`debug-source-stub:${source.path || source.name || 'unknown_source_' + Date.now()}`);
    }

    public async getDebugProtocolBreakpoint(breakpoint: Breakpoint, session?: DebugSession): Promise<DebugProtocolBreakpoint | undefined> {
        const bpId = (breakpoint as any).id || 'unknown'; // Breakpoint objects have an `id` property
        const sessionPart = session ? ` (session: ${session.id})` : '';
        this._logWarn(`vscode.debug.getDebugProtocolBreakpoint STUB for breakpoint ID '${bpId}'${sessionPart}. Returning undefined.`);
        return Promise.resolve(undefined);
    }

	// TODO: Add stubs for other methods on `vscode.debug` as they become relevant or are encountered:
	// - `customDebugAdapterRequest`
	// - `startProfiling`, `stopProfiling`
	// - `getDebugAdapterImplementationName`
	// - etc.

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._onDidStartDebugSessionEmitter.dispose();
		this._onDidTerminateDebugSessionEmitter.dispose();
		this._onDidChangeActiveDebugSessionEmitter.dispose();
		this._onDidReceiveDebugSessionCustomEventEmitter.dispose();
		this._onDidChangeBreakpointsEmitter.dispose();
		this._log("Disposed.");
	}
}
--- END OF FILE debug-shim.ts ---