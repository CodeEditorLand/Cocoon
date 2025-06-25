/**
 * @module Debug
 * @description Defines the service for managing debugging sessions, breakpoints,
 * and debug-related providers. It implements the `IExtHostDebug` interface from
 * VS Code for high fidelity.
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
import { IPCService } from "./IPC.js";
import { DebugProviderRegistrationProblem } from "./Debug/DebugProviderRegistrationProblem.js";
import { StartDebuggingProblem } from "./Debug/StartDebuggingProblem.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";

/**
 * @interface ProviderEntry
 * @description An internal type representing a registered debug provider.
 */
export interface ProviderEntry {
	readonly Type: string;
	readonly Provider:
		| DebugConfigurationProvider
		| DebugAdapterDescriptorFactory
		| DebugAdapterTrackerFactory;
	readonly Extension: IExtensionDescription;
}

/**
 * @interface DebuggerState
 * @description An internal type representing the state managed by the Debug service.
 */
export interface DebuggerState {
	readonly ActiveDebugSession: DebugSession | undefined;
	readonly ActiveDebugConsole: DebugConsole;
	readonly Breakpoints: readonly Breakpoint[];
	readonly DebugConfigurationProviders: Map<number, ProviderEntry>;
	readonly DebugAdapterDescriptorFactories: Map<number, ProviderEntry>;
	readonly DebugAdapterTrackerFactories: Map<number, ProviderEntry>;
}

/**
 * @interface DebugInterface
 * @description The contract for the Debug service, mirroring `IExtHostDebug`.
 */
