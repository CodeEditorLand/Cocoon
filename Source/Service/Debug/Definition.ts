/*
 * File: Cocoon/Source/Service/Debug/Definition.ts
 * Responsibility: Implements the debug service for the Cocoon sidecar using Effect, managing debug sessions and breakpoints while integrating with VS Code's debug configuration providers via the Vine IPC layer to support extension compatibility in MVP Path A.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../IPC/Service.js, ./Error.js, ./RegisterProvider.js, ./Service.js, ./Type.js, effect
 */

/**
 * @module Definition (Debug)
 * @description The live implementation of the Debug service.
 */
import { Effect, Layer, Ref } from "effect";
import type {
	Breakpoint,
	DebugConfiguration,
	DebugSession,
	DebugSessionOptions,
	WorkspaceFolder,
} from "vscode";

import IPCService from "../IPC/Service.js";
import type { StartDebuggingError } from "./Error.js";
import RegisterProvider from "./RegisterProvider.js";
import type Service from "./Service.js";
import { Debugger, ProviderEntry } from "./Type.js";

export default Effect.gen(function* () {
	// --- Service Dependencies ---
	const IPC = yield* IPCService;
	const DebugState = yield* Ref.make<Debugger>({
		ActiveDebugSession: undefined,
		ActiveDebugConsole: {
			append: (_value: string) => {},
			appendLine: (_value: string) => {},
		},
		Breakpoints: [],
		DebugConfigurationProviders: new Map<number, ProviderEntry>(),
		DebugAdapterDescriptorFactories: new Map<number, ProviderEntry>(),
		DebugAdapterTrackerFactories: new Map<number, ProviderEntry>(),
	});

	// --- Event Emitters ---
	// These would be created with a utility like your CreateEventStream
	// const { event: onDidChangeActiveDebugSession, Fire: fireDidChangeActiveDebugSession } = CreateEventStream<DebugSession | undefined>();
	// ... and so on for other events

	// --- Service Implementation ---
	const ServiceImplementation: Service["Type"] = {
		// Properties
		get activeDebugSession() {
			return Effect.runSync(Ref.get(DebugState)).ActiveDebugSession;
		},
		get activeDebugConsole() {
			return Effect.runSync(Ref.get(DebugState)).ActiveDebugConsole;
		},
		get breakpoints() {
			return Effect.runSync(Ref.get(DebugState)).Breakpoints;
		},

		// Events (assuming they are implemented with an event stream utility)
		onDidChangeActiveDebugSession: undefined as any,
		onDidStartDebugSession: undefined as any,
		onDidReceiveDebugSessionCustomEvent: undefined as any,
		onDidTerminateDebugSession: undefined as any,
		onDidChangeBreakpoints: undefined as any,

		// Methods
		RegisterDebugConfigurationProvider: (DebugType, Provider, Extension) =>
			RegisterProvider(
				(yield* DebugState).DebugConfigurationProviders,
				{
					Type: DebugType,
					Provider,
					Extension,
				} as unknown as ProviderEntry, // Cast to avoid complex generic issues
			).pipe(Effect.provide(Layer.succeed(IPCService, IPC))),

		RegisterDebugAdapterDescriptorFactory: (
			DebugType,
			Factory,
			Extension,
		) =>
			RegisterProvider(
				(yield* DebugState).DebugAdapterDescriptorFactories,
				{
					Type: DebugType,
					Provider: Factory,
					Extension,
				} as unknown as ProviderEntry, // Cast to avoid complex generic issues
			).pipe(Effect.provide(Layer.succeed(IPCService, IPC))),

		RegisterDebugAdapterTrackerFactory: (DebugType, Factory, Extension) =>
			RegisterProvider(
				(yield* DebugState).DebugAdapterTrackerFactories,
				{
					Type: DebugType,
					Provider: Factory,
					Extension,
				} as unknown as ProviderEntry, // Cast to avoid complex generic issues
			).pipe(Effect.provide(Layer.succeed(IPCService, IPC))),

		StartDebugging: (
			_folder: WorkspaceFolder | undefined,
			_nameOrConfig: string | DebugConfiguration,
			_options?: DebugSessionOptions,
		): Effect.Effect<boolean, StartDebuggingError> => Effect.succeed(true), // Stubbed

		StopDebugging: (_session?: DebugSession): Effect.Effect<void, Error> =>
			Effect.void, // Stubbed

		AddBreakpoints: (
			_breakpoints: readonly Breakpoint[],
		): Effect.Effect<void, Error> => Effect.void, // Stubbed

		RemoveBreakpoints: (
			_breakpoints: readonly Breakpoint[],
		): Effect.Effect<void, Error> => Effect.void, // Stubbed
	};

	return ServiceImplementation;
});
