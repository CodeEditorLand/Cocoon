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
import { APIDeprecation } from "./APIDeprecation.js";
import { APIFactory } from "./APIFactory.js";
import { Authentication } from "./Authentication.js";
import { Cancellation } from "./Cancellation.js";
import { Clipboard } from "./Clipboard.js";
import { Command } from "./Command.js";
import { Configuration } from "./Configuration.js";
import { Debug } from "./Debug.js";
import { Dialog } from "./Dialog.js";
import { Document } from "./Document.js";
import { Environment } from "./Environment.js";
import { ESMInterceptor } from "./ESMInterceptor.js";
import { Extension } from "./Extension.js";
import { ExtensionHost } from "./ExtensionHost.js";
import { ExtensionPath } from "./ExtensionPath.js";
import { FileSystem } from "./FileSystem.js";
import { FileSystemInformation } from "./FileSystemInformation.js";
import { HostKindPicker } from "./HostKindPicker.js";
import { InitData } from "./InitData.js";
import { IPC } from "./IPC.js";
import { IPCConfiguration } from "./IPCConfiguration.js";
import { LanguageFeature } from "./LanguageFeature.js";
import { Logger } from "./Logger.js";
import { Message } from "./Message.js";
import { NodeModuleShim } from "./NodeModuleShim.js";
import { ProposedAPI } from "./ProposedAPI.js";
import { QuickInput } from "./QuickInput.js";
import { RequireInterceptor } from "./RequireInterceptor.js";
import { SecretStorage } from "./SecretStorage.js";
import { StatusBar } from "./StatusBar.js";
import { Storage } from "./Storage.js";
import { StoragePath } from "./StoragePath.js";
import { Task } from "./Task.js";
import { Telemetry } from "./Telemetry.js";
import { TreeView } from "./TreeView.js";
import { WebViewPanel } from "./WebViewPanel.js";
import { Window } from "./Window.js";
import { Workspace } from "./Workspace.js";
import { RunPatchProcess } from "./PatchProcess.js";

// --- Pre-initialization Steps ---
const VscodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VscodeOutputDirectory);

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
	const IPCService = yield* IPC;

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
			process.exit(0);
		}),
	);
	IPCService.RegisterInvokeHandler("$shutdown", () =>
		Effect.runPromise(ShutdownEffect),
	);

	yield* IPCService.SendNotification("$initialHandshake", []);
	return yield* Deferred.await(InitializationBarrier);
});

const PostHandshakeEffect = Effect.gen(function* () {
	yield* Effect.logInfo("Proceeding with full initialization...");
	yield* RunPatchProcess;

	const Interceptor = yield* RequireInterceptor;
	yield* Interceptor.Install();
	yield* Effect.logInfo("Node.js require() interceptor installed.");

	const Host = yield* ExtensionHost;
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
		IPCConfiguration.Default,
		Cancellation.Default,
	);

	// 1. Run pre-handshake with its minimal layer to get the init data.
	const InitializationData = yield* Effect.provide(
		PreHandshakeEffect,
		L0_World,
	);

	// 2. Create the runtime-dependent InitData layer.
	const InitDataLayer = Layer.succeed(InitData, InitializationData);

	// 3. Compose the final, complete application layer using the Progressive World Build pattern.
	const L1_Services = Layer.mergeAll(
		Logger.Default,
		IPC.Default,
		Configuration.Default,
		LanguageFeature.Default,
	);
	const L1_World = L1_Services.pipe(Layer.provide(L0_World));

	const L2_Services = Layer.mergeAll(ExtensionPath.Default);
	const L2_World = Layer.merge(L1_World, L2_Services).pipe(
		Layer.provide(Layer.merge(L1_World, InitDataLayer)),
	);

	const L3_Services = Layer.mergeAll(
		APIDeprecation.Default,
		HostKindPicker.Default,
		NodeModuleShim.Default,
	);
	const L3_World = Layer.merge(L2_World, L3_Services).pipe(
		Layer.provide(L2_World),
	);

	const L4_Services = Layer.mergeAll(
		Clipboard.Default,
		Debug.Default,
		Dialog.Default,
		Document.Default,
		Message.Default,
		QuickInput.Default,
		WebViewPanel.Default,
		Window.Default,
		Authentication.Default,
		FileSystemInformation.Default,
		ProposedAPI.Default,
		SecretStorage.Default,
		Storage.Default,
		Task.Default,
		Telemetry.Default,
	);
	const L4_World = Layer.merge(L3_World, L4_Services).pipe(
		Layer.provide(L3_World),
	);

	const L5_Services = Layer.mergeAll(
		Environment.Default,
		FileSystem.Default,
		Command.Default,
	);
	const L5_World = Layer.merge(L4_World, L5_Services).pipe(
		Layer.provide(L4_World),
	);

	const L6_Services = Layer.mergeAll(
		StoragePath.Default,
		Workspace.Default,
		StatusBar.Default,
		TreeView.Default,
	);
	const L6_World = Layer.merge(L5_World, L6_Services).pipe(
		Layer.provide(L5_World),
	);

	const L7_Services = Layer.mergeAll(ExtensionHost.Default);
	const L7_World = Layer.merge(L6_World, L7_Services).pipe(
		Layer.provide(L6_World),
	);

	const L8_Services = Layer.mergeAll(Extension.Default);
	const L8_World = Layer.merge(L7_World, L8_Services).pipe(
		Layer.provide(L7_World),
	);

	const L9_Services = Layer.mergeAll(APIFactory.Default);
	const L9_World = Layer.merge(L8_World, L9_Services).pipe(
		Layer.provide(L8_World),
	);

	const TopLevelServices = Layer.mergeAll(
		RequireInterceptor.Default,
		ESMInterceptor.Default,
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
