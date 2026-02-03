/**
 * @module Cocoon
 * @description Main Entry Point for the Cocoon Extension Host Process.
 * This version uses a corrected, granular layer composition to resolve
 * all dependency issues identified during debugging.
 */

import * as Path from "node:path";

import type { IExtensionHostInitData } from "@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Deferred, Effect, Layer } from "effect";

// --- Service Imports (PascalCase) ---
import { APIDeprecationService } from "./APIDeprecation.js";
import { APIFactoryService } from "./APIFactory.js";
import { ApplicationConfigurationService } from "./ApplicationConfiguration.js";
import { AuthenticationService } from "./Authentication.js";
import { CancellationService } from "./Cancellation.js";
import { ClipboardService } from "./Clipboard.js";
import { CommandService } from "./Command.js";
import { DebugService } from "./Debug.js";
import { DialogService } from "./Dialog.js";
import { DocumentService } from "./Document.js";
import { EnvironmentService } from "./Environment.js";
import { ESMInterceptorService } from "./ESMInterceptor.js";
import { ExtensionService } from "./Extension.js";
import { ExtensionHostService } from "./ExtensionHost.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { FileSystemService } from "./FileSystem.js";
import { FileSystemInformationService } from "./FileSystemInformation.js";
import { HostKindPickerService } from "./HostKindPicker.js";
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { LoggerService } from "./Logger.js";
import { MessageService } from "./Message.js";
import { NodeModuleShimService } from "./NodeModuleShim.js";
import { RunPatchProcess } from "./PatchProcess.js";
import { ProposedAPIService } from "./ProposedAPI.js";
import { QuickInputService } from "./QuickInput.js";
import { RequireInterceptorService } from "./RequireInterceptor.js";
import { SecretStorageService } from "./SecretStorage.js";
import { StatusBarService } from "./StatusBar.js";
import { StorageService } from "./Storage.js";
import { StoragePathService } from "./StoragePath.js";
import { TaskService } from "./Task.js";
import { TelemetryService } from "./Telemetry.js";
import { TreeViewService } from "./TreeView.js";
import { WebviewPanelService } from "./WebviewPanel.js";
import { WindowService } from "./Window.js";
import { WorkspaceService } from "./Workspace.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon" },
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);
const UtilityLayers = Layer.mergeAll(TracingLive, DevToolsLive);

// --- Effect Definitions ---
const PreHandshakeEffect = Effect.gen(function* () {
	const InitializationBarrier = yield* Deferred.make<
		IExtensionHostInitData,
		Error
	>();
	const IPC = yield* IPCService;

	IPC.RegisterInvokeHandler(
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
			process.exit(0);
		}),
	);

	IPC.RegisterInvokeHandler("$shutdown", () =>
		Effect.runPromise(
			Effect.provide(ShutdownEffect, LoggerService.Default),
		),
	);

	yield* IPC.SendNotification("$initialHandshake", []);
	return yield* Deferred.await(InitializationBarrier);
});

const PostHandshakeEffect = Effect.gen(function* () {
	yield* Effect.logInfo("Proceeding with full initialization...");
	yield* RunPatchProcess;

	const Interceptor = yield* RequireInterceptorService;
	yield* Interceptor.Install();
	yield* Effect.logInfo("Node.js require() interceptor installed.");

	const Host = yield* ExtensionHostService;
	yield* Host.ActivateById(
		"*" as any,
		{ startup: true, activationEvent: "*" } as any,
	);
	yield* Effect.logInfo("Startup extensions activated.");
	yield* Effect.logInfo("Cocoon is fully initialized and operational.");

	yield* Effect.addFinalizer(() =>
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
				Effect.logError("Error during extension deactivation.", Cause),
			),
		),
	);

	yield* Effect.never;
});

