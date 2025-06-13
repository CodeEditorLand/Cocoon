/**
 * @module Type (Debug)
 * @description Defines aliases for the complex types from the `vscode`
 * namespace that are used by the Debug service.
 */

import type {
	Breakpoint,
	DebugAdapterDescriptor,
	DebugAdapterDescriptorFactory,
	DebugAdapterInlineImplementation,
	DebugAdapterNamedPipeServer,
	DebugAdapterServer,
	DebugAdapterTracker,
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

// Exporting types directly for convenience in other modules.
export type {
	Breakpoint,
	DebugAdapterDescriptor,
	DebugAdapterDescriptorFactory,
	DebugAdapterInlineImplementation,
	DebugAdapterNamedPipeServer,
	DebugAdapterServer,
	DebugAdapterTracker,
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
};
