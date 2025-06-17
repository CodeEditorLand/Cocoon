/*
 * File: Cocoon/Source/Core/APIFactory/CreateDebugNamespace.ts
 * Responsibility: Implements the vscode.debug API namespace for the Cocoon sidecar by delegating to the central DebugService, enabling VS Code extensions to interact with debugging sessions and breakpoints while maintaining sandboxing.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/Debug/Service.js, ../../Service/IPC/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module CreateDebugNamespace
 * @description Constructs the `vscode.debug` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import DebugService from "../../Service/Debug/Service.js";
import IPCService from "../../Service/IPC/Service.js";

/**
 * Creates an Effect that constructs the `vscode.debug` namespace object.
 *
 * This factory function takes the central `DebugService` and the extension's
 * description to create a sandboxed `debug` object. The methods and events on this
 * object delegate to the central service.
 *
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An `Effect` that resolves to an object implementing the `vscode.debug` API.
 */
const CreateDebugNamespace = (
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): Effect.Effect<typeof VSCode.debug, never, DebugService | IPCService> => {
	return Effect.gen(function* () {
		const Debug = yield* DebugService;
		// const IPC = yield* IPCService;

		// The vscode.debug namespace is extensive. We implement the core parts
		// and leave stubs for the less common ones for this example.
		const DebugNamespace: Partial<typeof VSCode.debug> = {
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
			onDidTerminateDebugSession: AsEvent(
				Debug.onDidTerminateDebugSession,
			),
			onDidChangeBreakpoints: AsEvent(Debug.onDidChangeBreakpoints),

			// --- Methods ---
			// The vscode API expects these methods to be synchronous and return a Disposable.
			// The underlying service returns an Effect that resolves to a Disposable.
			// We must run this effect synchronously at the boundary.
			registerDebugConfigurationProvider: (debugType, provider) =>
				Effect.runSync(
					Debug.RegisterDebugConfigurationProvider(
						debugType,
						provider,
						Extension,
					),
				),
			registerDebugAdapterDescriptorFactory: (debugType, factory) =>
				Effect.runSync(
					Debug.RegisterDebugAdapterDescriptorFactory(
						debugType,
						factory,
						Extension,
					),
				),
			registerDebugAdapterTrackerFactory: (debugType, factory) =>
				Effect.runSync(
					Debug.RegisterDebugAdapterTrackerFactory(
						debugType,
						factory,
						Extension,
					),
				),
			startDebugging: (folder, nameOrConfig, options) =>
				Effect.runPromise(
					Debug.StartDebugging(folder, nameOrConfig, options),
				),
			stopDebugging: (session) =>
				Effect.runPromise(Debug.StopDebugging(session)),
			addBreakpoints: (breakpoints) =>
				Effect.runPromise(Debug.AddBreakpoints(breakpoints)),
			removeBreakpoints: (breakpoints) =>
				Effect.runPromise(Debug.RemoveBreakpoints(breakpoints)),
		};

		return DebugNamespace as typeof VSCode.debug;
	});
};

export default CreateDebugNamespace;
