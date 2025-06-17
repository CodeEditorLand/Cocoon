/*
 * File: Cocoon/Source/Cocoon.ts
 * Responsibility: The main entry point and composition root for the Cocoon application.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./Core/ExtensionHost/Service.js, ./Core/RequireInterceptor/Service.js, ./PatchProcess.js, ./Service/IPC.js, ./Service/IPC/Configuration.js, ./Service/IPC/Service.js, ./Service/InitData/Live.js, @effect/platform-node, effect, node:path, vs/workbench/services/extensions/common/extensionHostProtocol.js
 */

import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Deferred, Effect, Exit, Layer, Logger } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- Core Service Layer Imports ---
import { Live as APIFactoryLive } from "./Core/APIFactory.js";
import { Live as ESMInterceptorLive } from "./Core/ESMInterceptor.js";
import { Live as ExtensionHostLive } from "./Core/ExtensionHost.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import { Live as ExtensionPathLive } from "./Core/ExtensionPath.js";
import { Live as HostKindPickerLive } from "./Core/HostKindPicker.js";
import { Live as NodeModuleShimLive } from "./Core/NodeModuleShim.js";
import { Live as RequireInterceptorLive } from "./Core/RequireInterceptor.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
// --- Process Patch Import ---
import RunProcessPatch from "./PatchProcess.js";
// --- API Service Layer Imports ---
import { APIDeprecationLive } from "./Service/APIDeprecation.js";
import { Live as AuthenticationLive } from "./Service/Authentication.js";
import { Live as CancellationLive } from "./Service/Cancellation.js";
import { Live as ClipboardLive } from "./Service/Clipboard.js";
import { Live as CommandLive } from "./Service/Command.js";
import { Live as ConfigurationLive } from "./Service/Configuration.js";
import { Live as DebugLive } from "./Service/Debug.js";
import { Live as DiagnosticLive } from "./Service/Diagnostic.js";
import { Live as DialogLive } from "./Service/Dialog.js";
import { Live as DocumentLive } from "./Service/Document.js";
import { Live as EnvironmentLive } from "./Service/Environment.js";
import { Live as ExtensionLive } from "./Service/Extension.js";
import { Live as FileSystemLive } from "./Service/FileSystem.js";
import { Live as FileSystemInformationLive } from "./Service/FileSystemInformation.js";
// --- Foundational Imports ---
import InitDataLayerFactory from "./Service/InitData/Live.js";
import {
	IPCConfigurationService,
	type IPCConfiguration,
} from "./Service/IPC/Configuration.js";
import IPCLive from "./Service/IPC/Live.js";
import IPCService from "./Service/IPC/Service.js";
import { Live as LanguageFeatureLive } from "./Service/LanguageFeature.js";
import { Live as LocalizationLive } from "./Service/Localization.js";
import { Live as LogLive } from "./Service/Log.js";
import { Live as MessageLive } from "./Service/Message.js";
import { Live as ProposedAPILive } from "./Service/ProposedAPI.js";
import { Live as QuickInputLive } from "./Service/QuickInput.js";
import { Live as SecretStorageLive } from "./Service/SecretStorage.js";
import { Live as StatusBarLive } from "./Service/StatusBar.js";
import { Live as StorageLive } from "./Service/Storage.js";
import { Live as StoragePathLive } from "./Service/StoragePath.js";
import { Live as TaskLive } from "./Service/Task.js";
import { Live as TelemetryLive } from "./Service/Telemetry.js";
import { Live as TreeViewLive } from "./Service/TreeView.js";
import { Live as WebViewPanelLive } from "./Service/WebViewPanel.js";
import { Live as WindowLive } from "./Service/Window.js";
import { Live as WorkSpaceLive } from "./Service/WorkSpace.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

// --- Application Logic ---
const InitializeAfterHandshake = Effect.gen(function* (G) {
	const Interceptor = yield* G(RequireInterceptorService);
	yield* G(Interceptor.Install());
	yield* G(Effect.logInfo("Node.js require() interceptor installed."));

	const Host = yield* G(ExtensionHostService);
	yield* G(
		Host.ActivateById(
			"*" as any,
			{ startup: true, activationEvent: "*" } as any,
		),
	);

	yield* G(Effect.logInfo("Startup extensions activated."));
});

