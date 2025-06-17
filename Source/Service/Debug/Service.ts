/*
 * File: Cocoon/Source/Service/Debug/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:40 UTC
 * Dependency: effect, vs/platform/extensions/common/extensions.js
 * Export: DebugService
 */

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
} from "vscode";

import type {
	DebugProviderRegistrationError,
	StartDebuggingError,
} from "./Error.js";

export default class DebugService extends Context.Tag("Service/Debug")<
	DebugService,
	{
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
		// These methods should return an Effect that resolves to a Disposable.
		// The IPCService dependency will be handled by the live implementation and should not be part of the service interface.
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
