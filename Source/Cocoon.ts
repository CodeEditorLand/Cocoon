import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer, Logger } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

// --- Service Imports ---
// This file now imports all the `Live` layers to compose them.
import APIFactoryLive from "./Core/APIFactory/Live.js";
import ESMInterceptorLive from "./Core/ESMInterceptor/Live.js";
import ExtensionHostLive from "./Core/ExtensionHost/Live.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import ExtensionPathLive from "./Core/ExtensionPath/Live.js";
import HostKindPickerLive from "./Core/HostKindPicker/Live.js";
import NodeModuleShimLive from "./Core/NodeModuleShim/Live.js";
import RequireInterceptorLive from "./Core/RequireInterceptor/Live.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
import RunProcessPatch from "./PatchProcess.js";
import APIDeprecationLive from "./Service/APIDeprecation/Live.js";
import AuthenticationLive from "./Service/Authentication/Live.js";
import CancellationLive from "./Service/Cancellation/Live.js";
import ClipboardLive from "./Service/Clipboard/Live.js";
import CommandLive from "./Service/Command/Live.js";
import ConfigurationLive from "./Service/Configuration/Live.js";
import DebugLive from "./Service/Debug/Live.js";
import DiagnosticLive from "./Service/Diagnostic/Live.js";
import DialogLive from "./Service/Dialog/Live.js";
import DocumentLive from "./Service/Document/Live.js";
import EnvironmentLive from "./Service/Environment/Live.js";
import ExtensionLive from "./Service/Extension/Live.js";
import FileSystemLive from "./Service/FileSystem/Live.js";
import FileSystemInformationLive from "./Service/FileSystemInformation/Live.js";
import InitDataLive from "./Service/InitData/Live.js";
import IPCConfigurationService, {
	type IPCConfiguration,
} from "./Service/IPC/Configuration.js";
import IPCLive from "./Service/IPC/Live.js";
import IPCService from "./Service/IPC/Service.js";
import LanguageFeatureLive from "./Service/LanguageFeature/Live.js";
import LocalizationLive from "./Service/Localization/Live.js";
import LogLive from "./Service/Log/Live.js";
import MessageLive from "./Service/Message/Live.js";
import ProposedAPILive from "./Service/ProposedAPI/Live.js";
import QuickInputLive from "./Service/QuickInput/Live.js";
import SecretStorageLive from "./Service/SecretStorage/Live.js";
import StatusBarLive from "./Service/StatusBar/Live.js";
import StorageLive from "./Service/Storage/Live.js";
import StoragePathLive from "./Service/StoragePath/Live.js";
import TaskLive from "./Service/Task/Live.js";
import TelemetryLive from "./Service/Telemetry/Live.js";
import TreeViewLive from "./Service/TreeView/Live.js";
import WebViewPanelLive from "./Service/WebViewPanel/Live.js";
import WindowLive from "./Service/Window/Live.js";
import WorkSpaceLive from "./Service/WorkSpace/Live.js";

// --- Pre-initialization Steps ---
const VSCodeOutputDirectory =
	process.env["VSCODE_OUT_DIR"] ??
	Path.resolve(__dirname, "../../../Dependency/VSCode/out");
(module as any).paths.unshift(VSCodeOutputDirectory);

// --- Hierarchical Layer Composition ---

// STAGE 1: Core Infrastructure Layer
// Provides foundational services with zero or minimal dependencies.
const CoreInfraLayer = Layer.mergeAll(
	Layer.succeed(IPCConfigurationService, {
		MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
		CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052",
	} satisfies IPCConfiguration),
	Logger.logFmt,
	CancellationLive,
).pipe(Layer.provide(IPCLive)); // IPCLive depends on the services above

// STAGE 2: Core Services Layer
// Provides essential host services that depend on the infrastructure.
const CoreServicesLayer = Layer.mergeAll(
	LogLive,
	TelemetryLive,
	NodeModuleShimLive,
	RequireInterceptorLive,
	ESMInterceptorLive,
	ExtensionPathLive,
	HostKindPickerLive,
).pipe(Layer.provide(CoreInfraLayer)); // Depends on CoreInfraLayer

// STAGE 3: Application Services Layer
// Provides high-level services that mimic the vscode API.
const AppServicesLayer = Layer.mergeAll(
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
	WorkSpaceLive,
).pipe(Layer.provide(CoreServicesLayer)); // Depends on CoreServicesLayer

// STAGE 4: Top-Level Business Logic Layer
// Provides the final, most complex services that orchestrate everything.
const TopLevelLayer = Layer.mergeAll(APIFactoryLive, ExtensionHostLive).pipe(
	Layer.provide(AppServicesLayer), // Depends on AppServicesLayer
);

// --- Effect Definitions ---

const PreHandshakeEffect = Effect.gen(function* (G) {
	const InitializationBarrier = yield* G(
		Deferred.make<IExtensionHostInitData, Error>(),
	);
	const IPC = yield* G(IPCService);
	IPC.RegisterInvokeHandler(
		"initExtensionHost",
		(data: IExtensionHostInitData) =>
			Effect.runPromise(
				Deferred.succeed(InitializationBarrier, data).pipe(
					Effect.asVoid,
				),
			),
	);
	yield* G(IPC.SendNotification("$initialHandshake", []));
	return yield* G(Deferred.await(InitializationBarrier));
});

const PostHandshakeEffect = Effect.gen(function* (G) {
	yield* G(Effect.logInfo("Proceeding with full initialization..."));
	yield* G(RunProcessPatch);
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
	yield* G(Effect.logInfo("Cocoon is fully initialized and operational."));
	yield* G(Effect.never);
});

// --- Main Application Logic ---

const MainEffect = Effect.gen(function* (G) {
	// 1. Run pre-handshake with its minimal layer to get the init data.
	const InitializationData = yield* G(
		PreHandshakeEffect.pipe(Effect.provide(CoreInfraLayer)),
	);

	// 2. Create the runtime-dependent InitData layer.
	const InitDataLayer = InitDataLive(InitializationData);

	// 3. Compose the final, complete layer for the post-handshake logic.
	const FinalApplicationLayer = TopLevelLayer.pipe(
		Layer.provide(InitDataLayer),
	);

	// 4. Run the main post-handshake logic with all dependencies now resolved.
	yield* G(PostHandshakeEffect.pipe(Effect.provide(FinalApplicationLayer)));
}).pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
	Effect.scoped,
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
