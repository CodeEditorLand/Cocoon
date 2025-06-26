/**
 * @module Cocoon
 * @description Main Entry Point for the Cocoon Extension Host Process.
 * This file has been refactored to use dummy service implementations to
 * establish a compiling baseline, modeled 1-for-1 on the working skeleton.
 */

import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Effect, Layer } from "effect";

// --- Real Service Type Imports (for type-checking) ---
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";
import { LogLevel, UIKind } from "vscode";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { CancellationService } from "./Cancellation.js";
import { LoggerService } from "./Logger.js";
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { ApplicationConfigurationService } from "./ApplicationConfiguration.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { TelemetryService } from "./Telemetry.js";

// =============================================================================
// --- DUMMY SERVICE DEFINITIONS (ALL LIVE IMPLEMENTATIONS DISABLED) ---
// =============================================================================

class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{ sync: () => ({}) },
) {}
class APIFactoryService extends Effect.Service<APIFactoryService>()(
	"Service/APIFactory",
	{ sync: () => ({}) },
) {}
// class ApplicationConfigurationService extends Effect.Service<ApplicationConfigurationService>()(
// 	"vscode/ApplicationConfigurationService",
// 	{ sync: () => ({}) },
// ) {}
class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{ sync: () => ({}) },
) {}
// class CancellationService extends Effect.Service<CancellationService>()(
// 	"Service/Cancellation",
// 	{ sync: () => ({}) },
// ) {}
class ClipboardService extends Effect.Service<ClipboardService>()(
	"vscode/ClipboardService",
	{ sync: () => ({}) },
) {}
class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{ sync: () => ({}) },
) {}
class DebugService extends Effect.Service<DebugService>()("Service/Debug", {
	sync: () => ({}),
}) {}
class DialogService extends Effect.Service<DialogService>()("Service/Dialog", {
	sync: () => ({}),
}) {}
class DocumentService extends Effect.Service<DocumentService>()(
	"Service/Document",
	{ sync: () => ({}) },
) {}
class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Service/ESMInterceptor",
	{ sync: () => ({}) },
) {}
class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{ sync: () => ({}) },
) {}
class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{ sync: () => ({}) },
) {}
class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Service/ExtensionHost",
	{ sync: () => ({}) },
) {}
class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Service/ExtensionPath",
	{ sync: () => ({}) },
) {}
class FileSystemService extends Effect.Service<FileSystemService>()(
	"Service/FileSystem",
	{ sync: () => ({}) },
) {}
class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{ sync: () => ({}) },
) {}
class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Service/HostKindPicker",
	{ sync: () => ({}) },
) {}
// class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
// 	sync: () => ({}),
// }) {}
// class IPCConfigurationService extends Effect.Service<IPCConfigurationService>()(
// 	"Service/IPCConfiguration",
// 	{ sync: () => ({}) },
// ) {}
// class InitDataService extends Effect.Service<IExtensionHostInitData>()(
// 	"Service/InitData",
// 	{ sync: () => ({}) as any },
// ) {}
// class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
// 	"Service/LanguageFeature",
// 	{ sync: () => ({}) },
// ) {}
// class LoggerService extends Effect.Service<LoggerService>()("Service/Logger", {
// 	sync: () => ({
// 		Trace: () => Effect.void,
// 		Debug: () => Effect.void,
// 		Info: (m: any) => Effect.sync(() => console.log(m)),
// 		Warn: (m: any) => Effect.sync(() => console.warn(m)),
// 		Error: (m: any) => Effect.sync(() => console.error(m)),
// 		Fatal: (m: any) => Effect.sync(() => console.error(m)),
// 	}),
// }) {}
class MessageService extends Effect.Service<MessageService>()(
	"Service/Message",
	{ sync: () => ({}) },
) {}
class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Service/NodeModuleShim",
	{ sync: () => ({}) },
) {}
class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{ sync: () => ({}) },
) {}
class QuickInputService extends Effect.Service<QuickInputService>()(
	"Service/QuickInput",
	{ sync: () => ({}) },
) {}
class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Service/RequireInterceptor",
	{ sync: () => ({}) },
) {}
class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{ sync: () => ({}) },
) {}
class StatusBarService extends Effect.Service<StatusBarService>()(
	"Service/StatusBar",
	{ sync: () => ({}) },
) {}
class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",
	{ sync: () => ({}) },
) {}
class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",
	{ sync: () => ({}) },
) {}
class TaskService extends Effect.Service<TaskService>()("Service/Task", {
	sync: () => ({}),
}) {}
// class TelemetryService extends Effect.Service<TelemetryService>()(
// 	"Service/Telemetry",
// 	{ sync: () => ({}) },
// ) {}
class TreeViewService extends Effect.Service<TreeViewService>()(
	"Service/TreeView",
	{ sync: () => ({}) },
) {}
class WebViewPanelService extends Effect.Service<WebViewPanelService>()(
	"Service/WebViewPanel",
	{ sync: () => ({}) },
) {}
class WindowService extends Effect.Service<WindowService>()("Service/Window", {
	sync: () => ({}),
}) {}
class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{ sync: () => ({}) },
) {}