const Main = Effect.gen(function* (G) {
	const InitializationBarrier = yield* G(Deferred.make<void, Error>());
	const IPC = yield* G(IPCService);

	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(InitializationData: IExtensionHostInitData) => {
			// Step 1: Define the single, comprehensive application layer by merging
			// every service layer in the application. The Effect runtime will resolve
			// the complex dependency graph between them.
			const ApplicationLayer = Layer.mergeAll(
				APIFactoryLive,
				ESMInterceptorLive,
				ExtensionHostLive,
				ExtensionPathLive,
				HostKindPickerLive,
				NodeModuleShimLive,
				RequireInterceptorLive,
				APIDeprecationLive,
				AuthenticationLive,
				CancellationLive,
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
				IPCLive,
				LanguageFeatureLive,
				LocalizationLive,
				LogLive,
				MessageLive,
				ProposedAPILive,
				QuickInputLive,
				SecretStorageLive,
				StatusBarLive,
				StorageLive,
				StoragePathLive,
				TaskLive,
				TelemetryLive,
				TreeViewLive,
				WebViewPanelLive,
				WindowLive,
				WorkSpaceLive,
			);

			// Step 2: Define the "leaf" dependency layers. These provide the runtime
			// data and built-in services needed by the ApplicationLayer.
			const initDataLayer = InitDataLayerFactory(InitializationData);
			const DependenciesLayer = Layer.mergeAll(
				initDataLayer,
				ConfigurationLayer,
				Logger.logFmt, // FIX: Use a valid logger layer like `logFmt`
			);

			// Step 3: Provide the dependencies to the application layer.
			// This resolves all remaining requirements, resulting in a complete layer.
			const CompleteApplicationLayer = ApplicationLayer.pipe(
				Layer.provide(DependenciesLayer),
			);

			// Step 4: Define the main logic to run after initialization.
			const HandlerEffect = Effect.gen(function* (G) {
				yield* G(
					Effect.logInfo(
						"Received 'initExtensionHost' data from Mountain.",
					),
				);
				yield* G(RunProcessPatch);
				yield* G(InitializeAfterHandshake);
			});

			// Step 5: Create the final runnable by providing the complete layer.
			const Runnable = HandlerEffect.pipe(
				Effect.provide(CompleteApplicationLayer),
				Effect.scoped,
			);

			// Step 6: Execute the runnable.
			const PromiseResult = Effect.runPromiseExit(Runnable).then(
				(exit) => {
					if (Exit.isSuccess(exit)) {
						Effect.runFork(
							Deferred.succeed(
								InitializationBarrier,
								undefined as void,
							),
						);
					} else {
						Effect.runFork(
							Deferred.fail(
								InitializationBarrier,
								new Error(Cause.pretty(exit.cause)),
							),
						);
					}
				},
			);

			return PromiseResult;
		},
	);

	yield* G(IPC.SendNotification("$initialHandshake", []));
	yield* G(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));
	yield* G(Deferred.await(InitializationBarrier));
	yield* G(Effect.logInfo("Cocoon is fully initialized and operational."));
	yield* G(Effect.never);
}).pipe(
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Application Layer Composition ---
const ApplicationConfiguration: IPCConfiguration = {
	MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
	CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
};

// Create a layer that provides the static IPCConfigurationService.
const ConfigurationLayer = Layer.succeed(
	IPCConfigurationService,
	ApplicationConfiguration,
);

// The layer needed for the initial handshake requires the IPC service and a logger.
const PreHandshakeDependencies = Layer.merge(
	ConfigurationLayer,
	Logger.logFmt, // FIX: Use a valid logger layer
);
const PreHandshakeLayer = IPCLive.pipe(Layer.provide(PreHandshakeDependencies));

// --- Run the Application ---
const RunnableApplication = Effect.provide(Main, PreHandshakeLayer);

NodeRuntime.runMain(RunnableApplication);
