/**
 * @module Debug
 * @description Defines the service for managing debugging sessions, breakpoints,
 * and debug-related providers. It implements the `IExtHostDebug` interface from
 * VS Code for high fidelity.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import { Disposable, type Breakpoint, type DebugAdapterDescriptorFactory, type DebugAdapterTrackerFactory, type DebugConfiguration, type DebugConfigurationProvider, type DebugConsole, type DebugSession, type DebugSessionCustomEvent, type DebugSessionOptions, type Event, type WorkspaceFolder } from "vscode";
import { DebugProviderRegistrationProblem } from "./Debug/DebugProviderRegistrationProblem.js";
import { StartDebuggingProblem } from "./Debug/StartDebuggingProblem.js";
import { IPCService } from "./IPC.js";
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
 * @description The contract for the Debug service, mirroring `vscode.debug`.
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
    readonly registerDebugConfigurationProvider: (type: string, provider: DebugConfigurationProvider, trigger: number, extension: IExtensionDescription) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
    readonly registerDebugAdapterDescriptorFactory: (type: string, factory: DebugAdapterDescriptorFactory, extension: IExtensionDescription) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
    readonly registerDebugAdapterTrackerFactory: (type: string, factory: DebugAdapterTrackerFactory, extension: IExtensionDescription) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
    readonly startDebugging: (folder: WorkspaceFolder | undefined, nameOrConfig: string | DebugConfiguration, options?: DebugSessionOptions) => Effect.Effect<boolean, StartDebuggingProblem>;
    readonly stopDebugging: (session?: DebugSession) => Effect.Effect<void, Error>;
    readonly addBreakpoints: (breakpoints: readonly Breakpoint[]) => Effect.Effect<void, never>;
    readonly removeBreakpoints: (breakpoints: readonly Breakpoint[]) => Effect.Effect<void, never>;
}
declare const DebugService_base: Effect.Service.Class<DebugService, "Service/Debug", {
    readonly effect: Effect.Effect<DebugInterface, never, IPCService>;
}>;
/**
 * @class DebugService
 * @description The `Effect.Service` for the Debug service.
 */
export declare class DebugService extends DebugService_base {
}
export {};
//# sourceMappingURL=Debug.d.ts.map