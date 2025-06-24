/*
 * File: Cocoon/Source/Service/Debug/Definition.ts
 * Role: Provides the live implementation of the Debug service.
 * Responsibilities:
 *   - Manages the lifecycle of debug sessions and breakpoints.
 *   - Registers and orchestrates various debug providers (Configuration, Adapter, etc.).
 *   - Proxies debug commands and state changes to the Mountain host via IPC.
 */

import { Effect, Ref } from "effect";
import { type IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type Breakpoint,
	type DebugConfiguration,
	type DebugSession,
	type DebugSessionOptions,
	type WorkspaceFolder,
} from "vscode";
import { IPC } from "../IPC/Service.js";
import { RegisterProviderEffect } from "./RegisterProvider.js";
import { Debug } from "./Service.js";
import { type DebuggerState, type ProviderEntry } from "./Type.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";

/**
 * An `Effect` that builds the live implementation of the `Debug` service.
 */
const Definition = Effect.gen(function* (Generator) {
	// --- Service Dependencies ---
	const IPCService = yield* Generator(IPC);

	// --- Internal State Management ---
	const DebugStateRef = yield* Generator(
		Ref.make<DebuggerState>({
			ActiveDebugSession: undefined,
			ActiveDebugConsole: {
				append: (_Value: string) => {},
				appendLine: (_Value: string) => {},
			},
			Breakpoints: [],
			DebugConfigurationProviders: new Map<number, ProviderEntry>(),
			DebugAdapterDescriptorFactories: new Map<number, ProviderEntry>(),
			DebugAdapterTrackerFactories: new Map<number, ProviderEntry>(),
		}),
	);

	// --- Event Emitters ---
	const OnDidChangeActiveDebugSessionEvent = CreateEventStream<
		DebugSession | undefined
	>();
	const OnDidStartDebugSessionEvent = CreateEventStream<DebugSession>();
	const OnDidReceiveDebugSessionCustomEvent = CreateEventStream<any>();
	const OnDidTerminateDebugSessionEvent = CreateEventStream<DebugSession>();
	const OnDidChangeBreakpointsEvent = CreateEventStream<any>();

	// --- Implemented Service Methods ---

	const StartDebuggingEffect = (
		Folder: WorkspaceFolder | undefined,
		NameOrConfiguration: string | DebugConfiguration,
		Options?: DebugSessionOptions,
	) =>
		Effect.gen(function* (Generator) {
			yield* Generator(
				Effect.logInfo(
					`Request to start debugging in folder: ${Folder?.name ?? "None"}`,
					NameOrConfiguration,
				),
			);

			// Convert the configuration and options into a DTO for IPC.
			// A real implementation would have a robust `DebugConverter`.
			const ConfigurationDTO =
				typeof NameOrConfiguration === "string"
					? { name: NameOrConfiguration }
					: NameOrConfiguration;
			const OptionsDTO = {
				parentSession: Options?.parentSession?.id,
				lifecycleManagedByParent: Options?.lifecycleManagedByParent,
				// ... other options
			};

			const Success = yield* Generator(
				IPCService.SendRequest<boolean>("$startDebugging", [
					Folder?.uri.toJSON(),
					ConfigurationDTO,
					OptionsDTO,
				]),
			);

			// In a real implementation, Mountain would emit an `onDidStartDebugSession`
			// event upon success, which Cocoon would listen for to update its state.
			// Here, we simulate this for demonstration.
			if (Success) {
				yield* Generator(
					Effect.logInfo("Debug session started successfully."),
				);
			}

			return Success;
		});

	const StopDebuggingEffect = (Session?: DebugSession) =>
		Effect.gen(function* (Generator) {
			const ActiveSession = (yield* Generator(Ref.get(DebugStateRef)))
				.ActiveDebugSession;
			const SessionToStop = Session ?? ActiveSession;

			if (!SessionToStop) {
				return yield* Generator(
					Effect.logWarn(
						"StopDebugging called but no session is active.",
					),
				);
			}

			yield* Generator(
				Effect.logInfo(
					`Request to stop debugging session: ${SessionToStop.id}`,
				),
			);

			yield* Generator(
				IPCService.SendNotification("$stopDebugging", [
					SessionToStop.id,
				]),
			);

			// Similar to starting, the host would emit an `onDidTerminateDebugSession`
			// event which we would listen for to update our state.
		});

	// --- Service Implementation ---

	const ServiceImplementation: Debug = {
		// --- Properties ---
		get activeDebugSession() {
			return Ref.unsafeGet(DebugStateRef).ActiveDebugSession;
		},
		get activeDebugConsole() {
			return Ref.unsafeGet(DebugStateRef).ActiveDebugConsole;
		},
		get breakpoints() {
			return Ref.unsafeGet(DebugStateRef).Breakpoints;
		},

		// --- Events ---
		onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent.event,
		onDidStartDebugSession: OnDidStartDebugSessionEvent.event,
		onDidReceiveDebugSessionCustomEvent:
			OnDidReceiveDebugSessionCustomEvent.event,
		onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.event,
		onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.event,

		// --- Provider Registration Methods ---
		RegisterDebugConfigurationProvider: (DebugType, Provider, Extension) =>
			RegisterProviderEffect(
				Ref.unsafeGet(DebugStateRef).DebugConfigurationProviders,
				{
					Type: DebugType,
					Provider,
					Extension,
				} as unknown as ProviderEntry,
			).pipe(Effect.provideService(IPC, IPCService)),

		RegisterDebugAdapterDescriptorFactory: (
			DebugType,
			Factory,
			Extension,
		) =>
			RegisterProviderEffect(
				Ref.unsafeGet(DebugStateRef).DebugAdapterDescriptorFactories,
				{
					Type: DebugType,
					Provider: Factory,
					Extension,
				} as unknown as ProviderEntry,
			).pipe(Effect.provideService(IPC, IPCService)),

		RegisterDebugAdapterTrackerFactory: (DebugType, Factory, Extension) =>
			RegisterProviderEffect(
				Ref.unsafeGet(DebugStateRef).DebugAdapterTrackerFactories,
				{
					Type: DebugType,
					Provider: Factory,
					Extension,
				} as unknown as ProviderEntry,
			).pipe(Effect.provideService(IPC, IPCService)),

		// --- Service Methods ---
		StartDebugging: StartDebuggingEffect,
		StopDebugging: StopDebuggingEffect,

		// --- Stubbed Methods ---
		AddBreakpoints: (_Breakpoints: readonly Breakpoint[]) =>
			Effect.sync(() =>
				console.warn("STUB: Debug.AddBreakpoints not implemented."),
			),
		RemoveBreakpoints: (_Breakpoints: readonly Breakpoint[]) =>
			Effect.sync(() =>
				console.warn("STUB: Debug.RemoveBreakpoints not implemented."),
			),
	};

	return ServiceImplementation;
});

export default Definition;