// --- Layer Composition (Corrected Pattern) ---
const composeAppLayer = (InitializationData: IExtensionHostInitData) => {
	// L0: Primitives and services with no dependencies.
	const L0_World = Layer.mergeAll(
		IPCConfigurationService.Default,
		CancellationService.Default,
		LoggerService.Default,
		Layer.succeed(InitDataService, InitializationData),
	);

	// L1: Base services that depend on L0.
	// We break the circular dependency by building TelemetryService in a later step.
	const L1_Services = Layer.mergeAll(
		IPCService.Default,
		ApplicationConfigurationService.Default,
		LanguageFeatureService.Default,
	);
	const L1_World = Layer.provide(L1_Services, L0_World);

	// L2: Services that depend on the now-built L1 services.
	const L2_Services = Layer.mergeAll(
		TelemetryService.Default, // Depends on IPCService and LoggerService from L1
		ExtensionPathService.Default,
		HostKindPickerService.Default,
		NodeModuleShimService.Default,
	);
	const L2_World = Layer.provide(
		L2_Services,
		Layer.merge(L0_World, L1_World),
	);

	// L3 and onwards, following the original working structure...
	const L3_Services = Layer.mergeAll(
		APIDeprecationService.Default,
		ClipboardService.Default,
		DialogService.Default,
		DocumentService.Default,
		MessageService.Default,
		QuickInputService.Default,
		ProposedAPIService.Default,
		SecretStorageService.Default,
		FileSystemInformationService.Default,
	);
	const L3_World = Layer.provide(L3_Services, L2_World);

	const L4_Services = Layer.mergeAll(
		TaskService.Default,
		AuthenticationService.Default,
	);
	const L4_World = Layer.provide(L4_Services, L3_World);

	const L5_Services = Layer.mergeAll(
		FileSystemService.Default,
		StorageService.Default,
	);
	const L5_World = Layer.provide(L5_Services, L4_World);

	const L6_Services = Layer.mergeAll(
		StoragePathService.Default,
		WindowService.Default,
	);
	const L6_World = Layer.provide(L6_Services, L5_World);

	const L7_Services = Layer.mergeAll(
		CommandService.Default,
		WorkspaceService.Default,
	);
	const L7_World = Layer.provide(L7_Services, L6_World);

	const L8_Services = Layer.mergeAll(
		DebugService.Default,
		StatusBarService.Default,
		TreeViewService.Default,
		WebviewPanelService.Default,
		EnvironmentService.Default,
		ExtensionHostService.Default,
	);
	const L8_World = Layer.provide(L8_Services, L7_World);

	const L9_Services = Layer.mergeAll(ExtensionService.Default);
	const L9_World = Layer.provide(L9_Services, L8_World);

	const L10_Services = Layer.mergeAll(APIFactoryService.Default);
	const L10_World = Layer.provide(L10_Services, L9_World);

	const TopLevelServices = Layer.mergeAll(
		RequireInterceptorService.Default,
		ESMInterceptorService.Default,
	);
	return Layer.provide(TopLevelServices, L10_World);
};

// --- Main Application Logic ---
const AppEffectWithRequirements = Effect.gen(function* () {
	// 1. Run pre-handshake with its minimal layer.
	const PreHandshakeLayer = Layer.provide(
		IPCService.Default,
		Layer.mergeAll(
			IPCConfigurationService.Default,
			CancellationService.Default,
			LoggerService.Default,
		),
	);
	const InitializationData = yield* Effect.provide(
		PreHandshakeEffect,
		PreHandshakeLayer,
	);

	// 2. Compose the final, complete application layer.
	const FinalApplicationLayer = composeAppLayer(InitializationData);

	// 3. Run the main post-handshake logic with all dependencies provided.
	yield* Effect.provide(PostHandshakeEffect, FinalApplicationLayer);
}).pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
);

// The only remaining dependency for the entire AppEffect is the LoggerService
// needed by the `catchAllCause` handler.
const FinalLayer = Layer.mergeAll(UtilityLayers, LoggerService.Default);

// Provide the final layer to the *entire* application logic at once.
// This resolves all requirements, resulting in an executable effect.
const ExecutableMainEffect = Effect.provide(
	AppEffectWithRequirements,
	FinalLayer,
).pipe(Effect.scoped);

// --- Run the Application ---
NodeRuntime.runMain(ExecutableMainEffect);
