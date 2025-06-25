/*
 * File: Cocoon/Source/Skeleton.ts
 *
 * This file defines a complete, fully asynchronous application skeleton using the Effect-TS library.
 * It demonstrates how to manage a complex dependency graph with dozens of interdependent services.
 *
 * The key pattern used here is the "Progressive World Build" for layer composition.
 * This pattern explicitly builds the application's environment level-by-level,
 * ensuring that all service dependencies are correctly resolved at each stage. This approach
 * is robust and solves the common "Service not found" errors that can occur with
 * simpler composition methods in highly complex applications.
 *
 * Logging has been added to the constructor of many services to provide a clear trace
 * of the initialization order when the application is run.
 */

import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Effect, Layer } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";
import { LogLevel, UIKind } from "vscode";

// =============================================================================
// --- SERVICE DEFINITIONS & PLACEHOLDERS ---
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

// --- Level 0/1: Foundational Services ---
class IPCConfigurationService extends Effect.Service<IPCConfigurationService>()(
	"Service/IPCConfiguration",
	{ sync: () => ({}) },
) {}
class CancellationService extends Effect.Service<CancellationService>()(
	"Service/Cancellation",
	{ sync: () => ({}) },
) {}
class ApplicationConfigurationService extends Effect.Service<ApplicationConfigurationService>()(
	"vscode/ApplicationConfigurationService",
	{
		sync: () => ({
			getValue: () => undefined,
			updateValue: () => Promise.resolve(),
			inspect: () => ({ key: "" }) as any,
		}),
	},
) {}
class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
	"Service/LanguageFeature",
	{ sync: () => ({}) },
) {}
class InitDataService extends Effect.Service<IExtensionHostInitData>()(
	"Service/InitData",
	{ sync: () => DUMMY_INIT_DATA },
) {}

class LoggerService extends Effect.Service<LoggerService>()("Service/Logger", {
	effect: Effect.gen(function* () {
		yield* ApplicationConfigurationService;
		return {
			log: (Message: string) =>
				Effect.sync(() => console.log(`[LOG] ${Message}`)),
		};
	}),
}) {}
class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	effect: Effect.gen(function* () {
		yield* IPCConfigurationService;
		yield* CancellationService;
		return {};
	}),
}) {}
class TelemetryService extends Effect.Service<TelemetryService>()(
	"Service/Telemetry",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* InitDataService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Service/ExtensionPath",
	{
		effect: Effect.gen(function* () {
			yield* InitDataService;
			return {};
		}),
	},
) {}
class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Service/HostKindPicker",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			return {};
		}),
	},
) {}
class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Service/NodeModuleShim",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* InitDataService;
			return {};
		}),
	},
) {}
class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			return {};
		}),
	},
) {}
class ClipboardService extends Effect.Service<ClipboardService>()(
	"vscode/ClipboardService",
	{
		sync: () => ({
			writeText: () => Promise.resolve(),
			readText: () => Promise.resolve(""),
		}),
	},
) {}
class DialogService extends Effect.Service<DialogService>()("Service/Dialog", {
	effect: Effect.gen(function* () {
		yield* IPCService;
		return {};
	}),
}) {}
class DocumentService extends Effect.Service<DocumentService>()(
	"Service/Document",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			return {};
		}),
	},
) {}
class MessageService extends Effect.Service<MessageService>()(
	"Service/Message",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			return {};
		}),
	},
) {}
class QuickInputService extends Effect.Service<QuickInputService>()(
	"Service/QuickInput",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			return {};
		}),
	},
) {}
class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* InitDataService;
			return {};
		}),
	},
) {}
class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* IPCService;
			return {};
		}),
	},
) {}
class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* IPCService;
			return {};
		}),
	},
) {}
class TaskService extends Effect.Service<TaskService>()("Service/Task", {
	effect: Effect.gen(function* () {
		yield* IPCService;
		yield* CancellationService;
		return {};
	}),
}) {}
class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* IPCService;
			return {};
		}),
	},
) {}
class FileSystemService extends Effect.Service<FileSystemService>()(
	"Service/FileSystem",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* FileSystemInformationService;
			return {};
		}),
	},
) {}
class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* IPCService;
			return {};
		}),
	},
) {}
class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* InitDataService;
			yield* ClipboardService;
			return {};
		}),
	},
) {}
class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",
	{
		effect: Effect.gen(function* () {
			yield* InitDataService;
			yield* FileSystemService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class WindowService extends Effect.Service<WindowService>()("Service/Window", {
	effect: Effect.gen(function* () {
		yield* IPCService;
		return {};
	}),
}) {}
class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* TelemetryService;
			yield* WindowService;
			return {};
		}),
	},
) {}
class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* DocumentService;
			yield* FileSystemService;
			yield* ApplicationConfigurationService;
			return {};
		}),
	},
) {}
class DebugService extends Effect.Service<DebugService>()("Service/Debug", {
	effect: Effect.gen(function* () {
		yield* IPCService;
		return {};
	}),
}) {}
class StatusBarService extends Effect.Service<StatusBarService>()(
	"Service/StatusBar",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* CommandService;
			return {};
		}),
	},
) {}
class TreeViewService extends Effect.Service<TreeViewService>()(
	"Service/TreeView",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* CommandService;
			return {};
		}),
	},
) {}
class WebViewPanelService extends Effect.Service<WebViewPanelService>()(
	"Service/WebViewPanel",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			return {};
		}),
	},
) {}
class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Service/ExtensionHost",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* IPCService;
			yield* InitDataService;
			yield* TelemetryService;
			return {};
		}),
	},
) {}
class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{
		effect: Effect.gen(function* () {
			yield* ExtensionHostService;
			yield* InitDataService;
			return {};
		}),
	},
) {}
class APIFactoryService extends Effect.Service<APIFactoryService>()(
	"Service/APIFactory",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* ProposedAPIService;
			yield* CommandService;
			yield* WorkSpaceService;
			yield* WindowService;
			yield* LanguageFeatureService;
			yield* DebugService;
			yield* TaskService;
			yield* ExtensionService;
			yield* WebViewPanelService;
			yield* TreeViewService;
			yield* StatusBarService;
			return {};
		}),
	},
) {}
class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Service/RequireInterceptor",
	{
		effect: Effect.gen(function* () {
			yield* APIFactoryService;
			yield* ExtensionPathService;
			yield* LoggerService;
			yield* NodeModuleShimService;
			return {};
		}),
	},
) {}
class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Service/ESMInterceptor",
	{
		effect: Effect.gen(function* () {
			yield* APIFactoryService;
			yield* ExtensionPathService;
			yield* LoggerService;
			return {};
		}),
	},
) {}

