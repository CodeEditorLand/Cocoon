/*
 * File: Cocoon/Source/Core/APIFactory/CreateDebugNamespace.ts
 * Responsibility: Implements the vscode.debug API namespace for the Cocoon sidecar by delegating to the central DebugService.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/Debug/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
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
 *
 * This factory function is an `Effect` that depends on the `DebugService`.
 * It creates a sandboxed `debug` object where methods return `Effect`s.
 *
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An `Effect` that resolves to an object implementing the `vscode.debug` API.
 */
const CreateDebugNamespaceEffect = (
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): Effect.Effect<typeof VSCode.debug, never, DebugService> => {
	return Effect.gen(function* (G) {
		const Debug = yield* G(DebugService);

		// The vscode.debug namespace is extensive. We implement the core parts.
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

			// --- Methods (Now return Effects instead of running them) ---
			registerDebugConfigurationProvider: (debugType, provider) =>
				Debug.RegisterDebugConfigurationProvider(
					debugType,
					provider,
					Extension,
				) as any, // Cast to `any` to satisfy the `Disposable` in the vscode.d.ts, will be handled by caller
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
		};

		return DebugNamespace;
	});
};

export default CreateDebugNamespaceEffect;
