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
import * as VSCode from "vscode";

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
			onDidChangeActiveStackItem: AsEvent(
				new VSCode.EventEmitter<any>().event,
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
			registerDebugVisualizationProvider: (_id, _provider) =>
				new VSCode.Disposable(() => {}),
			registerDebugVisualizationTreeProvider: (_id, _provider) =>
				new VSCode.Disposable(() => {}),
			asDebugSourceUri: (source, session) => {
				// FIX: The `uri` property is not on the `DebugProtocolSource` type.
				// However, the object passed from the debug adapter will have a `path` property.
				// `Uri.file` is the correct constructor for a file system path.
				const sourcePath = (source as any).path;
				if (typeof sourcePath === "string") {
					const uri = VSCode.Uri.file(sourcePath);
					if (session) {
						return uri.with({ query: `session=${session.id}` });
					}
					return uri;
				}
				// The source can also have a `sourceReference` which is a number.
				// This case would require a "debug:" scheme Uri, which is more complex.
				// For now, we only handle the path case.
				throw new Error(
					"asDebugSourceUri: Not implemented for this source type.",
				);
			},
		};

		return DebugNamespace;
	});
};

export default CreateDebugNamespaceEffect;
