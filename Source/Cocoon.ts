/*
 * File: Cocoon/Source/Cocoon.ts
 * Role: Main Entry Point for the Cocoon Extension Host Process
 * Responsibilities:
 *   1. Sets up the Node.js environment and module paths for VS Code compatibility.
 *   2. Composes the entire application's dependency injection container using the
 *      "Progressive World Build" pattern with Effect-TS Layers.
 *   3. Orchestrates the startup sequence:
 *      - Performs an initial handshake with the Mountain host process to get init data.
 *      - Installs module interceptors (`require` and `import`).
 *      - Activates all startup-designated extensions.
 *   4. Listens for and handles a graceful shutdown signal from the host.
 */

import * as Path from "node:path";
import { DevTools } from "@effect/experimental";
import { NodeRuntime } from "@effect/platform-node";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Deferred, Effect, Layer, Logger } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- Service Imports (using the new `PascalCase` service names) ---
import { APIFactory, Live as APIFactoryLive } from "./Core/APIFactory/mod.js";
import {
	ESMInterceptor,
	Live as ESMInterceptorLive,
} from "./Core/ESMInterceptor/mod.js";
import {
	ExtensionHost,
	Live as ExtensionHostLive,
} from "./Core/ExtensionHost/mod.js";
import {
	ExtensionPath,
	Live as ExtensionPathLive,
} from "./Core/ExtensionPath/mod.js";
import {
	HostKindPicker,
	Live as HostKindPickerLive,
} from "./Core/HostKindPicker/mod.js";
import {
	NodeModuleShim,
	Live as NodeModuleShimLive,
} from "./Core/NodeModuleShim/mod.js";
import {
	RequireInterceptor,
	Live as RequireInterceptorLive,
} from "./Core/RequireInterceptor/mod.js";
import { RunProcessPatch } from "./PatchProcess.js";
import {
	APIDeprecation,
	Live as APIDeprecationLive,
} from "./Service/APIDeprecation/mod.js";
import {
	Authentication,
	Live as AuthenticationLive,
} from "./Service/Authentication/mod.js";
import {
	Cancellation,
	Live as CancellationLive,
} from "./Service/Cancellation/mod.js";
import { Clipboard, Live as ClipboardLive } from "./Service/Clipboard/mod.js";
import { Command, Live as CommandLive } from "./Service/Command/mod.js";
import {
	Configuration,
	Live as ConfigurationLive,
} from "./Service/Configuration/mod.js";
import { Debug, Live as DebugLive } from "./Service/Debug/mod.js";
import {
	Diagnostic,
	Live as DiagnosticLive,
} from "./Service/Diagnostic/mod.js";
import { Dialog, Live as DialogLive } from "./Service/Dialog/mod.js";
import { Document, Live as DocumentLive } from "./Service/Document/mod.js";
import {
	Environment,
	Live as EnvironmentLive,
} from "./Service/Environment/mod.js";
import { Extension, Live as ExtensionLive } from "./Service/Extension/mod.js";
import {
	FileSystem,
	Live as FileSystemLive,
} from "./Service/FileSystem/mod.js";
import {
	FileSystemInformation,
	Live as FileSystemInformationLive,
} from "./Service/FileSystemInformation/mod.js";
import { InitData, Live as InitDataLive } from "./Service/InitData/mod.js";
import {
	Configuration as IPCConfiguration,
	IPC,
	Live as IPCLive,
} from "./Service/IPC/mod.js";
import {
	LanguageFeature,
	Live as LanguageFeatureLive,
} from "./Service/LanguageFeature/mod.js";
import {
	Localization,
	Live as LocalizationLive,
} from "./Service/Localization/mod.js";
import { Logger, Live as LoggerLive } from "./Service/Log/mod.js";
import { Message, Live as MessageLive } from "./Service/Message/mod.js";
import {
	ProposedAPI,
	Live as ProposedAPILive,
} from "./Service/ProposedAPI/mod.js";
import {
	QuickInput,
	Live as QuickInputLive,
} from "./Service/QuickInput/mod.js";
import {
	SecretStorage,
	Live as SecretStorageLive,
} from "./Service/SecretStorage/mod.js";
import { StatusBar, Live as StatusBarLive } from "./Service/StatusBar/mod.js";
import { Storage, Live as StorageLive } from "./Service/Storage/mod.js";
import {
	StoragePath,
	Live as StoragePathLive,
} from "./Service/StoragePath/mod.js";
import { Task, Live as TaskLive } from "./Service/Task/mod.js";
import { Telemetry, Live as TelemetryLive } from "./Service/Telemetry/mod.js";
import { TreeView, Live as TreeViewLive } from "./Service/TreeView/mod.js";
import {
	WebViewPanel,
	Live as WebViewPanelLive,
} from "./Service/WebViewPanel/mod.js";
import { Window, Live as WindowLive } from "./Service/Window/mod.js";
import { Workspace, Live as WorkspaceLive } from "./Service/WorkSpace/mod.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);
const UtilityLayers = Layer.merge(TracingLive, DevToolsLive);

