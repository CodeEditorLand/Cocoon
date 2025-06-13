/**
 * @module CreateDebugNamespace
 * @description Constructs the `vscode.debug` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type * as Service from "../../Service.js";

/**
 * Creates the `vscode.debug` namespace object.
 *
 * This factory function takes the central `DebugService` and the extension's
 * description to create a sandboxed `debug` object. The methods and events on this
 * object delegate to the central service.
 *
 * @param DebugService The central service for debug management.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.debug` API.
 */
export function CreateDebugNamespace(
	DebugService: Service.Debug.Interface,
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.debug {
	return {
		// --- Properties ---
		get activeDebugSession() {
			return DebugService.activeDebugSession;
		},
		get activeDebugConsole() {
			return DebugService.activeDebugConsole;
		},
		get breakpoints() {
			return DebugService.breakpoints;
		},

		// --- Events ---
		onDidChangeActiveDebugSession: AsEvent(
			DebugService.onDidChangeActiveDebugSession,
		),
		onDidStartDebugSession: AsEvent(DebugService.onDidStartDebugSession),
		onDidReceiveDebugSessionCustomEvent: AsEvent(
			DebugService.onDidReceiveDebugSessionCustomEvent,
		),
		onDidTerminateDebugSession: AsEvent(
			DebugService.onDidTerminateDebugSession,
		),
		onDidChangeBreakpoints: AsEvent(DebugService.onDidChangeBreakpoints),

		// --- Methods ---
		registerDebugConfigurationProvider: (debugType, provider) => {
			return Effect.runSync(
				DebugService.RegisterDebugConfigurationProvider(
					debugType,
					provider,
					Extension,
				),
			);
		},
		registerDebugAdapterDescriptorFactory: (debugType, factory) => {
			return Effect.runSync(
				DebugService.RegisterDebugAdapterDescriptorFactory(
					debugType,
					factory,
					Extension,
				),
			);
		},
		registerDebugAdapterTrackerFactory: (debugType, factory) => {
			return Effect.runSync(
				DebugService.RegisterDebugAdapterTrackerFactory(
					debugType,
					factory,
					Extension,
				),
			);
		},
		startDebugging: (folder, nameOrConfig, options) => {
			return Effect.runPromise(
				DebugService.StartDebugging(folder, nameOrConfig, options),
			);
		},
		stopDebugging: (session) => {
			return Effect.runPromise(DebugService.StopDebugging(session));
		},
		addBreakpoints: (breakpoints) => {
			return Effect.runPromise(DebugService.AddBreakpoints(breakpoints));
		},
		removeBreakpoints: (breakpoints) => {
			return Effect.runPromise(
				DebugService.RemoveBreakpoints(breakpoints),
			);
		},
	} as any;
}