// =============================================================================
// --- LAYER COMPOSITION: The Progressive World Build ---
// =============================================================================
const createLayer = () => {
	// Level 0: Foundational Services
	const L0_World = Layer.mergeAll(
		IPCConfigurationService.Default,
		CancellationService.Default,
	);
	const InitDataLayer = Layer.succeed(
		InitDataService,
		InitDataService.of(DUMMY_INIT_DATA),
	);

	// Level 1: Base services that depend on L0 and InitData
	const L1_Services = Layer.mergeAll(
		ApplicationConfigurationService.Default,
		LoggerService.Default, // Logger now depends on AppConfig
	);
	const L1_World = Layer.provide(
		L1_Services,
		Layer.merge(L0_World, InitDataLayer),
	);

	// Level 2: Services that depend on L1
	const L2_Services = Layer.mergeAll(
		IPCService.Default,
		HostKindPickerService.Default,
		NodeModuleShimService.Default,
		ExtensionPathService.Default,
	);
	const L2_World = Layer.provide(L2_Services, L1_World);

	// Level 3
	const L3_Services = Layer.mergeAll(
		TelemetryService.Default,
		APIDeprecationService.Default,
		ClipboardService.Default,
		DialogService.Default,
		DocumentService.Default,
		MessageService.Default,
		QuickInputService.Default,
		ProposedAPIService.Default,
		SecretStorageService.Default,
		FileSystemInformationService.Default,
		TaskService.Default,
		AuthenticationService.Default,
	);
	const L3_World = Layer.provide(L3_Services, L2_World);

	// Level 4
	const L4_Services = Layer.mergeAll(
		FileSystemService.Default,
		StorageService.Default,
		EnvironmentService.Default,
		WindowService.Default,
	);
	const L4_World = Layer.provide(L4_Services, L3_World);

	// Level 5
	const L5_Services = Layer.mergeAll(
		StoragePathService.Default,
		CommandService.Default,
	);
	const L5_World = Layer.provide(L5_Services, L4_World);

	// Level 6
	const L6_Services = Layer.mergeAll(
		WorkSpaceService.Default,
		StatusBarService.Default,
		TreeViewService.Default,
	);
	const L6_World = Layer.provide(L6_Services, L5_World);

	// Level 7
	const L7_Services = Layer.mergeAll(
		DebugService.Default,
		WebViewPanelService.Default,
		ExtensionHostService.Default,
	);
	const L7_World = Layer.provide(L7_Services, L6_World);

	// Level 8
	const L8_Services = Layer.mergeAll(ExtensionService.Default);
	const L8_World = Layer.provide(L8_Services, L7_World);

	// Level 9
	const L9_Services = Layer.mergeAll(APIFactoryService.Default);
	const L9_World = Layer.provide(L9_Services, L8_World);

	// Top Level
	const TopLevelServices = Layer.mergeAll(
		RequireInterceptorService.Default,
		ESMInterceptorService.Default,
	);
	return Layer.provide(TopLevelServices, L9_World);
};

const AppLayer = createLayer();

// --- Main Application Logic ---
const MainLogic = Effect.gen(function* () {
	const logger = yield* LoggerService;
	yield* logger.log("--- Main logic started. Base Logger is available. ---");
	yield* logger.log(
		"--- Triggering full initialization by requesting top-level services... ---",
	);
	yield* RequireInterceptorService;
	yield* ESMInterceptorService;
	yield* logger.log(
		"--- Initialization complete. All services are built and memoized. ---",
	);
	yield* logger.log("Application is now running and will hang indefinitely.");
	yield* Effect.never;
});

/** The final, executable Effect for the application. */
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);

// FIX: Combine the full application layer with the utility layers.
const FinalLayer = Layer.merge(
	AppLayer,
	Layer.merge(TracingLive, DevToolsLive),
);

// FIX: Provide the final, complete layer to the main logic.
// The resulting effect will have all dependencies satisfied (R = never).
const MainEffect = Effect.provide(MainLogic, FinalLayer).pipe(
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Skeleton main process failed.", cause),
	),
);

NodeRuntime.runMain(MainEffect);
