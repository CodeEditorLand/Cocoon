/**
 * @module Debug
 * @description Defines the service for managing debugging sessions, breakpoints,
 * and debug-related providers. It implements the `IExtHostDebug` interface from
 * VS Code for high fidelity.
 */
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, type Breakpoint, type DebugConfiguration, type DebugSession, type DebugSessionCustomEvent, type DebugSessionOptions, type WorkspaceFolder, type Event, type DebugAdapterDescriptorFactory, type DebugConfigurationProvider, type DebugAdapterTrackerFactory, type DebugConsole } from "vscode";
import { IPCService } from "./IPC.js";
import { DebugProviderRegistrationProblem } from "./Debug/DebugProviderRegistrationProblem.js";
import { StartDebuggingProblem } from "./Debug/StartDebuggingProblem.js";
/**
 * @interface ProviderEntry
 * @description An internal type representing a registered debug provider.
 */
export interface ProviderEntry {
    readonly Type: string;
    readonly Provider: DebugConfigurationProvider | DebugAdapterDescriptorFactory | DebugAdapterTrackerFactory;
    readonly Extension: IExtensionDescription;
}
/**
 * @interface DebuggerState
 * @description An internal type representing the state managed by the Debug service.
 */
export interface DebuggerState {
    readonly ActiveDebugSession: DebugSession | undefined;
    readonly ActiveDebugConsole: DebugConsole;
    readonly Breakpoints: readonly Breakpoint[];
    readonly DebugConfigurationProviders: Map<number, ProviderEntry>;
    readonly DebugAdapterDescriptorFactories: Map<number, ProviderEntry>;
    readonly DebugAdapterTrackerFactories: Map<number, ProviderEntry>;
}
/**
 * @interface DebugInterface
 * @description The contract for the Debug service, mirroring `IExtHostDebug`.
 */
export interface DebugInterface {
    readonly activeDebugSession: DebugSession | undefined;
    readonly activeDebugConsole: DebugConsole;
    readonly breakpoints: readonly Breakpoint[];
    readonly onDidChangeActiveDebugSession: Event<DebugSession | undefined>;
    readonly onDidStartDebugSession: Event<DebugSession>;
    readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;
    readonly onDidTerminateDebugSession: Event<DebugSession>;
    readonly onDidChangeBreakpoints: Event<any>;
    readonly RegisterDebugConfigurationProvider: (type: string, provider: DebugConfigurationProvider, trigger: number, extension: IExtensionDescription) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
    readonly RegisterDebugAdapterDescriptorFactory: (type: string, factory: DebugAdapterDescriptorFactory, extension: IExtensionDescription) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
    readonly RegisterDebugAdapterTrackerFactory: (type: string, factory: DebugAdapterTrackerFactory, extension: IExtensionDescription) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
    readonly StartDebugging: (folder: WorkspaceFolder | undefined, nameOrConfig: string | DebugConfiguration, options?: DebugSessionOptions) => Effect.Effect<boolean, StartDebuggingProblem>;
    readonly StopDebugging: (session?: DebugSession) => Effect.Effect<void, Error>;
    readonly AddBreakpoints: (breakpoints: readonly Breakpoint[]) => Effect.Effect<void, never>;
    readonly RemoveBreakpoints: (breakpoints: readonly Breakpoint[]) => Effect.Effect<void, never>;
}
declare const DebugService_base: Effect.Service.Class<DebugInterface, "Service/Debug", {
    readonly effect: Effect.Effect<{
        readonly activeDebugSession: DebugSession | undefined;
        readonly activeDebugConsole: DebugConsole;
        readonly breakpoints: readonly Breakpoint[];
        onDidChangeActiveDebugSession: import("vs/workbench/workbench.web.main.internal.js").Event<DebugSession | undefined>;
        onDidStartDebugSession: import("vs/workbench/workbench.web.main.internal.js").Event<DebugSession>;
        onDidReceiveDebugSessionCustomEvent: import("vs/workbench/workbench.web.main.internal.js").Event<any>;
        onDidTerminateDebugSession: import("vs/workbench/workbench.web.main.internal.js").Event<DebugSession>;
        onDidChangeBreakpoints: import("vs/workbench/workbench.web.main.internal.js").Event<any>;
        RegisterDebugConfigurationProvider: (DebugType: any, Provider: any, _trigger: any, Extension: any) => Effect.Effect<Disposable, DebugProviderRegistrationProblem, never>;
        RegisterDebugAdapterDescriptorFactory: (DebugType: any, Factory: any, Extension: any) => Effect.Effect<Disposable, DebugProviderRegistrationProblem, never>;
        RegisterDebugAdapterTrackerFactory: (DebugType: any, Factory: any, Extension: any) => Effect.Effect<Disposable, DebugProviderRegistrationProblem, never>;
        StartDebugging: (Folder: any, NameOrConfiguration: any, Options: any) => Effect.Effect<boolean, StartDebuggingProblem, never>;
        StopDebugging: (Session: any) => Effect.Effect<void, Error, never>;
        AddBreakpoints: (_Breakpoints: any) => Effect.Effect<void, never, never>;
        RemoveBreakpoints: (_Breakpoints: any) => Effect.Effect<void, never, never>;
    }, never, IPCService>;
}>;
/**
 * @class DebugService
 * @description The `Effect.Service` for the Debug service.
 */
export declare class DebugService extends DebugService_base {
}
export {};
