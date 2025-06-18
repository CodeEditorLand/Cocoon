/*
 * File: Cocoon_Single_Fixed.ts
 * Simplified approach: Use sync services where possible and explicit dependency resolution
 */

import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Effect, Layer } from "effect";

// --- Placeholder Types & Service Definitions ---
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

const DUMMY_INIT_DATA: IExtensionHostInitData = {
	extensions: { allExtensions: [] },
	environment: {},
	logLevel: 0,
	remote: {},
	telemetryInfo: {},
	uiKind: 0,
	quality: "",
	workspace: {},
};

// --- SIMPLIFIED SERVICE DEFINITIONS ---

// Foundation services - all sync to avoid dependency issues
class ConfigurationService extends Effect.Service<ConfigurationService>()(
	"Service/Configuration",
	{ sync: () => ({ logLevel: "INFO" as const }) },
) {}

class ProcessPatchService extends Effect.Service<ProcessPatchService>()(
	"PatchProcess/ProcessPatch",
	{ sync: () => ({}) },
) {}

class CancellationService extends Effect.Service<CancellationService>()(
	"Service/Cancellation",
	{ sync: () => ({}) },
) {}

class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
	"Service/LanguageFeature",
	{ sync: () => ({}) },
) {}

class IPCConfigurationService extends Effect.Service<IPCConfigurationService>()(
	"Service/IPCConfiguration",
	{ sync: () => ({}) },
) {}

class InitDataService extends Effect.Service<InitDataService>()(
	"Service/InitData",
	{ sync: () => DUMMY_INIT_DATA },
) {}

class LoggerService extends Effect.Service<LoggerService>()("Service/Logger", {
	sync: () => ({
		log: (message: string) =>
			Effect.sync(() => console.log(`[LOG] ${message}`)),
	}),
}) {}

class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	sync: () => ({}),
}) {}

class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Core/ExtensionPath",
	{ sync: () => ({}) },
) {}

class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{ sync: () => ({}) },
) {}

class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Core/HostKindPicker",
	{ sync: () => ({}) },
) {}

class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Core/NodeModuleShim",
	{ sync: () => ({}) },
) {}

class ClipboardService extends Effect.Service<ClipboardService>()(
	"Service/Clipboard",
	{ sync: () => ({}) },
) {}

class DebugService extends Effect.Service<DebugService>()("Service/Debug", {
	sync: () => ({}),
}) {}

class DiagnosticService extends Effect.Service<DiagnosticService>()(
	"Service/Diagnostic",
	{ sync: () => ({}) },
) {}

class DialogService extends Effect.Service<DialogService>()("Service/Dialog", {
	sync: () => ({}),
}) {}

class DocumentService extends Effect.Service<DocumentService>()(
	"Service/Document",
	{ sync: () => ({}) },
) {}

class MessageService extends Effect.Service<MessageService>()(
	"Service/Message",
	{ sync: () => ({}) },
) {}

class QuickInputService extends Effect.Service<QuickInputService>()(
	"Service/QuickInput",
	{ sync: () => ({}) },
) {}

class WebViewPanelService extends Effect.Service<WebViewPanelService>()(
	"Service/WebViewPanel",
	{ sync: () => ({}) },
) {}

class WindowService extends Effect.Service<WindowService>()("Service/Window", {
	sync: () => ({}),
}) {}

class LocalizationService extends Effect.Service<LocalizationService>()(
	"Service/Localization",
	{ sync: () => ({}) },
) {}

class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{ sync: () => ({}) },
) {}

class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{ sync: () => ({}) },
) {}

class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{ sync: () => ({}) },
) {}

class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{ sync: () => ({}) },
) {}

class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",
	{ sync: () => ({}) },
) {}

class TaskService extends Effect.Service<TaskService>()("Service/Task", {
	sync: () => ({}),
}) {}

class TelemetryService extends Effect.Service<TelemetryService>()(
	"Service/Telemetry",
	{ sync: () => ({}) },
) {}

class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{ sync: () => ({}) },
) {}

class FileSystemService extends Effect.Service<FileSystemService>()(
	"Service/FileSystem",
	{ sync: () => ({}) },
) {}

class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{ sync: () => ({}) },
) {}

class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",
	{ sync: () => ({}) },
) {}

class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{ sync: () => ({}) },
) {}

class StatusBarService extends Effect.Service<StatusBarService>()(
	"Service/StatusBar",
	{ sync: () => ({}) },
) {}

class TreeViewService extends Effect.Service<TreeViewService>()(
	"Service/TreeView",
	{ sync: () => ({}) },
) {}

class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Core/ExtensionHost",
	{ sync: () => ({}) },
) {}

class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{ sync: () => ({}) },
) {}

// APIFactory as sync service to avoid dependency resolution issues
class APIFactoryService extends Effect.Service<APIFactoryService>()(
	"Core/APIFactory",
	{ sync: () => ({}) },
) {}

class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Core/ESMInterceptor",
	{ sync: () => ({}) },
) {}

class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Core/RequireInterceptor",
	{ sync: () => ({}) },
) {}

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor),
);

// --- SIMPLIFIED: Single layer with all services ---
const AllServicesLayer = Layer.mergeAll(
	ConfigurationService.Default,
	ProcessPatchService.Default,
	CancellationService.Default,
	LanguageFeatureService.Default,
	IPCConfigurationService.Default,
	InitDataService.Default,
	LoggerService.Default,
	IPCService.Default,
	ExtensionPathService.Default,
	APIDeprecationService.Default,
	HostKindPickerService.Default,
	NodeModuleShimService.Default,
	ClipboardService.Default,
	DebugService.Default,
	DiagnosticService.Default,
	DialogService.Default,
	DocumentService.Default,
	MessageService.Default,
	QuickInputService.Default,
	WebViewPanelService.Default,
	WindowService.Default,
	LocalizationService.Default,
	AuthenticationService.Default,
	FileSystemInformationService.Default,
	ProposedAPIService.Default,
	SecretStorageService.Default,
	StorageService.Default,
	TaskService.Default,
	TelemetryService.Default,
	EnvironmentService.Default,
	FileSystemService.Default,
	CommandService.Default,
	StoragePathService.Default,
	WorkSpaceService.Default,
	StatusBarService.Default,
	TreeViewService.Default,
	ExtensionHostService.Default,
	ExtensionService.Default,
	APIFactoryService.Default,
	ESMInterceptorService.Default,
	RequireInterceptorService.Default,
);

const mainLogic = Effect.gen(function* () {
	const logger = yield* LoggerService;
	yield* logger.log("Main logic running...");

	// Access services to ensure they're properly initialized
	const extensionHost = yield* ExtensionHostService;
	const requireInterceptor = yield* RequireInterceptorService;
	const apiFactory = yield* APIFactoryService;

	// Access the services that were causing issues
	const processPatch = yield* ProcessPatchService;
	const initData = yield* InitDataService;
	const ipc = yield* IPCService;

	yield* logger.log("All services accessed successfully");
	yield* logger.log(
		"Process patch, init data, and IPC services accessed successfully",
	);

	yield* logger.log(
		"Cocoon skeleton is fully initialized. All services were resolved.",
	);

	// Complete successfully
	yield* Effect.sleep("1 second");
	yield* logger.log("Application completed successfully");
});

// The final executable Effect for our application
const MainEffect = mainLogic.pipe(
	Effect.provide(AllServicesLayer),
	Effect.provide(Layer.merge(TracingLive, DevToolsLive)),
	Effect.withSpan("cocoon-main-app-fixed"),
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
