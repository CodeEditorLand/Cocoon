/*
 * File: Cocoon/Source/Service/Debug/Definition.ts
 * Responsibility: The live implementation of the Debug service.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Definition (Debug)
 * @description The live implementation of the Debug service.
 */
import { Effect, Ref } from "effect";
import type {
	Breakpoint,
	DebugConfiguration,
	DebugSession,
	DebugSessionOptions,
	WorkspaceFolder,
} from "vscode";

import IPCService from "../IPC/Service.js";
import RegisterProviderEffect from "./RegisterProvider.js";
import type Service from "./Service.js";
import { ProviderEntry } from "./Type.js";

/**
 * An Effect that builds the live implementation of the Debug service.
 */
export default Effect.gen(function* (G) {
	// --- Service Dependencies ---
	const IPC = yield* G(IPCService);
	const DebugStateRef = yield* G(
		Ref.make({
			ActiveDebugSession: undefined,
			ActiveDebugConsole: {
				append: (_value: string) => {},
				appendLine: (_value: string) => {},
			},
			Breakpoints: [],
			DebugConfigurationProviders: new Map<number, ProviderEntry>(),
			DebugAdapterDescriptorFactories: new Map<number, ProviderEntry>(),
			DebugAdapterTrackerFactories: new Map<number, ProviderEntry>(),
		}),
	);

	// --- Event Emitters (stubbed) ---
	// In a full implementation, these would be created with a utility like CreateEventStream.
	const Events = {
		onDidChangeActiveDebugSession: undefined as any,
		onDidStartDebugSession: undefined as any,
		onDidReceiveDebugSessionCustomEvent: undefined as any,
		onDidTerminateDebugSession: undefined as any,
		onDidChangeBreakpoints: undefined as any,
	};

	// --- Service Implementation ---
	const ServiceImplementation: Service["Type"] = {
		// Properties
		get activeDebugSession() {
			return Effect.runSync(Ref.get(DebugStateRef)).ActiveDebugSession;
		},
		get activeDebugConsole() {
			return Effect.runSync(Ref.get(DebugStateRef)).ActiveDebugConsole;
		},
		get breakpoints() {
			return Effect.runSync(Ref.get(DebugStateRef)).Breakpoints;
		},

		...Events,

		// Methods
		RegisterDebugConfigurationProvider: (DebugType, Provider, Extension) =>
			RegisterProviderEffect(
				(yield* G(DebugStateRef)).DebugConfigurationProviders,
				{
					Type: DebugType,
					Provider,
					Extension,
				} as unknown as ProviderEntry,
			).pipe(Effect.provideService(IPCService, IPC)), // Provide dependency to helper

		RegisterDebugAdapterDescriptorFactory: (
			DebugType,
			Factory,
			Extension,
		) =>
			RegisterProviderEffect(
				(yield* G(DebugStateRef)).DebugAdapterDescriptorFactories,
				{
					Type: DebugType,
					Provider: Factory,
					Extension,
				} as unknown as ProviderEntry,
			).pipe(Effect.provideService(IPCService, IPC)),

		RegisterDebugAdapterTrackerFactory: (DebugType, Factory, Extension) =>
			RegisterProviderEffect(
				(yield* G(DebugStateRef)).DebugAdapterTrackerFactories,
				{
					Type: DebugType,
					Provider: Factory,
					Extension,
				} as unknown as ProviderEntry,
			).pipe(Effect.provideService(IPCService, IPC)),

		StartDebugging: (
			_folder: WorkspaceFolder | undefined,
			_nameOrConfig: string | DebugConfiguration,
			_options?: DebugSessionOptions,
		) => Effect.succeed(true), // Stubbed

		StopDebugging: (_session?: DebugSession) => Effect.void, // Stubbed
		AddBreakpoints: (_breakpoints: readonly Breakpoint[]) => Effect.void, // Stubbed
		RemoveBreakpoints: (_breakpoints: readonly Breakpoint[]) => Effect.void, // Stubbed
	};

	return ServiceImplementation;
});
