/*
 * File: Cocoon/Source/Service/Debug/Service.ts
 * Role: Defines the service interface and Effect.Service for the Debug service.
 * Responsibilities:
 *   - Declare the contract for the service that manages debugging sessions,
 *     breakpoints, and debug-related providers.
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Breakpoint,
	DebugAdapterDescriptorFactory,
	DebugAdapterTrackerFactory,
	DebugConfiguration,
	DebugConfigurationProvider,
	DebugConsole,
	DebugSession,
	DebugSessionCustomEvent,
	DebugSessionOptions,
	Disposable,
	Event,
	WorkspaceFolder,
} from "vscode";
import type { DebugProviderRegistrationProblem } from "./Error.js";
import type { StartDebuggingProblem } from "./Error.js";

/**
 * The `Effect.Service` for the Debug service.
 * This service implements the `vscode.debug` namespace API.
 */
export class Debug extends Effect.Service<Debug>("Service/Debug")<{
	// --- Events ---
	readonly onDidChangeActiveDebugSession: Event<DebugSession | undefined>;
	readonly onDidStartDebugSession: Event<DebugSession>;
	readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;
	readonly onDidTerminateDebugSession: Event<DebugSession>;
	readonly onDidChangeBreakpoints: Event<any>; // BreakpointsChangeEvent

	// --- Properties ---
	readonly activeDebugSession: DebugSession | undefined;
	readonly activeDebugConsole: DebugConsole;
	readonly breakpoints: readonly Breakpoint[];

	// --- Provider Registration Methods ---
	readonly RegisterDebugConfigurationProvider: (
		DebugType: string,
		Provider: DebugConfigurationProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;

	readonly RegisterDebugAdapterDescriptorFactory: (
		DebugType: string,
		Factory: DebugAdapterDescriptorFactory,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;

	readonly RegisterDebugAdapterTrackerFactory: (
		DebugType: string,
		Factory: DebugAdapterTrackerFactory,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;

	// --- Core Debugging Methods ---
	readonly StartDebugging: (
		Folder: WorkspaceFolder | undefined,
		Configuration: string | DebugConfiguration,
		Options?: DebugSessionOptions,
	) => Effect.Effect<boolean, StartDebuggingProblem>;

	readonly StopDebugging: (
		Session?: DebugSession,
	) => Effect.Effect<void, Error>;

	readonly AddBreakpoints: (
		Breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, Error>;

	readonly RemoveBreakpoints: (
		Breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, Error>;
}>() {}
