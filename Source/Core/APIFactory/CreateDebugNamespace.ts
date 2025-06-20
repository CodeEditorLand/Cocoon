

/**
 * @module CreateDebugNamespace
 * @description Constructs the `vscode.debug` namespace for the API object.
 */
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import * as VSCode from "vscode";
import { EventEmitter } from "vscode";

import type DebugService from "../../Service/Debug/Service.js";

/**
 * Creates the `vscode.debug` namespace object.
 */
const CreateDebugNamespace = (
	Debug: DebugService["Type"],
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.debug => {
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
			// Stubbed as per original, a full implementation is complex.
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
		onDidTerminateDebugSession: AsEvent(Debug.onDidTerminateDebugSession),
		onDidChangeBreakpoints: AsEvent(Debug.onDidChangeBreakpoints),
		// Stubbed as per original.
		onDidChangeActiveStackItem: AsEvent(new EventEmitter<any>().event),

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
			new EventEmitter<any>().event as any, // Stub
		registerDebugVisualizationTreeProvider: (_id, _provider) =>
			new EventEmitter<any>().event as any, // Stub
		asDebugSourceUri: (source, session) => {
			const sourcePath = (source as any).path;
			if (typeof sourcePath === "string") {
				const uri = VSCode.Uri.file(sourcePath);
				if (session) {
					return uri.with({ query: `session=${session.id}` });
				}
				return uri;
			}
			throw new Error(
				"asDebugSourceUri: Not implemented for this source type.",
			);
		},
	};

	return DebugNamespace;
};

export default CreateDebugNamespace;
