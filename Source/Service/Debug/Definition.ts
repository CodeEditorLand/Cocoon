/**
 * @module Definition (Debug)
 * @description The live implementation of the Debug service.
 */

import { Context, Effect, Ref } from "effect";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import RegisterProvider from "./RegisterProvider.js";
import type Service from "./Service.js";
import type { DebugSession } from "./Type.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;

	const ActiveSession = yield* Ref.make<DebugSession | undefined>(undefined);
	const ConfigProviders = yield* Ref.make(new Map<number, any>());
	const DescriptorFactories = yield* Ref.make(new Map<number, any>());
	const TrackerFactories = yield* Ref.make(new Map<number, any>());

	const OnDidChangeActiveDebugSessionEvent = CreateEventStream<any>();
	const OnDidStartDebugSessionEvent = CreateEventStream<any>();
	const OnDidReceiveDebugSessionCustomEvent = CreateEventStream<any>();
	const OnDidTerminateDebugSessionEvent = CreateEventStream<any>();
	const OnDidChangeBreakpointsEvent = CreateEventStream<any>();

	IPC.RegisterInvokeHandler(
		"$provideDebugConfigurations",
		([handle, folderDTO, token]) =>
			Effect.gen(function* () {
				// ... logic to find provider by handle, call it, and return DTOs ...
			}),
	);

	IPC.RegisterInvokeHandler(
		"$resolveDebugConfiguration",
		([handle, folderDTO, configDTO, token]) =>
			Effect.gen(function* () {
				// ... logic to find provider, call it, and return DTO ...
			}),
	);

	IPC.RegisterInvokeHandler(
		"$createDebugAdapterDescriptor",
		([handle, sessionDTO, executableDTO]) =>
			Effect.gen(function* () {
				// ... logic to find factory, call it, and return DTO ...
			}),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
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
				IPC,
				"$registerDebugConfigurationProvider",
				{
					Type,
					Provider,
					Extension,
				},
			),

		RegisterDebugAdapterDescriptorFactory: (Type, Factory, Extension) =>
			RegisterProvider(
				DescriptorFactories,
				IPC,
				"$registerDebugAdapterDescriptorFactory",
				{ Type, Factory, Extension },
			),

		RegisterDebugAdapterTrackerFactory: (Type, Factory, Extension) =>
			RegisterProvider(
				TrackerFactories,
				IPC,
				"$registerDebugAdapterTrackerFactory",
				{ Type, Factory, Extension },
			),

		StartDebugging: (Folder, Configuration, Options) =>
			IPC.SendRequest<boolean>("$startDebugging", [
				Folder ? TypeConverter.URI.FromAPI(Folder.uri) : undefined,
				Configuration,
				Options,
			]).pipe(Effect.map((result) => !!result)),

		StopDebugging: (Session) =>
			IPC.SendNotification("$stopDebugging", [Session?.id]),

		AddBreakpoints: (Breakpoints) =>
			IPC.SendNotification("$addBreakpoints", [
				// Convert breakpoints to DTOs
			]),

		RemoveBreakpoints: (Breakpoints) =>
			IPC.SendNotification("$removeBreakpoints", [
				// Convert breakpoints to DTOs
			]),
	};

	return ServiceImplementation;
});
