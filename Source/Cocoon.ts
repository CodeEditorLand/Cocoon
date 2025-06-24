/**
 * @module Cocoon
 * @description Main Entry Point for the Cocoon Extension Host Process.
 * This file orchestrates the entire application startup sequence, including:
 * 1. Setting up the Node.js environment for VS Code compatibility.
 * 2. Composing the complete dependency injection container using the
 *    "Progressive World Build" pattern with Effect-TS Layers.
 * 3. Performing an initial handshake with the Mountain host process.
 * 4. Installing module interceptors (`require` and `import`).
 * 5. Activating all startup-designated extensions.
 * 6. Listening for and handling a graceful shutdown signal from the host.
 */

import { Effect, Layer, Deferred } from "effect";
import * as Path from "node:path";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";

// --- Service Imports (PascalCase) ---
import { APIDeprecationService } from "./APIDeprecation.js";
import { APIFactoryService } from "./APIFactory.js";
import { AuthenticationService } from "./Authentication.js";
import { CancellationService } from "./Cancellation.js";
import { ClipboardService } from "./Clipboard.js";
import { CommandService } from "./Command.js";
import { ConfigurationService } from "./Configuration.js";
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
import { WebViewPanelService } from "./WebViewPanel.js";
import { WindowService } from "./Window.js";
import { WorkSpaceService } from "./WorkSpace.js";
import { RunPatchProcess } from "./PatchProcess.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

// --- Placeholder Types ---
interface IExtensionHostInitData {
	readonly extensions: { readonly allExtensions: readonly any[] };
	readonly environment: any;
	readonly logLevel: any;
	readonly remote: any;
	readonly telemetryInfo: any;
	readonly uiKind: any;
	readonly quality: any;
	readonly workspace: any;
}

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
		Effect.runPromise(ShutdownEffect),
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

// --- Main Application Logic ---
const MainEffect = Effect.gen(function* () {
	// Level 0: Foundational Services (no dependencies on other app services)
	const L0_World = Layer.mergeAll(
		IPCConfigurationService.Default,
		CancellationService.Default,
	);

	// 1. Run pre-handshake with its minimal layer to get the init data.
	const InitializationData = yield* Effect.provide(
		PreHandshakeEffect,
		L0_World,
	);

	// 2. Create the runtime-dependent InitData layer.
	const InitDataLayer = Layer.succeed(InitDataService, InitializationData);

	// 3. Compose the final, complete application layer using the Progressive World Build pattern.
	const L1_Services = Layer.mergeAll(
		LoggerService.Default,
		IPCService.Default,
		ConfigurationService.Default,
		LanguageFeatureService.Default,
	);
	const L1_World = L1_Services.pipe(Layer.provide(L0_World));

	const L2_Services = Layer.mergeAll(ExtensionPathService.Default);
	const L2_World = Layer.merge(L1_World, L2_Services).pipe(
		Layer.provide(Layer.merge(L1_World, InitDataLayer)),
	);

	const L3_Services = Layer.mergeAll(
		APIDeprecationService.Default,
		HostKindPickerService.Default,
		NodeModuleShimService.Default,
	);
	const L3_World = Layer.merge(L2_World, L3_Services).pipe(
		Layer.provide(L2_World),
	);

	const L4_Services = Layer.mergeAll(
		ClipboardService.Default,
		DebugService.Default,
		DialogService.Default,
		DocumentService.Default,
		MessageService.Default,
		QuickInputService.Default,
		WebViewPanelService.Default,
		WindowService.Default,
		AuthenticationService.Default,
		FileSystemInformationService.Default,
		ProposedAPIService.Default,
		SecretStorageService.Default,
		StorageService.Default,
		TaskService.Default,
		TelemetryService.Default,
	);
	const L4_World = Layer.merge(L3_World, L4_Services).pipe(
		Layer.provide(L3_World),
	);

	const L5_Services = Layer.mergeAll(
		EnvironmentService.Default,
		FileSystemService.Default,
		CommandService.Default,
	);
	const L5_World = Layer.merge(L4_World, L5_Services).pipe(
		Layer.provide(L4_World),
	);

	const L6_Services = Layer.mergeAll(
		StoragePathService.Default,
		WorkSpaceService.Default,
		StatusBarService.Default,
		TreeViewService.Default,
	);
	const L6_World = Layer.merge(L5_World, L6_Services).pipe(
		Layer.provide(L5_World),
	);

	const L7_Services = Layer.mergeAll(ExtensionHostService.Default);
	const L7_World = Layer.merge(L6_World, L7_Services).pipe(
		Layer.provide(L6_World),
	);

	const L8_Services = Layer.mergeAll(ExtensionService.Default);
	const L8_World = Layer.merge(L7_World, L8_Services).pipe(
		Layer.provide(L7_World),
	);

	const L9_Services = Layer.mergeAll(APIFactoryService.Default);
	const L9_World = Layer.merge(L8_World, L9_Services).pipe(
		Layer.provide(L8_World),
	);

	const TopLevelServices = Layer.mergeAll(
		RequireInterceptorService.Default,
		ESMInterceptorService.Default,
	);
	const FinalApplicationLayer = Layer.merge(L9_World, TopLevelServices).pipe(
		Layer.provide(L9_World),
	);

	// 4. Run the main post-handshake logic with all dependencies now resolved.
	yield* Effect.provide(PostHandshakeEffect, FinalApplicationLayer);
}).pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
	Effect.provide(UtilityLayers),
	Effect.scoped,
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
