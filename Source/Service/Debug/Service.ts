/*
 * File: Cocoon/Source/Service/Debug/Service.ts
 *
 * This file defines the interface and Context.Tag for the Debug service.
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
} from "vscode";

import type DebugProviderRegistrationError from "./Error/DebugProviderRegistrationError.js";
import type StartDebuggingError from "./Error/StartDebuggingError.js";

export default class DebugService extends Context.Tag("Service/Debug")<
	DebugService,
	{
		// --- Events ---
		readonly onDidChangeActiveDebugSession: Event<DebugSession | undefined>;
		readonly onDidStartDebugSession: Event<DebugSession>;
		readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;
		readonly onDidTerminateDebugSession: Event<DebugSession>;
		// BreakpointsChangeEvent
		readonly onDidChangeBreakpoints: Event<any>;

		// --- Properties ---
		readonly activeDebugSession: DebugSession | undefined;
		readonly activeDebugConsole: DebugConsole;
		readonly breakpoints: readonly Breakpoint[];

		// --- Methods ---
		readonly RegisterDebugConfigurationProvider: (
			DebugType: string,
			Provider: DebugConfigurationProvider,
			Extension: IExtensionDescription,
		) => Effect.Effect<Disposable, DebugProviderRegistrationError>;

		readonly RegisterDebugAdapterDescriptorFactory: (
			DebugType: string,
			Factory: DebugAdapterDescriptorFactory,
			Extension: IExtensionDescription,
		) => Effect.Effect<Disposable, DebugProviderRegistrationError>;

		readonly RegisterDebugAdapterTrackerFactory: (
			DebugType: string,
			Factory: DebugAdapterTrackerFactory,
			Extension: IExtensionDescription,
		) => Effect.Effect<Disposable, DebugProviderRegistrationError>;

		readonly StartDebugging: (
			Folder: WorkspaceFolder | undefined,
			Configuration: string | DebugConfiguration,
			Options?: DebugSessionOptions,
		) => Effect.Effect<boolean, StartDebuggingError>;

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
>() {}
