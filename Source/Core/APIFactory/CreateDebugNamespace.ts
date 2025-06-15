/**
 * @module CreateDebugNamespace
 * @description Constructs the `vscode.debug` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type DebugService from "../../Service/Debug/Service.js";

/**
 * Creates the `vscode.debug` namespace object.
 *
 * This factory function takes the central `DebugService` and the extension's
 * description to create a sandboxed `debug` object. The methods and events on this
 * object delegate to the central service.
 *
 * @param Debug The central service for debug management.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.debug` API.
 */
const CreateDebugNamespace = (
	Debug: DebugService["Type"],
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.debug => {
	return {
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

		// --- Methods ---
		registerDebugConfigurationProvider: (debugType, provider) => {
			return Effect.runSync(
				Debug.RegisterDebugConfigurationProvider(
					debugType,
					provider,
					Extension,
				),
			);
		},
		registerDebugAdapterDescriptorFactory: (debugType, factory) => {
			return Effect.runSync(
				Debug.RegisterDebugAdapterDescriptorFactory(
					debugType,
					factory,
					Extension,
				),
			);
		},
		registerDebugAdapterTrackerFactory: (debugType, factory) => {
			return Effect.runSync(
				Debug.RegisterDebugAdapterTrackerFactory(
					debugType,
					factory,
					Extension,
				),
			);
		},
		startDebugging: (folder, nameOrConfig, options) => {
			return Effect.runPromise(
				Debug.StartDebugging(folder, nameOrConfig, options),
			);
		},
		stopDebugging: (session) => {
			return Effect.runPromise(Debug.StopDebugging(session));
		},
		addBreakpoints: (breakpoints) => {
			return Effect.runPromise(Debug.AddBreakpoints(breakpoints));
		},
		removeBreakpoints: (breakpoints) => {
			return Effect.runPromise(Debug.RemoveBreakpoints(breakpoints));
		},
	} as any;
};

export default CreateDebugNamespace;
