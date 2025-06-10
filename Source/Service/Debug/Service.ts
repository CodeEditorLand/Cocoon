/**
 * @module Service (Debug)
 * @description Defines the interface and Context.Tag for the Debug service.
 */

import { Context, Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	DebugAdapterDescriptorFactory,
	DebugConfiguration,
	DebugConfigurationProvider,
	DebugSession,
	DebugSessionOptions,
	IDisposable,
	WorkspaceFolder,
} from "vscode";

export interface Interface {
	readonly onDidChangeActiveDebugSession: Stream.Stream<
		DebugSession | undefined,
		never
	>;
	// ... other events like onDidStartDebugSession, onDidTerminateDebugSession ...

	readonly activeDebugSession: DebugSession | undefined;

	readonly RegisterDebugConfigurationProvider: (
		Type: string,
		Provider: DebugConfigurationProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<IDisposable, Error>;

	readonly RegisterDebugAdapterDescriptorFactory: (
		Type: string,
		Factory: DebugAdapterDescriptorFactory,
		Extension: IExtensionDescription,
	) => Effect.Effect<IDisposable, Error>;

	readonly StartDebugging: (
		Folder: WorkspaceFolder | undefined,
		Config: string | DebugConfiguration,
		Options?: DebugSessionOptions,
	) => Effect.Effect<boolean, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Debug");
