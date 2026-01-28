/**
 * @module Skeleton
 * @description A single-file, complete application skeleton. This version uses the
 * canonical `Layer.provide` chaining pattern to guarantee dependency resolution.
 */

// --- VS Code Internal Imports ---
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import {
	DisposableStore,
	type IDisposable,
} from "@codeeditorland/output/vs/base/common/lifecycle.js";
import type {
	IConfigurationData,
	IConfigurationService,
} from "@codeeditorland/output/vs/platform/configuration/common/configuration";
import { TelemetryLevel } from "@codeeditorland/output/vs/platform/telemetry/common/telemetry.js";
import type {
	ExtHostTelemetryLogger,
	IExtHostTelemetry,
} from "@codeeditorland/output/vs/workbench/api/common/extHostTelemetry.js";
import type { IExtensionHostInitData } from "@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { LogLevel, UIKind } from "vscode";

// --- Real Service Imports (L0) ---
import { CancellationService } from "./Cancellation.js";
import { InitDataService } from "./InitData.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { LoggerService } from "./Logger.js";

// =============================================================================
// --- DUMMY DATA & INTERFACES ---
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

const DummyConfigurationService: IConfigurationService = {
	_serviceBrand: undefined,
	getValue: () => undefined,
	updateValue: () => Promise.resolve(),
	inspect: () => ({ key: "" }) as any,
	keys: () => ({ default: [], user: [], workspace: [], workspaceFolder: [] }),
	reloadConfiguration: () => Promise.resolve(),
	onDidChangeConfiguration: new Emitter<any>().event,
	getConfigurationData: (): IConfigurationData | null => null,
};

const DummyTelemetryService: IExtHostTelemetry = {
	_serviceBrand: undefined,
	_productConfig: { usage: false, error: false },
	_level: TelemetryLevel.NONE,
	_oldTelemetryEnablement: false,
	_inLoggingOnlyMode: false,
	_outputLogger: {
		dispose: () => {},
		flush: () => {},
		getLevel: () => LogLevel.Off,
		info: () => {},
		setLevel: () => {},
		trace: () => {},
		debug: () => {},
		error: () => {},
		warn: () => {},
		onDidChangeLogLevel: new Emitter<LogLevel>().event,
	},
	_telemetryLoggers: new Map<string, ExtHostTelemetryLogger[]>(),
	_onDidChangeTelemetryEnabled: new Emitter<boolean>(),
	_onDidChangeTelemetryConfiguration: new Emitter<any>(),
	_store: new DisposableStore(),
	_register: <T extends IDisposable>(o: T): T => o,
	onDidChangeTelemetryConfiguration: new Emitter<any>().event,
	onDidChangeTelemetryEnabled: new Emitter<boolean>().event,
	getTelemetryConfiguration: () => false,
	getTelemetryDetails: () => ({}) as any,
	instantiateLogger: () => ({}) as any,
	getBuiltInCommonProperties: () => ({}),
	$initializeTelemetryLevel: () => {},
	$onDidChangeTelemetryLevel: () => {},
	onExtensionError: () => false,
	dispose: () => {},
	initData: DUMMY_INIT_DATA as any,
} as any;

// =============================================================================
// --- SKELETON SERVICE DEFINITIONS ---
// =============================================================================

class ApplicationConfigurationService extends Effect.Service<IConfigurationService>()(
	"vscode/ApplicationConfigurationService",
	{ sync: () => DummyConfigurationService },
) {}
class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	sync: () => ({
		CreateProxy: () => ({}),
		RegisterInvokeHandler: () => ({ dispose: () => {} }),
		SendNotification: (() => Effect.void) as any,
		SendRequest: (() => Effect.void) as any,
		SendCancel: (() => Effect.void) as any,
		CreateProtocolAdapter: (() => ({})) as any,
	}),
}) {}
class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
	"Service/LanguageFeature",
	{ sync: () => ({}) },
) {}
class TelemetryService extends Effect.Service<IExtHostTelemetry>()(
	"Service/Telemetry",
	{ sync: () => DummyTelemetryService },
) {}
class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Service/ExtensionPath",
	{ sync: () => ({}) },
) {}
class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Service/HostKindPicker",
	{ sync: () => ({}) },
) {}
class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Service/NodeModuleShim",
	{ sync: () => ({}) },
) {}
class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{ sync: () => ({}) },
) {}
class ClipboardService extends Effect.Service<ClipboardService>()(
	"vscode/ClipboardService",
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
class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{ sync: () => ({}) },
) {}
class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{ sync: () => ({}) },
) {}
class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{ sync: () => ({}) },
) {}
class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{ sync: () => ({}) },
) {}
class TaskService extends Effect.Service<TaskService>()("Service/Task", {
	sync: () => ({}),
}) {}
class FileSystemService extends Effect.Service<FileSystemService>()(
	"Service/FileSystem",
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
class WindowService extends Effect.Service<WindowService>()("Service/Window", {
	sync: () => ({}),
}) {}
class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{ sync: () => ({}) },
) {}
class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{ sync: () => ({}) },
) {}
class DebugService extends Effect.Service<DebugService>()("Service/Debug", {
	sync: () => ({}),
}) {}
class StatusBarService extends Effect.Service<StatusBarService>()(
	"Service/StatusBar",
	{ sync: () => ({}) },
) {}
class TreeViewService extends Effect.Service<TreeViewService>()(
	"Service/TreeView",
	{ sync: () => ({}) },
) {}
class WebViewPanelService extends Effect.Service<WebViewPanelService>()(
	"Service/WebViewPanel",
	{ sync: () => ({}) },
) {}
class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{ sync: () => ({}) },
) {}
class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Service/ExtensionHost",
	{ sync: () => ({}) },
) {}
class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{ sync: () => ({}) },
) {}
class APIFactoryService extends Effect.Service<APIFactoryService>()(
	"Service/APIFactory",
	{ sync: () => ({}) },
) {}
class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Service/ESMInterceptor",
	{ sync: () => ({}) },
) {}
class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Service/RequireInterceptor",
	{ sync: () => ({}) },
) {}