export interface DebugInterface {
	readonly activeDebugSession: DebugSession | undefined;
	readonly activeDebugConsole: DebugConsole;
	readonly breakpoints: readonly Breakpoint[];
	readonly onDidChangeActiveDebugSession: Event<DebugSession | undefined>;
	readonly onDidStartDebugSession: Event<DebugSession>;
	readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;
	readonly onDidTerminateDebugSession: Event<DebugSession>;
	readonly onDidChangeBreakpoints: Event<any>;
	readonly RegisterDebugConfigurationProvider: (
		type: string,
		provider: DebugConfigurationProvider,
		trigger: number,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
	readonly RegisterDebugAdapterDescriptorFactory: (
		type: string,
		factory: DebugAdapterDescriptorFactory,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
	readonly RegisterDebugAdapterTrackerFactory: (
		type: string,
		factory: DebugAdapterTrackerFactory,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
	readonly StartDebugging: (
		folder: WorkspaceFolder | undefined,
		nameOrConfig: string | DebugConfiguration,
		options?: DebugSessionOptions,
	) => Effect.Effect<boolean, StartDebuggingProblem>;
	readonly StopDebugging: (
		session?: DebugSession,
	) => Effect.Effect<void, Error>;
	readonly AddBreakpoints: (
		breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, never>;
	readonly RemoveBreakpoints: (
		breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, never>;
}

/**
 * @class DebugService
 * @description The `Effect.Service` for the Debug service.
 */
export class DebugService extends Effect.Service<DebugService>()(
	"Service/Debug",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			let HandleCounter = 0;

			const DebugStateRef = yield* Ref.make<DebuggerState>({
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
			});

			const { event: OnDidChangeActiveDebugSessionEvent } =
				CreateEventStream<DebugSession | undefined>();
			const { event: OnDidStartDebugSessionEvent } =
				CreateEventStream<DebugSession>();
			const { event: OnDidReceiveDebugSessionCustomEvent } =
				CreateEventStream<any>();
			const { event: OnDidTerminateDebugSessionEvent } =
				CreateEventStream<DebugSession>();
			const { event: OnDidChangeBreakpointsEvent } =
				CreateEventStream<any>();

			const RegisterProvider = <T extends ProviderEntry["Provider"]>(
				RegistryRef: Ref.Ref<Map<number, ProviderEntry>>,
				Data: Omit<ProviderEntry, "Provider"> & { Provider: T },
			) =>
				Effect.gen(function* () {
					const Handle = ++HandleCounter;
					yield* Ref.update(RegistryRef, (TheMap) =>
						TheMap.set(Handle, Data as unknown as ProviderEntry),
					);
					yield* IPC.SendNotification(
						"$registerDebugConfigurationProvider",
						[Handle, Data.Type],
					).pipe(
						Effect.mapError(
							(Cause) =>
								new DebugProviderRegistrationProblem({
									DebugType: Data.Type,
									Cause,
								}),
						),
					);
					const Cleanup = Ref.update(
						RegistryRef,
						(TheMap) => (TheMap.delete(Handle), TheMap),
					).pipe(
						Effect.andThen(
							IPC.SendNotification(
								"$unregisterDebugConfigurationProvider",
								[Handle],
							),
						),
					);
					return new Disposable(() => Effect.runFork(Cleanup));
				});

			const GetState = () => Ref.get(DebugStateRef);

			return {
				get activeDebugSession() {
					return Effect.runSync(GetState()).ActiveDebugSession;
				},
				get activeDebugConsole() {
					return Effect.runSync(GetState()).ActiveDebugConsole;
				},
				get breakpoints() {
					return Effect.runSync(GetState()).Breakpoints;
				},
				onDidChangeActiveDebugSession:
					OnDidChangeActiveDebugSessionEvent,
				onDidStartDebugSession: OnDidStartDebugSessionEvent,
				onDidReceiveDebugSessionCustomEvent:
					OnDidReceiveDebugSessionCustomEvent,
				onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent,
				onDidChangeBreakpoints: OnDidChangeBreakpointsEvent,

				RegisterDebugConfigurationProvider: (
					DebugType,
					Provider,
					_trigger,
					Extension,
				) =>
					RegisterProvider(
						Effect.runSync(GetState())
							.DebugConfigurationProviders as any,
						{ Type: DebugType, Provider, Extension },
					),
				RegisterDebugAdapterDescriptorFactory: (
					DebugType,
					Factory,
					Extension,
				) =>
					RegisterProvider(
						Effect.runSync(GetState())
							.DebugAdapterDescriptorFactories as any,
						{ Type: DebugType, Provider: Factory, Extension },
					),
				RegisterDebugAdapterTrackerFactory: (
					DebugType,
					Factory,
					Extension,
				) =>
					RegisterProvider(
						Effect.runSync(GetState())
							.DebugAdapterTrackerFactories as any,
						{ Type: DebugType, Provider: Factory, Extension },
					),

				StartDebugging: (Folder, NameOrConfiguration, Options) =>
					Effect.gen(function* () {
						yield* Effect.logInfo(
							`Request to start debugging in folder: ${Folder?.name ?? "None"}`,
							NameOrConfiguration,
						);
						const ConfigurationDTO =
							typeof NameOrConfiguration === "string"
								? { name: NameOrConfiguration }
								: NameOrConfiguration;
						const OptionsDTO = {
							parentSession: Options?.parentSession?.id,
							lifecycleManagedByParent:
								Options?.lifecycleManagedByParent,
						};
						const IsSuccess = yield* IPC.SendRequest<boolean>(
							"$startDebugging",
							[
								Folder?.uri.toJSON(),
								ConfigurationDTO,
								OptionsDTO,
							],
						);
						if (IsSuccess) {
							yield* Effect.logInfo(
								"Debug session started successfully.",
							);
						}
						return IsSuccess;
					}).pipe(
						Effect.mapError(
							(Cause) => new StartDebuggingProblem({ Cause }),
						),
					),

				StopDebugging: (Session) =>
					Effect.gen(function* () {
						const ActiveSession = (yield* Ref.get(DebugStateRef))
							.ActiveDebugSession;
						const SessionToStop = Session ?? ActiveSession;
						if (!SessionToStop) {
							return yield* Effect.logWarning(
								"StopDebugging called but no session is active.",
							);
						}
						yield* Effect.logInfo(
							`Request to stop debugging session: ${SessionToStop.id}`,
						);
						yield* IPC.SendNotification("$stopDebugging", [
							SessionToStop.id,
						]);
					}).pipe(
						Effect.mapError(
							(Cause) =>
								new Error("Failed to stop debugging session.", {
									cause: Cause,
								}),
						),
					),

				AddBreakpoints: (_Breakpoints) =>
					Effect.sync(() =>
						console.warn(
							"STUB: Debug.AddBreakpoints not implemented.",
						),
					),
				RemoveBreakpoints: (_Breakpoints) =>
					Effect.sync(() =>
						console.warn(
							"STUB: Debug.RemoveBreakpoints not implemented.",
						),
					),
			};
		}),
	},
) {}
