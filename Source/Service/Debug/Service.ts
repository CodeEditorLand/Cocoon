/*
 * File: Cocoon/Source/Service/Debug/Service.ts
 * Role: Defines the Debug service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Manage debugging sessions, breakpoints, and debug-related providers.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	type Breakpoint,
	type DebugConfiguration,
	type DebugSession,
	type DebugSessionCustomEvent,
	type DebugSessionOptions,
	type WorkspaceFolder,
	type Event,
	type DebugAdapterDescriptorFactory,
	type DebugConfigurationProvider,
	type DebugAdapterTrackerFactory,
	type DebugConsole,
} from "vscode";

import { IPC } from "../IPC/Service.js";
import { DebugProviderRegistrationProblem } from "./Error/DebugProviderRegistrationProblem.js";
import { StartDebuggingProblem } from "./Error/StartDebuggingError.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { ProviderEntry, Debugger as DebuggerState } from "./Type.js";

export class Debug extends Effect.Service<Debug>()("Service/Debug", {
	effect: Effect.gen(function* (Generator) {
		const IPCService = yield* Generator(IPC);

		let HandleCounter = 0;

		const DebugStateRef = yield* Generator(
			Ref.make<DebuggerState>({
				ActiveDebugSession: undefined,
				ActiveDebugConsole: {
					append: (_Value: string) => {},
					appendLine: (_Value: string) => {},
				},
				Breakpoints: [],
				DebugConfigurationProviders: new Map<number, ProviderEntry>(),
				DebugAdapterDescriptorFactories: new Map<
					number,
					ProviderEntry
				>(),
				DebugAdapterTrackerFactories: new Map<number, ProviderEntry>(),
			}),
		);

		const OnDidChangeActiveDebugSessionEvent = CreateEventStream<
			DebugSession | undefined
		>();
		const OnDidStartDebugSessionEvent = CreateEventStream<DebugSession>();
		const OnDidReceiveDebugSessionCustomEvent = CreateEventStream<any>();
		const OnDidTerminateDebugSessionEvent =
			CreateEventStream<DebugSession>();
		const OnDidChangeBreakpointsEvent = CreateEventStream<any>();

		const RegisterProviderEffect = <T>(
			RegistryRef: Ref.Ref<Map<number, T>>,
			Data: T,
		) =>
			Effect.gen(function* (Generator) {
				const Handle = ++HandleCounter;
				yield* Generator(
					Ref.update(RegistryRef, (TheMap) =>
						TheMap.set(Handle, Data),
					),
				);
				yield* Generator(
					IPCService.SendNotification(
						"$registerDebugConfigurationProvider",
						[Handle, (Data as any).Type],
					).pipe(
						Effect.mapError(
							(cause) =>
								new DebugProviderRegistrationProblem({
									DebugType: (Data as any).Type,
									cause,
								}),
						),
					),
				);
				const CleanupEffect = Ref.update(
					RegistryRef,
					(TheMap) => (TheMap.delete(Handle), TheMap),
				).pipe(
					Effect.andThen(
						IPCService.SendNotification(
							"$unregisterDebugConfigurationProvider",
							[Handle],
						),
					),
				);
				return new Disposable(() => Effect.runFork(CleanupEffect));
			});

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
				const ConfigurationDTO =
					typeof NameOrConfiguration === "string"
						? { name: NameOrConfiguration }
						: NameOrConfiguration;
				const OptionsDTO = {
					parentSession: Options?.parentSession?.id,
					lifecycleManagedByParent: Options?.lifecycleManagedByParent,
				};
				const Success = yield* Generator(
					IPCService.SendRequest<boolean>("$startDebugging", [
						Folder?.uri.toJSON(),
						ConfigurationDTO,
						OptionsDTO,
					]),
				);
				if (Success) {
					yield* Generator(
						Effect.logInfo("Debug session started successfully."),
					);
				}
				return Success;
			}).pipe(
				Effect.mapError(
					(Cause) => new StartDebuggingProblem({ Cause }),
				),
			);

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
			}).pipe(
				Effect.mapError(
					(Cause) =>
						new Error("Failed to stop debugging session.", {
							cause: Cause,
						}),
				),
			);

		const ServiceImplementation = {
			get activeDebugSession() {
				return Ref.unsafeGet(DebugStateRef).ActiveDebugSession;
			},
			get activeDebugConsole() {
				return Ref.unsafeGet(DebugStateRef).ActiveDebugConsole;
			},
			get breakpoints() {
				return Ref.unsafeGet(DebugStateRef).Breakpoints;
			},
			onDidChangeActiveDebugSession:
				OnDidChangeActiveDebugSessionEvent.event,
			onDidStartDebugSession: OnDidStartDebugSessionEvent.event,
			onDidReceiveDebugSessionCustomEvent:
				OnDidReceiveDebugSessionCustomEvent.event,
			onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.event,
			onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.event,

			RegisterDebugConfigurationProvider: (
				DebugType: string,
				Provider: DebugConfigurationProvider,
				Extension: IExtensionDescription,
			) =>
				RegisterProviderEffect(
					Ref.unsafeGet(DebugStateRef).DebugConfigurationProviders,
					{
						Type: DebugType,
						Provider,
						Extension,
					} as unknown as ProviderEntry,
				),
			RegisterDebugAdapterDescriptorFactory: (
				DebugType: string,
				Factory: DebugAdapterDescriptorFactory,
				Extension: IExtensionDescription,
			) =>
				RegisterProviderEffect(
					Ref.unsafeGet(DebugStateRef)
						.DebugAdapterDescriptorFactories,
					{
						Type: DebugType,
						Provider: Factory,
						Extension,
					} as unknown as ProviderEntry,
				),
			RegisterDebugAdapterTrackerFactory: (
				DebugType: string,
				Factory: DebugAdapterTrackerFactory,
				Extension: IExtensionDescription,
			) =>
				RegisterProviderEffect(
					Ref.unsafeGet(DebugStateRef).DebugAdapterTrackerFactories,
					{
						Type: DebugType,
						Provider: Factory,
						Extension,
					} as unknown as ProviderEntry,
				),

			StartDebugging: StartDebuggingEffect,
			StopDebugging: StopDebuggingEffect,
			AddBreakpoints: (_Breakpoints: readonly Breakpoint[]) =>
				Effect.sync(() =>
					console.warn("STUB: Debug.AddBreakpoints not implemented."),
				),
			RemoveBreakpoints: (_Breakpoints: readonly Breakpoint[]) =>
				Effect.sync(() =>
					console.warn(
						"STUB: Debug.RemoveBreakpoints not implemented.",
					),
				),
		};

		return ServiceImplementation;
	}),
}) {}