// --- Hierarchical Layer Composition (Progressive World Build) ---

// Level 1: Core Infrastructure Layer (zero or minimal dependencies)
const L1_World = Layer.mergeAll(
	Layer.succeed(IPCConfiguration, {
		MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
		CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
	}),
	Logger.logFmt, // Use logFmt for structured logging
	CancellationLive,
).pipe(Layer.provide(IPCLive));

// Level 2: Core Services Layer
const L2_Services = Layer.mergeAll(
	LoggerLive,
	TelemetryLive,
	NodeModuleShimLive,
	RequireInterceptorLive,
	ESMInterceptorLive,
	ExtensionPathLive,
	HostKindPickerLive,
);
const L2_World = Layer.provide(L2_Services, L1_World);

// Level 3: Application Services Layer
const L3_Services = Layer.mergeAll(
	APIDeprecationLive,
	AuthenticationLive,
	ClipboardLive,
	CommandLive,
	ConfigurationLive,
	DebugLive,
	DiagnosticLive,
	DialogLive,
	DocumentLive,
	EnvironmentLive,
	ExtensionLive,
	FileSystemLive,
	FileSystemInformationLive,
	LanguageFeatureLive,
	LocalizationLive,
	MessageLive,
	ProposedAPILive,
	QuickInputLive,
	SecretStorageLive,
	StatusBarLive,
	StorageLive,
	StoragePathLive,
	TaskLive,
	TreeViewLive,
	WebViewPanelLive,
	WindowLive,
	WorkspaceLive,
);
const L3_World = Layer.provide(L3_Services, L2_World);

// Level 4: Top-Level Business Logic Layer
const TopLevelLayer = Layer.mergeAll(APIFactoryLive, ExtensionHostLive);
const TopLevelWorld = Layer.provide(TopLevelLayer, L3_World);

// --- Effect Definitions ---

const PreHandshakeEffect = Effect.gen(function* (Generator) {
	const InitializationBarrier = yield* Generator(
		Deferred.make<IExtensionHostInitData, Error>(),
	);
	const IPCService = yield* Generator(IPC);

	IPCService.RegisterInvokeHandler(
		"initExtensionHost",
		(Data: IExtensionHostInitData) =>
			Effect.runPromise(
				Deferred.succeed(InitializationBarrier, Data).pipe(
					Effect.asVoid,
				),
			),
	);

	const ShutdownEffect = Effect.logInfo(
		"[Cocoon] Received shutdown signal from Mountain.",
	).pipe(
		Effect.andThen(() => {
			// This will trigger the `beforeExit` hook that NodeRuntime registers,
			// running finalizers for the main fiber's scope.
			process.exit(0);
		}),
	);
	IPCService.RegisterInvokeHandler("$shutdown", () =>
		Effect.runPromise(ShutdownEffect),
	);

	yield* Generator(IPCService.SendNotification("$initialHandshake", []));
	return yield* Generator(Deferred.await(InitializationBarrier));
});

const PostHandshakeEffect = Effect.gen(function* (Generator) {
	yield* Generator(Effect.logInfo("Proceeding with full initialization..."));
	yield* Generator(RunProcessPatch);

	const Interceptor = yield* Generator(RequireInterceptor);
	yield* Generator(Interceptor.Install());
	yield* Generator(
		Effect.logInfo("Node.js require() interceptor installed."),
	);

	const Host = yield* Generator(ExtensionHost);
	yield* Generator(
		Host.ActivateById(
			"*" as any,
			{
				startup: true,
				activationEvent: "*",
			} as any,
		),
	);
	yield* Generator(Effect.logInfo("Startup extensions activated."));

	yield* Generator(
		Effect.logInfo("Cocoon is fully initialized and operational."),
	);

	yield* Generator(
		Effect.addFinalizer(() =>
			Effect.logInfo(
				"Cocoon is shutting down. Deactivating all extensions...",
			).pipe(
				Effect.andThen(Host.DeactivateAll()),
				Effect.andThen(
					Effect.logInfo(
						"All extensions deactivated. Graceful shutdown complete.",
					),
				),
				Effect.catchAllCause((Cause) =>
					Effect.logError(
						"Error during extension deactivation.",
						Cause,
					),
				),
			),
		),
	);

	yield* Generator(Effect.never);
});

// --- Main Application Logic ---

const MainEffect = Effect.gen(function* (Generator) {
	// 1. Run pre-handshake with its minimal layer to get the init data.
	const InitializationData = yield* Generator(
		Effect.provide(PreHandshakeEffect, L1_World),
	);

	// 2. Create the runtime-dependent InitData layer.
	const InitDataLayer = InitDataLive(InitializationData);

	// 3. Compose the final, complete layer for the post-handshake logic.
	const FinalApplicationLayer = Layer.provide(TopLevelWorld, InitDataLayer);

	// 4. Run the main post-handshake logic with all dependencies now resolved.
	yield* Generator(
		Effect.provide(PostHandshakeEffect, FinalApplicationLayer),
	);
}).pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
	Effect.provide(UtilityLayers),
	Effect.scoped,
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
