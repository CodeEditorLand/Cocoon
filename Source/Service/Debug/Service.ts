/**
 * @module Service (Debug)
 * @description Defines the interface and Context.Tag for the Debug service.
 */

import { Context, type Effect } from "effect";
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
} from "./Type.js";

export interface Interface {
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

	// --- Methods ---
	readonly RegisterDebugConfigurationProvider: (
		DebugType: string,
		Provider: DebugConfigurationProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly RegisterDebugAdapterDescriptorFactory: (
		DebugType: string,
		Factory: DebugAdapterDescriptorFactory,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly RegisterDebugAdapterTrackerFactory: (
		DebugType: string,
		Factory: DebugAdapterTrackerFactory,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	readonly StartDebugging: (
		Folder: WorkspaceFolder | undefined,
		Configuration: string | DebugConfiguration,
		Options?: DebugSessionOptions,
	) => Effect.Effect<boolean, Error>;

	readonly StopDebugging: (
		Session?: DebugSession,
	) => Effect.Effect<void, Error>;

	readonly AddBreakpoints: (
		Breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, Error>;

	readonly RemoveBreakpoints: (
		Breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Debug");
