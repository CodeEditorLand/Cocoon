/**
 * @module Definition (Debug)
 * @description The live implementation of the Debug service.
 */

import { Effect, Ref, Stream } from "effect";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { RegisterProvider } from "./RegisterProvider.js";
import type { Interface } from "./Service.js";
import type {
	Breakpoint,
	DebugAdapterDescriptorFactory,
	DebugAdapterTrackerFactory,
	DebugConfigurationProvider,
	DebugSession,
	DebugSessionOptions,
	WorkspaceFolder,
} from "./Type.js";

export const Definition = Effect.gen(function* () {
	const IPCService = yield* IPC.Tag;

	const ActiveSession = yield* Ref.make<DebugSession | undefined>(undefined);
	const ConfigProviders = yield* Ref.make(new Map<number, any>());
	const DescriptorFactories = yield* Ref.make(new Map<number, any>());
	const TrackerFactories = yield* Ref.make(new Map<number, any>());

	const OnDidChangeActiveDebugSessionEvent = CreateEventStream<any>();
	const OnDidStartDebugSessionEvent = CreateEventStream<any>();
	const OnDidReceiveDebugSessionCustomEvent = CreateEventStream<any>();
	const OnDidTerminateDebugSessionEvent = CreateEventStream<any>();
	const OnDidChangeBreakpointsEvent = CreateEventStream<any>();

	IPCService.RegisterInvokeHandler(
		"$provideDebugConfigurations",
		([handle, folderDTO, token]) =>
			Effect.gen(function* () {
				// ... logic to find provider by handle, call it, and return DTOs ...
			}),
	);

	IPCService.RegisterInvokeHandler(
		"$resolveDebugConfiguration",
		([handle, folderDTO, configDTO, token]) =>
			Effect.gen(function* () {
				// ... logic to find provider, call it, and return DTO ...
			}),
	);

	IPCService.RegisterInvokeHandler(
		"$createDebugAdapterDescriptor",
		([handle, sessionDTO, executableDTO]) =>
			Effect.gen(function* () {
				// ... logic to find factory, call it, and return DTO ...
			}),
	);

	const ServiceImplementation: Interface = {
		onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent.event,
		onDidStartDebugSession: OnDidStartDebugSessionEvent.event,
		onDidReceiveDebugSessionCustomEvent:
			OnDidReceiveDebugSessionCustomEvent.event,
		onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.event,
		onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.event,

		get activeDebugSession() {
			return Effect.runSync(Ref.get(ActiveSession));
		},
		get activeDebugConsole() {
			throw new Error("activeDebugConsole not implemented.");
		},
		get breakpoints() {
			return [];
		},

		RegisterDebugConfigurationProvider: (Type, Provider, Extension) =>
			RegisterProvider(
				ConfigProviders,
				IPCService,
				"$registerDebugConfigurationProvider",
				{ Type, Provider, Extension },
			),

		RegisterDebugAdapterDescriptorFactory: (Type, Factory, Extension) =>
			RegisterProvider(
				DescriptorFactories,
				IPCService,
				"$registerDebugAdapterDescriptorFactory",
				{ Type, Factory, Extension },
			),

		RegisterDebugAdapterTrackerFactory: (Type, Factory, Extension) =>
			RegisterProvider(
				TrackerFactories,
				IPCService,
				"$registerDebugAdapterTrackerFactory",
				{ Type, Factory, Extension },
			),

		StartDebugging: (Folder, Configuration, Options) =>
			IPCService.SendRequest<boolean>("$startDebugging", [
				Folder
					? TypeConverter.URIConverter.fromAPI(Folder.uri)
					: undefined,
				Configuration,
				Options,
			]).pipe(Effect.map((result) => !!result)),

		StopDebugging: (Session) =>
			IPCService.SendNotification("$stopDebugging", [Session?.id]),

		AddBreakpoints: (Breakpoints) =>
			IPCService.SendNotification("$addBreakpoints", [
				// Convert breakpoints to DTOs
			]),

		RemoveBreakpoints: (Breakpoints) =>
			IPCService.SendNotification("$removeBreakpoints", [
				// Convert breakpoints to DTOs
			]),
	};

	return ServiceImplementation;
});