// =============================================================================
// --- SKELETON STRUCTURE: Modeled 1-for-1 on the working file ---
// =============================================================================

const DUMMY_INIT_DATA: IExtensionHostInitData = {
	version: "1.85.0",
	quality: "stable",
	commit: "dev",
	parentPid: 0,
	environment: {
		isExtensionDevelopmentDebug: false,
		appName: "Cocoon",
		appHost: "desktop",
		appLanguage: "en",
		isExtensionTelemetryLoggingOnly: false,
		appUriScheme: "cocoon-code",
		globalStorageHome: {} as any,
		workspaceStorageHome: {} as any,
	},
	workspace: null,
	extensions: {
		versionId: 0,
		allExtensions: [],
		activationEvents: {},
		myExtensions: [],
	},
	telemetryInfo: {
		sessionId: "",
		machineId: "",
		sqmId: "",
		devDeviceId: "",
		firstSessionDate: new Date().toISOString(),
	},
	logLevel: LogLevel.Info,
	loggers: [],
	logsLocation: {} as any,
	autoStart: false,
	remote: { isRemote: false, authority: undefined, connectionData: null },
	consoleForward: { includeStack: false, logNative: false },
	uiKind: UIKind.Desktop,
};

const composeAppLayer = (_initializationData: IExtensionHostInitData) => {
	// L0: Primitives and services with no dependencies on other app services.
	const L0_World = Layer.mergeAll(
		IPCConfigurationService.Default,
		CancellationService.Default,
		LoggerService.Default,
	);
	const InitDataLayer = Layer.succeed(InitDataService, DUMMY_INIT_DATA);

	// L1: Services that need L0 and/or InitData.
	const L1_Services = Layer.mergeAll(
		IPCService.Default,
		ApplicationConfigurationService.Default,
		LanguageFeatureService.Default,
		TelemetryService.Default,
	);
	const L1_World = Layer.provide(
		L1_Services,
		Layer.merge(L0_World, InitDataLayer),
	);

	// L2: Services that need L1.
	const L2_Services = Layer.mergeAll(
		ExtensionPathService.Default,
		HostKindPickerService.Default,
		NodeModuleShimService.Default,
	);
	const L2_World = Layer.provide(L2_Services, L1_World);

	// L3: Base API providers.
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

	// L4: Task/Auth APIs.
	const L4_Services = Layer.mergeAll(
		TaskService.Default,
		AuthenticationService.Default,
	);
	const L4_World = Layer.provide(L4_Services, L3_World);

	// L5: Filesystem and Storage.
	const L5_Services = Layer.mergeAll(
		FileSystemService.Default,
		StorageService.Default,
	);
	const L5_World = Layer.provide(L5_Services, L4_World);

	// L6: High-level context APIs.
	const L6_Services = Layer.mergeAll(
		StoragePathService.Default,
		WindowService.Default,
	);
	const L6_World = Layer.provide(L6_Services, L5_World);

	// L7: Core action/workspace services.
	const L7_Services = Layer.mergeAll(
		CommandService.Default,
		WorkSpaceService.Default,
	);
	const L7_World = Layer.provide(L7_Services, L6_World);

	// L8: High-level UI and Host services.
	const L8_Services = Layer.mergeAll(
		DebugService.Default,
		StatusBarService.Default,
		TreeViewService.Default,
		WebViewPanelService.Default,
		EnvironmentService.Default,
		ExtensionHostService.Default,
	);
	const L8_World = Layer.provide(L8_Services, L7_World);

	// L9: Extension API surface.
	const L9_Services = Layer.mergeAll(ExtensionService.Default);
	const L9_World = Layer.provide(L9_Services, L8_World);

	// L10: API Factory.
	const L10_Services = Layer.mergeAll(APIFactoryService.Default);
	const L10_World = Layer.provide(L10_Services, L9_World);

	// Top Level: Interceptors.
	const TopLevelServices = Layer.mergeAll(
		RequireInterceptorService.Default,
		ESMInterceptorService.Default,
	);
	// The final result is a single, self-sufficient layer.
	return Layer.provide(TopLevelServices, L10_World);
};

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);
const UtilityLayers = Layer.mergeAll(TracingLive, DevToolsLive);

// --- Main Application Logic ---
const MainLogic = Effect.gen(function* () {
	yield* Effect.log("Application layers constructed successfully.");
	// To ensure all layers are actually built, we can request a top-level service.
	yield* RequireInterceptorService;
	yield* Effect.log("Top level services resolved.");
	yield* Effect.never;
});

// --- Final Application Assembly and Execution ---
const AppLayer = composeAppLayer(DUMMY_INIT_DATA);

// The only remaining dependency for the entire AppEffect is the LoggerService
// needed by the `catchAllCause` handler.
const FinalLayer = Layer.mergeAll(
	AppLayer,
	UtilityLayers,
	LoggerService.Default,
);

const AppEffectWithRequirements = MainLogic.pipe(
	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),
);

// Provide the final layer to the *entire* application logic at once.
// This resolves all requirements, resulting in an executable effect.
const ExecutableMainEffect = Effect.provide(
	AppEffectWithRequirements,
	FinalLayer,
).pipe(Effect.scoped);

NodeRuntime.runMain(ExecutableMainEffect);
