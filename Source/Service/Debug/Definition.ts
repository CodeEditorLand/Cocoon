/*
 * File: Cocoon/Source/Service/Debug/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-15 21:13:29 UTC
 * Dependency: ../../TypeConverter/Main.js, ../../Utility/CreateEventStream.js, ../IPC/Service.js, ./Error.js, ./RegisterProvider.js, ./Service.js, effect
 */

/**
 * @module Definition (Debug)
 * @description The live implementation of the Debug service.
 */

import { Effect, Ref } from "effect";
import type {
	Breakpoint,
	DebugConfiguration,
	DebugConsole,
	DebugSession,
	DebugSessionOptions,
	WorkspaceFolder,
} from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import { StartDebuggingError } from "./Error.js";
import RegisterProvider from "./RegisterProvider.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Debug service.
 */
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

	// --- RPC Handlers ---
	IPC.RegisterInvokeHandler(
		"$provideDebugConfigurations",
		([_Handle, _FolderDTO, _Token]) =>
			Effect.gen(function* () {
				// ... logic to find provider by handle, call it, and return DTOs ...
				return [];
			}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler(
		"$resolveDebugConfiguration",
		([_Handle, _FolderDTO, _ConfigDTO, _Token]) =>
			Effect.gen(function* () {
				// ... logic to find provider, call it, and return DTO ...
			}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler(
		"$createDebugAdapterDescriptor",
		([_Handle, _SessionDTO, _ExecutableDTO]) =>
			Effect.gen(function* () {
				// ... logic to find factory, call it, and return DTO ...
			}).pipe(Effect.runPromise),
	);

	// --- Service Implementation ---
	const DebugImplementation: Service["Type"] = {
		onDidChangeActiveDebugSession: OnDidChangeActiveDebugSessionEvent.event,
		onDidStartDebugSession: OnDidStartDebugSessionEvent.event,
		onDidReceiveDebugSessionCustomEvent:
			OnDidReceiveDebugSessionCustomEvent.event,
		onDidTerminateDebugSession: OnDidTerminateDebugSessionEvent.event,
		onDidChangeBreakpoints: OnDidChangeBreakpointsEvent.event,

		get activeDebugSession() {
			return Effect.runSync(Ref.get(ActiveSession));
		},
		get activeDebugConsole(): DebugConsole {
			throw new Error("activeDebugConsole not implemented.");
		},
		get breakpoints() {
			return [];
		},

		RegisterDebugConfigurationProvider: (Type, Provider, Extension) =>
			RegisterProvider(ConfigProviders, { Type, Provider, Extension }),

		RegisterDebugAdapterDescriptorFactory: (Type, Factory, Extension) =>
			RegisterProvider(DescriptorFactories, { Type, Factory, Extension }),

		RegisterDebugAdapterTrackerFactory: (Type, Factory, Extension) =>
			RegisterProvider(TrackerFactories, { Type, Factory, Extension }),

		StartDebugging: (
			Folder: WorkspaceFolder | undefined,
			Configuration: string | DebugConfiguration,
			Options?: DebugSessionOptions,
		) =>
			IPC.SendRequest<boolean>("$startDebugging", [
				Folder ? TypeConverter.URI.FromAPI(Folder.uri) : undefined,
				Configuration,
				Options,
			]).pipe(
				Effect.mapError((cause) => new StartDebuggingError({ cause })),
				Effect.map((Result) => !!Result),
			),

		StopDebugging: (Session?: DebugSession) =>
			IPC.SendNotification("$stopDebugging", [Session?.id]).pipe(
				Effect.mapError((cause) => new Error(String(cause))),
			),

		AddBreakpoints: (_Breakpoints: readonly Breakpoint[]) =>
			IPC.SendNotification("$addBreakpoints", [
				// Convert breakpoints to DTOs
			]).pipe(Effect.mapError((cause) => new Error(String(cause)))),

		RemoveBreakpoints: (_Breakpoints: readonly Breakpoint[]) =>
			IPC.SendNotification("$removeBreakpoints", [
				// Convert breakpoints to DTOs
			]).pipe(Effect.mapError((cause) => new Error(String(cause)))),
	};

	return DebugImplementation;
});
