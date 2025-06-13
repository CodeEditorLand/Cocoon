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

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);

	// --- State and Event Emitters ---
	const ActiveSession = yield* _(
		Ref.make<DebugSession | undefined>(undefined),
	);
	const ConfigProviders = yield* _(Ref.make(new Map<number, any>()));
	const DescriptorFactories = yield* _(Ref.make(new Map<number, any>()));
	const TrackerFactories = yield* _(Ref.make(new Map<number, any>()));

	const OnDidChangeActiveDebugSessionEvent = CreateEventStream<any>();
	const OnDidStartDebugSessionEvent = CreateEventStream<any>();
	const OnDidReceiveDebugSessionCustomEvent = CreateEventStream<any>();
	const OnDidTerminateDebugSessionEvent = CreateEventStream<any>();
	const OnDidChangeBreakpointsEvent = CreateEventStream<any>();

	// --- RPC Handlers (for calls FROM Mountain) ---
	// These handlers call the provider methods registered by extensions.
	IPCService.RegisterInvokeHandler(
		"$provideDebugConfigurations",
		([handle, folderDTO, token]) =>
			Effect.gen(function* (_) {
				// ... logic to find provider by handle, call it, and return DTOs ...
			}).pipe(Effect.runPromise),
	);

	IPCService.RegisterInvokeHandler(
		"$resolveDebugConfiguration",
		([handle, folderDTO, configDTO, token]) =>
			Effect.gen(function* (_) {
				// ... logic to find provider, call it, and return DTO ...
			}).pipe(Effect.runPromise),
	);

	IPCService.RegisterInvokeHandler(
		"$createDebugAdapterDescriptor",
		([handle, sessionDTO, executableDTO]) =>
			Effect.gen(function* (_) {
				// ... logic to find factory, call it, and return DTO ...
			}).pipe(Effect.runPromise),
	);

	// ... other RPC handlers for adapter factories, trackers, and session events ...

	const ServiceImplementation: Interface = {
		// Events
		onDidChangeActiveDebugSession:
			OnDidChangeActiveDebugSessionEvent.Stream.pipe(Stream.toEvent),
		onDidStartDebugSession: OnDidStartDebugSessionEvent.Stream.pipe(
			Stream.toEvent,
		),
		onDidReceiveDebugSessionCustomEvent:
			OnDidReceiveDebugSessionCustomEvent.Stream.pipe(Stream.toEvent),
		onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.Stream.pipe(
			Stream.toEvent,
		),
		onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.Stream.pipe(
			Stream.toEvent,
		),

		// Properties
		get activeDebugSession() {
			return Ref.get(ActiveSession).pipe(Effect.runSync);
		},
		get activeDebugConsole() {
			// This would be managed by state from Mountain
			throw new Error("activeDebugConsole not implemented.");
		},
		get breakpoints() {
			// This would be managed by state from Mountain
			return [];
		},

		// Methods
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
					? TypeConverter.URIConverter.FromAPI(Folder.uri)
					: undefined,
				Configuration, // Needs DTO conversion
				Options, // Needs DTO conversion
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
