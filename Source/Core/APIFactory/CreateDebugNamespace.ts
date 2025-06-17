/*
 * File: Cocoon/Source/Core/APIFactory/CreateDebugNamespace.ts
 * Responsibility: Implements the vscode.debug API namespace for the Cocoon sidecar.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module CreateDebugNamespace
 * @description Constructs the `vscode.debug` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import DebugService from "../../Service/Debug/Service.js";

/**
 * Creates an Effect that constructs the `vscode.debug` namespace object.
 */
const CreateDebugNamespaceEffect = (
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): Effect.Effect<typeof VSCode.debug, never, DebugService> => {
	return Effect.gen(function* (G) {
		const Debug = yield* G(DebugService);

		const DebugNamespace: typeof VSCode.debug = {
			// --- Properties ---
			get activeDebugSession() {
				return Debug.activeDebugSession;
			},
			get activeDebugConsole() {
				return Debug.activeDebugConsole;
			},
			get breakpoints() {
				return Debug.breakpoints;
			},
			// FIX: Add missing property
			get activeStackItem() {
				return undefined;
			},

			// --- Events ---
			onDidChangeActiveDebugSession: AsEvent(
				Debug.onDidChangeActiveDebugSession,
			),
			onDidStartDebugSession: AsEvent(Debug.onDidStartDebugSession),
			onDidReceiveDebugSessionCustomEvent: AsEvent(
				Debug.onDidReceiveDebugSessionCustomEvent,
			),
			onDidTerminateDebugSession: AsEvent(
				Debug.onDidTerminateDebugSession,
			),
			onDidChangeBreakpoints: AsEvent(Debug.onDidChangeBreakpoints),
			// FIX: Add missing event
			onDidChangeActiveStackItem: AsEvent(
				new Effect.EventEmitter<any>().event,
			),

			// --- Methods ---
			registerDebugConfigurationProvider: (debugType, provider) =>
				Debug.RegisterDebugConfigurationProvider(
					debugType,
					provider,
					Extension,
				) as any,
			registerDebugAdapterDescriptorFactory: (debugType, factory) =>
				Debug.RegisterDebugAdapterDescriptorFactory(
					debugType,
					factory,
					Extension,
				) as any,
			registerDebugAdapterTrackerFactory: (debugType, factory) =>
				Debug.RegisterDebugAdapterTrackerFactory(
					debugType,
					factory,
					Extension,
				) as any,
			startDebugging: (folder, nameOrConfig, options) =>
				Debug.StartDebugging(folder, nameOrConfig, options) as any,
			stopDebugging: (session) => Debug.StopDebugging(session) as any,
			addBreakpoints: (breakpoints) =>
				Debug.AddBreakpoints(breakpoints) as any,
			removeBreakpoints: (breakpoints) =>
				Debug.RemoveBreakpoints(breakpoints) as any,

			// FIX: Add missing methods
			registerDebugVisualizationProvider: (_id, _provider) => ({
				dispose: () => {},
			}),
			registerDebugVisualizationTreeProvider: (_id, _provider) => ({
				dispose: () => {},
			}),
			asDebugSourceUri: (source, session) => {
				// This requires a more complex implementation, stubbing for now.
				const uri = source.uri;
				if (!uri) {
					throw new Error("NYI");
				}
				if (session) {
					return uri.with({ query: `session=${session.id}` });
				}
				return uri;
			},
		};

		return DebugNamespace;
	});
};

export default CreateDebugNamespaceEffect;