// =============================================================================
// --- LAYER COMPOSITION ---
// =============================================================================

const composeAppLayer = (_initializationData: IExtensionHostInitData) => {
	// Group services by their logical layer
	const L0_Services = Layer.mergeAll(
		IPCConfigurationService.Default,
		CancellationService.Default,
		LoggerService.Default,
		Layer.succeed(InitDataService, DUMMY_INIT_DATA),
	);
	const L1_Services = Layer.mergeAll(
		ApplicationConfigurationService.Default,
		IPCService.Default,
		LanguageFeatureService.Default,
	);
	const L2_Services = Layer.mergeAll(
		TelemetryService.Default,
		ExtensionPathService.Default,
		HostKindPickerService.Default,
		NodeModuleShimService.Default,
		FileSystemInformationService.Default,
	);
	const L3_Services = Layer.mergeAll(
		APIDeprecationService.Default,
		ClipboardService.Default,
		DialogService.Default,
		DocumentService.Default,
		MessageService.Default,
		QuickInputService.Default,
		ProposedAPIService.Default,
		SecretStorageService.Default,
		AuthenticationService.Default,
		TaskService.Default,
	);
	const L4_Services = Layer.mergeAll(
		FileSystemService.Default,
		StorageService.Default,
	);
	const L5_Services = Layer.mergeAll(
		StoragePathService.Default,
		WorkSpaceService.Default,
		EnvironmentService.Default,
	);
	const L6_Services = Layer.mergeAll(
		WindowService.Default,
		CommandService.Default,
	);
	const L7_Services = Layer.mergeAll(
		DebugService.Default,
		StatusBarService.Default,
		TreeViewService.Default,
		WebViewPanelService.Default,
	);
	const L8_Services = Layer.mergeAll(
		ExtensionHostService.Default,
		ExtensionService.Default,
	);
	const L9_Services = Layer.mergeAll(
		APIFactoryService.Default,
		RequireInterceptorService.Default,
		ESMInterceptorService.Default,
	);

	// Compose the layers sequentially, providing the output of the previous layer to the next.
	const L1_World = Layer.provide(L1_Services, L0_Services);
	const L2_World = Layer.provide(L2_Services, L1_World);
	const L3_World = Layer.provide(L3_Services, L2_World);
	const L4_World = Layer.provide(L4_Services, L3_World);
	const L5_World = Layer.provide(L5_Services, L4_World);
	const L6_World = Layer.provide(L6_Services, L5_World);
	const L7_World = Layer.provide(L7_Services, L6_World);
	const L8_World = Layer.provide(L8_Services, L7_World);
	const FinalAppWorld = Layer.provide(L9_Services, L8_World);

	// Merge the final composed layer with the base L0 services to make them available to the main effect.
	// Then, handle potential construction errors.
	return Layer.mergeAll(FinalAppWorld, L0_Services).pipe(Layer.orDie);
};

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon" },
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);
const UtilityLayers = Layer.mergeAll(TracingLive, DevToolsLive);

// --- Main Application Logic ---
const MainLogic = Effect.gen(function* () {
	yield* Effect.log("--- Verifying Top-Level Service ---");
	yield* Effect.log(
		"Attempting to resolve a top-level service (RequireInterceptorService)...",
	);
	yield* RequireInterceptorService;
	yield* Effect.log("✔ RequireInterceptorService resolved successfully.");
	yield* Effect.log(
		"--- Full skeleton application layer is valid. Idling. ---",
	);
	yield* Effect.never;
});

// --- Final Application Assembly and Execution ---
const AppLayer = composeAppLayer(DUMMY_INIT_DATA);
const FinalLayer = Layer.mergeAll(AppLayer, UtilityLayers);

const AppEffectWithRequirements = MainLogic.pipe(
	Effect.catchAllCause((cause) =>
		Effect.logFatal("An unrecoverable error occurred in MainLogic.", cause),
	),
);

const ExecutableMainEffect = Effect.provide(
	AppEffectWithRequirements,
	FinalLayer,
).pipe(Effect.scoped);

NodeRuntime.runMain(ExecutableMainEffect);
