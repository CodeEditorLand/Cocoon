/*
 * File: Cocoon/Source/Cocoon.ts
 * Responsibility: The main entry point and composition root for the Cocoon application.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./Core/ExtensionHost/Service.js, ./Core/RequireInterceptor/Service.js, ./PatchProcess.js, ./Service/IPC.js, ./Service/IPC/Configuration.js, ./Service/IPC/Service.js, ./Service/InitData/Live.js, @effect/platform-node, effect, node:path, vs/workbench/services/extensions/common/extensionHostProtocol.js
 */

import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer, Logger } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- Consolidated Imports via Barrel Files ---
import * as Core from "./Core.js";
import RunProcessPatch from "./PatchProcess.js";
import * as Services from "./Service.js";
import {
	IPCConfigurationService,
	type IPCConfiguration,
} from "./Service/IPC/Configuration.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

/**
 * The main logic that runs *after* the initial handshake with the host is complete.
 * This effect declares dependencies on all services required for the application's
 * full functionality.
 */
const PostHandshakeEffect = Effect.gen(function* (G) {
	yield* G(Effect.logInfo("Proceeding with full initialization..."));

	yield* G(RunProcessPatch);

	const Interceptor = yield* G(Core.RequireInterceptorService);
	yield* G(Interceptor.Install());
	yield* G(Effect.logInfo("Node.js require() interceptor installed."));

	const Host = yield* G(Core.ExtensionHostService);
	yield* G(
		Host.ActivateById(
			"*" as any,
			{ startup: true, activationEvent: "*" } as any,
		),
	);

	yield* G(Effect.logInfo("Startup extensions activated."));
	yield* G(Effect.logInfo("Cocoon is fully initialized and operational."));

	// Keep the program alive indefinitely.
	yield* G(Effect.never);
});

/**
 * The logic that runs *before* the main application can be initialized.
 * It has minimal dependencies and is responsible for establishing communication
 * and receiving the initial data payload from the host.
 * @returns An `Effect` that resolves with the `IExtensionHostInitData`.
 */
const PreHandshakeEffect = Effect.gen(function* (G) {
	const InitializationBarrier = yield* G(
		Deferred.make<IExtensionHostInitData, Error>(),
	);
	const IPC = yield* G(Services.IPCService);

	// Register the handler that receives the initialization data.
	// Upon receiving the data, it succeeds the Deferred, unblocking the main flow.
	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitializationData: IExtensionHostInitData): Promise<void> =>
			Effect.runPromise(
				Deferred.succeed(
					InitializationBarrier,
					InitializationData,
				).pipe(Effect.asVoid),
			),
	);

	// Send the handshake notification and then wait for the barrier.
	yield* G(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));
	yield* G(IPC.SendNotification("$initialHandshake", []));
	const InitializationData = yield* G(Deferred.await(InitializationBarrier));
	yield* G(Effect.logInfo("Cocoon handshake complete."));

	return InitializationData;
});

/**
 * The main entry point for the entire application.
 * It orchestrates the pre-handshake and post-handshake logic, composing all
 * layers correctly.
 */
const MainEffect = Effect.gen(function* (G) {
	// Step 1: Run the pre-handshake logic to get runtime initialization data.
	const InitializationData = yield* G(PreHandshakeEffect);

	// Step 2: Define the complete application layer by merging all service layers.
	const ApplicationLayer = Layer.mergeAll(
		Core.APIFactoryLive,
		Core.ESMInterceptorLive,
		Core.ExtensionHostLive,
		Core.ExtensionPathLive,
		Core.HostKindPickerLive,
		Core.NodeModuleShimLive,
		Core.RequireInterceptorLive,
		Services.APIDeprecationLive,
		Services.AuthenticationLive,
		Services.CancellationLive,
		Services.ClipboardLive,
		Services.CommandLive,
		Services.ConfigurationLive,
		Services.DebugLive,
		Services.DiagnosticLive,
		Services.DialogLive,
		Services.DocumentLive,
		Services.EnvironmentLive,
		Services.ExtensionLive,
		Services.FileSystemLive,
		Services.FileSystemInformationLive,
		Services.IPCLive,
		Services.LanguageFeatureLive,
		Services.LocalizationLive,
		Services.LogLive,
		Services.MessageLive,
		Services.ProposedAPILive,
		Services.QuickInputLive,
		Services.SecretStorageLive,
		Services.StatusBarLive,
		Services.StorageLive,
		Services.StoragePathLive,
		Services.TaskLive,
		Services.TelemetryLive,
		Services.TreeViewLive,
		Services.WebViewPanelLive,
		Services.WindowLive,
		Services.WorkSpaceLive,
	);

	// Step 3: Create the layer for the runtime-dependent InitData.
	const InitDataLayer = Services.InitDataLive(InitializationData);

	// Step 4: Create the final, fully-resolved layer by providing the
	// runtime data layer to the main application layer.
	const FinalApplicationLayer = ApplicationLayer.pipe(
		Layer.provide(InitDataLayer),
	);

	// Step 5: Run the main application logic, providing it with the complete layer.
	// This resolves all of its dependencies.
	yield* G(PostHandshakeEffect.pipe(Layer.provide(FinalApplicationLayer)));
}).pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
);

// --- Application Layer Composition for Pre-Handshake ---

// Define the static configuration needed before the handshake.
const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
};

// Create a layer for the static IPC configuration.
const ConfigurationLayer = Layer.succeed(
	IPCConfigurationService,
	ApplicationConfiguration,
);

// The layer needed for the initial handshake only requires IPC and a logger.
const PreHandshakeDependencies = Layer.merge(
	ConfigurationLayer,
	Logger.logFmt, // Use a default formatted logger.
);
const PreHandshakeLayer = Services.IPCLive.pipe(
	Layer.provide(PreHandshakeDependencies),
);

// --- Run the Application ---

// Provide the minimal pre-handshake layer to the main effect.
// The main effect will then build and provide the rest of the layers internally.
const RunnableApplication = MainEffect.pipe(
	Layer.provide(PreHandshakeLayer),
	Effect.scoped, // Ensure all scoped services are properly finalized on exit.
);

NodeRuntime.runMain(RunnableApplication);
