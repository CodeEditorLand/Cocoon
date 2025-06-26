/*
 * File: Cocoon/Source/Skeleton.ts
 *
 * This file defines a complete, fully asynchronous application skeleton using the Effect-TS library.
 * It is built using the "Progressive World Build" pattern from the original, working Cocoon skeleton.
 * This pattern ensures that the dependency injection layer is built up correctly, level-by-level,
 * resulting in a self-sufficient final layer.
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

// --- Service Definitions ---
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

// =============================================================================
// --- LAYER COMPOSITION: The Progressive World Build (Corrected) ---
// =============================================================================

// Level 0: The absolute foundation. Services with no dependencies.
const L0_World = Layer.mergeAll(
	ApplicationConfigurationService.Default,
	CancellationService.Default,
	LanguageFeatureService.Default,
	IPCConfigurationService.Default,
	InitDataService.Default,
);

// Level 1: Services that depend only on Level 0.
const L1_Services = Layer.mergeAll(
	LoggerService.Default,
	IPCService.Default,
	ExtensionPathService.Default,
);
const L1_World = Layer.merge(L0_World, L1_Services).pipe(
	Layer.provide(L0_World),
);

// Level 2: Services that depend on the L1_World.
const L2_Services = Layer.mergeAll(
	APIDeprecationService.Default,
	HostKindPickerService.Default,
	NodeModuleShimService.Default,
	ClipboardService.Default,
	DebugService.Default,
	DialogService.Default,
	DocumentService.Default,
	MessageService.Default,
	QuickInputService.Default,
	WebViewPanelService.Default,
	WindowService.Default,
	TaskService.Default,
	AuthenticationService.Default,
	FileSystemInformationService.Default,
	ProposedAPIService.Default,
	SecretStorageService.Default,
	StorageService.Default,
	TelemetryService.Default,
);
const L2_World = Layer.merge(L1_World, L2_Services).pipe(
	Layer.provide(L1_World),
);

// Level 3: Services that depend on the L2_World.
const L3_Services = Layer.mergeAll(
	EnvironmentService.Default,
	FileSystemService.Default,
	CommandService.Default,
);
const L3_World = Layer.merge(L2_World, L3_Services).pipe(
	Layer.provide(L2_World),
);

// Level 4: Services that depend on the L3_World.
const L4_Services = Layer.mergeAll(
	StoragePathService.Default,
	WorkSpaceService.Default,
	StatusBarService.Default,
	TreeViewService.Default,
);
const L4_World = Layer.merge(L3_World, L4_Services).pipe(
	Layer.provide(L3_World),
);

// Level 5: Services that depend on the L4_World.
const L5_Services = Layer.mergeAll(ExtensionHostService.Default);
const L5_World = Layer.merge(L4_World, L5_Services).pipe(
	Layer.provide(L4_World),
);

// Level 6: Services that depend on the L5_World.
const L6_Services = Layer.mergeAll(ExtensionService.Default);
const L6_World = Layer.merge(L5_World, L6_Services).pipe(
	Layer.provide(L5_World),
);

// Level 7: Services that depend on the L6_World.
const L7_Services = Layer.mergeAll(APIFactoryService.Default);
const L7_World = Layer.merge(L6_World, L7_Services).pipe(
	Layer.provide(L6_World),
);

// Level 8: The top-level services.
const L8_Services = Layer.mergeAll(
	ESMInterceptorService.Default,
	RequireInterceptorService.Default,
);
const AppLayer = Layer.merge(L7_World, L8_Services).pipe(
	Layer.provide(L7_World),
);

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));
const DevToolsLive = Layer.provide(
	DevTools.layerWebSocket(),
	NodeSocket.layerWebSocketConstructor,
);

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

// --- Final Application Assembly and Execution ---

// Combine the application's self-sufficient layer with the utility layers.
const FinalLayer = Layer.mergeAll(AppLayer, TracingLive, DevToolsLive);

// The MainEffect still has requirements (e.g., LoggerService for the catchAll).
const MainEffectWithRequirements = MainLogic.pipe(
	Effect.catchAllCause((cause) =>
		// This logFatal still requires LoggerService, which is fine at this stage.
		Effect.logFatal("Skeleton main process failed.", cause),
	),
);

// Provide the final, complete layer to the *entire* application logic,
// including its error handler. This resolves all requirements.
const ExecutableMainEffect = Effect.provide(
	MainEffectWithRequirements,
	FinalLayer,
);

// ExecutableMainEffect is now of type `Effect<void, never, never>` and can be run.
NodeRuntime.runMain(ExecutableMainEffect);
