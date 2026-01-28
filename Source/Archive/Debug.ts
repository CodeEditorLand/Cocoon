/**
 * @module Debug
 * @description Defines the service for managing debugging sessions, breakpoints,
 * and debug-related providers. It implements the `IExtHostDebug` interface from
 * VS Code for high fidelity.
 */

import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect, Ref } from "effect";
import {
	Disposable,
	type Breakpoint,
	type DebugAdapterDescriptorFactory,
	type DebugAdapterTrackerFactory,
	type DebugConfiguration,
	type DebugConfigurationProvider,
	type DebugConsole,
	type DebugSession,
	type DebugSessionCustomEvent,
	type DebugSessionOptions,
	type Event,
	type WorkspaceFolder,
} from "vscode";

import { DebugProviderRegistrationProblem } from "./Debug/DebugProviderRegistrationProblem.js";
import { StartDebuggingProblem } from "./Debug/StartDebuggingProblem.js";
import { IPCService } from "./IPC.js";
import { CreateEventStream } from "./Utility/EventStream.js";

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
 * @description The contract for the Debug service, mirroring `vscode.debug`.
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
	readonly registerDebugConfigurationProvider: (
		type: string,
		provider: DebugConfigurationProvider,
		trigger: number,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
	readonly registerDebugAdapterDescriptorFactory: (
		type: string,
		factory: DebugAdapterDescriptorFactory,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
	readonly registerDebugAdapterTrackerFactory: (
		type: string,
		factory: DebugAdapterTrackerFactory,
		extension: IExtensionDescription,
	) => Effect.Effect<Disposable, DebugProviderRegistrationProblem>;
	readonly startDebugging: (
		folder: WorkspaceFolder | undefined,
		nameOrConfig: string | DebugConfiguration,
		options?: DebugSessionOptions,
	) => Effect.Effect<boolean, StartDebuggingProblem>;
	readonly stopDebugging: (
		session?: DebugSession,
	) => Effect.Effect<void, Error>;
	readonly addBreakpoints: (
		breakpoints: readonly Breakpoint[],
	) => Effect.Effect<void, never>;
	readonly removeBreakpoints: (
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

			const DebugStateReference = yield* Ref.make<DebuggerState>({
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

			/**
			 * @description Registers a generic debug provider with the host.
			 * @returns An `Effect` that resolves to a `Disposable` for unregistering.
			 */
			const RegisterProvider = <T extends ProviderEntry["Provider"]>(
				RegistryReference: Ref.Ref<Map<number, ProviderEntry>>,
				Data: Omit<ProviderEntry, "Provider"> & { Provider: T },
			) =>
				Effect.gen(function* () {
					const Handle = ++HandleCounter;
					yield* Ref.update(RegistryReference, (TheMap) =>
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
					const CleanupEffect = Ref.update(
						RegistryReference,
						(TheMap) => (TheMap.delete(Handle), TheMap),
					).pipe(
						Effect.andThen(
							IPC.SendNotification(
								"$unregisterDebugConfigurationProvider",
								[Handle],
							),
						),
					);
					return new Disposable(() => Effect.runFork(CleanupEffect));
				});

			const GetState = () => Ref.get(DebugStateReference);

			const ServiceImplementation: DebugInterface = {
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

				registerDebugConfigurationProvider: (
					DebugType: string,
					Provider: DebugConfigurationProvider,
					_Trigger: number,
					Extension: IExtensionDescription,
				) =>
					RegisterProvider(
						Effect.runSync(GetState())
							.DebugConfigurationProviders as any, // Cast is acceptable here due to internal logic
						{ Type: DebugType, Provider, Extension },
					),
				registerDebugAdapterDescriptorFactory: (
					DebugType: string,
					Factory: DebugAdapterDescriptorFactory,
					Extension: IExtensionDescription,
				) =>
					RegisterProvider(
						Effect.runSync(GetState())
							.DebugAdapterDescriptorFactories as any, // Cast is acceptable here
						{ Type: DebugType, Provider: Factory, Extension },
					),
				registerDebugAdapterTrackerFactory: (
					DebugType: string,
					Factory: DebugAdapterTrackerFactory,
					Extension: IExtensionDescription,
				) =>
					RegisterProvider(
						Effect.runSync(GetState())
							.DebugAdapterTrackerFactories as any, // Cast is acceptable here
						{ Type: DebugType, Provider: Factory, Extension },
					),

				startDebugging: (
					Folder: WorkspaceFolder | undefined,
					NameOrConfiguration: string | DebugConfiguration,
					Options?: DebugSessionOptions,
				) =>
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

				stopDebugging: (Session?: DebugSession) =>
					Effect.gen(function* () {
						const ActiveSession = (yield* Ref.get(
							DebugStateReference,
						)).ActiveDebugSession;
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

				addBreakpoints: (Breakpoints: readonly Breakpoint[]) =>
					Effect.sync(() =>
						console.warn(
							"STUB: Debug.AddBreakpoints not implemented.",
							Breakpoints,
						),
					),
				removeBreakpoints: (Breakpoints: readonly Breakpoint[]) =>
					Effect.sync(() =>
						console.warn(
							"STUB: Debug.RemoveBreakpoints not implemented.",
							Breakpoints,
						),
					),
			};
			return ServiceImplementation;
		}),
	},
) {}
