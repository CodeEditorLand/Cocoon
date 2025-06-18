/*
 * File: Cocoon/Source/Skeleton.ts
 *
 * This file defines a complete, fully asynchronous application skeleton using the Effect-TS library.
 * It demonstrates how to manage a complex dependency graph with dozens of interdependent services.
 *
 * The key pattern used here is the "Progressive World Build" for layer composition.
 * This pattern explicitly builds the application's environment level-by-level,
 *
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

// =============================================================================
// --- Service Interfaces & Placeholders ---
// =============================================================================

/**
 * A placeholder interface representing the initial data payload that the
 * application might receive upon startup.
 */
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

/**
 * A dummy instance of IExtensionHostInitData used for initializing services
 * that require it, without needing a real data source in this skeleton.
 */
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

// =============================================================================
// --- SERVICE DEFINITIONS ---
// These services are organized by their dependency level.
// =============================================================================

// --- Level 1 Services: The Foundation (No Dependencies) ---

/** Manages application-wide configuration, such as log levels. */
class ConfigurationService extends Effect.Service<ConfigurationService>()(
	"Service/Configuration",

	{ sync: () => ({ logLevel: "INFO" as const }) },
) {}

/** A service for applying patches to the current process. */
class ProcessPatchService extends Effect.Service<ProcessPatchService>()(
	"PatchProcess/ProcessPatch",

	{ sync: () => ({}) },
) {}

/** Handles cancellation logic for ongoing operations. */
class CancellationService extends Effect.Service<CancellationService>()(
	"Service/Cancellation",

	{ sync: () => ({}) },
) {}

/** Provides language-specific features. */
class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
	"Service/LanguageFeature",

	{ sync: () => ({}) },
) {}

/** Manages configuration for Inter-Process Communication (IPC). */
class IPCConfigurationService extends Effect.Service<IPCConfigurationService>()(
	"Service/IPCConfiguration",

	{ sync: () => ({}) },
) {}

/** Provides the initial data payload to the application. */
class InitDataService extends Effect.Service<InitDataService>()(
	"Service/InitData",

	{ sync: () => DUMMY_INIT_DATA },
) {}

// --- Level 2 Services: Depend on Level 1 ---

/** A service for application-wide logging. */
class LoggerService extends Effect.Service<LoggerService>()("Service/Logger", {
	effect: Effect.gen(function* () {
		const c = yield* ConfigurationService;

		// This log proves ConfigurationService was resolved before LoggerService
		console.log(
			`[CONSTRUCTOR] LoggerService Initializing with logLevel: ${c.logLevel}`,
		);

		return {
			log: (m: string) => Effect.sync(() => console.log(`[LOG] ${m}`)),
		};
	}),
}) {}

/** Handles Inter-Process Communication (IPC). */
class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	effect: Effect.gen(function* () {
		yield* IPCConfigurationService;

		yield* CancellationService;

		return {};
	}),
}) {}

/** Manages paths for extensions. */
class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Core/ExtensionPath",

	{
		effect: Effect.gen(function* () {
			yield* InitDataService;

			return {};
		}),
	},
) {}

// --- Level 3 Services: Depend on Level 2 ---

/** Manages API deprecation warnings and logic. */
class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] APIDeprecationService");

			return {};
		}),
	},
) {}

/** Helps determine the kind of host environment. */
class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Core/HostKindPicker",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] HostKindPickerService");

			return {};
		}),
	},
) {}

/** Provides shims for Node.js modules. */
class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Core/NodeModuleShim",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] NodeModuleShimService");

			yield* InitDataService;

			return {};
		}),
	},
) {}

// --- Level 4 Services: Primarily Depend on IPCService and LoggerService ---

class ClipboardService extends Effect.Service<ClipboardService>()(
	"Service/Clipboard",

	{
		effect: Effect.gen(function* () {
			yield* IPCService;

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

class DiagnosticService extends Effect.Service<DiagnosticService>()(
	"Service/Diagnostic",

	{
		effect: Effect.gen(function* () {
			yield* IPCService;

			return {};
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

class WebViewPanelService extends Effect.Service<WebViewPanelService>()(
	"Service/WebViewPanel",

	{
		effect: Effect.gen(function* () {
			yield* IPCService;

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

class LocalizationService extends Effect.Service<LocalizationService>()(
	"Service/Localization",

	{
		effect: Effect.gen(function* () {
			yield* IPCService;

			yield* InitDataService;

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
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] AuthenticationService");

			yield* IPCService;

			return {};
		}),
	},
) {}

class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] FileSystemInformationService");

			yield* IPCService;

			return {};
		}),
	},
) {}

class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] ProposedAPIService");

			yield* InitDataService;

			return {};
		}),
	},
) {}

class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] SecretStorageService");

			yield* IPCService;

			return {};
		}),
	},
) {}

class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] StorageService");

			yield* IPCService;

			return {};
		}),
	},
) {}

class TelemetryService extends Effect.Service<TelemetryService>()(
	"Service/Telemetry",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] TelemetryService");

			yield* InitDataService;

			yield* IPCService;

			return {};
		}),
	},
) {}

// --- Level 5 Services: Services with more complex dependencies ---

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

// --- Level 6 Services ---

class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] StoragePathService");

			yield* InitDataService;

			yield* FileSystemService;

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

			yield* ConfigurationService;

			return {};
		}),
	},
) {}

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

// --- Level 7 Services ---

class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Core/ExtensionHost",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] ExtensionHostService");

			yield* IPCService;

			yield* InitDataService;

			yield* TelemetryService;

			return {};
		}),
	},
) {}

// --- Level 8 Services ---

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

// --- Level 9 Services ---

class APIFactoryService extends Effect.Service<APIFactoryService>()(
	"Core/APIFactory",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] APIFactoryService");

			yield* APIDeprecationService;

			yield* CommandService;

			yield* DebugService;

			yield* DocumentService;

			yield* ExtensionService;

			yield* LanguageFeatureService;

			yield* ProposedAPIService;

			yield* StatusBarService;

			yield* TaskService;

			yield* TreeViewService;

			yield* WebViewPanelService;

			yield* WindowService;

			yield* WorkSpaceService;

			return {};
		}),
	},
) {}

// --- Level 10 Services: Top-level services that depend on the API Factory ---

class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Core/ESMInterceptor",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] ESMInterceptorService");

			yield* APIFactoryService;

			yield* ExtensionPathService;

			return {};
		}),
	},
) {}

class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Core/RequireInterceptor",

	{
		effect: Effect.gen(function* () {
			const logger = yield* LoggerService;

			yield* logger.log("... [CONSTRUCTOR] RequireInterceptorService");

			yield* APIFactoryService;

			yield* ExtensionPathService;

			yield* NodeModuleShimService;

			return {};
		}),
	},
) {}

// =============================================================================
// --- UTILITY LAYERS ---
// =============================================================================

/** A layer for OpenTelemetry tracing, exporting spans to the console. */
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },

	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

/** A layer for the Effect DevTools, which requires a WebSocket constructor. */
const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor),
);

// =============================================================================
// --- LAYER COMPOSITION: The Progressive World Build ---
// This is the working pattern for composing the complex dependency graph.
// At each step, we merge a new set of services with the previously built "world"
// and then provide that world to the new services to resolve their dependencies.
// =============================================================================

// Level 1: The absolute foundation. Services with no dependencies.
const L1_World = Layer.mergeAll(
	ConfigurationService.Default,

	ProcessPatchService.Default,

	CancellationService.Default,

	LanguageFeatureService.Default,

	IPCConfigurationService.Default,

	InitDataService.Default,
);

// Level 2: Services that depend only on Level 1.
const L2_Services = Layer.mergeAll(
	LoggerService.Default,

	IPCService.Default,

	ExtensionPathService.Default,
);

const L2_World = Layer.merge(L1_World, L2_Services).pipe(
	Layer.provide(L1_World),
);

// Level 3: Services that depend on the L2_World.
const L3_Services = Layer.mergeAll(
	APIDeprecationService.Default,

	HostKindPickerService.Default,

	NodeModuleShimService.Default,
);

const L3_World = Layer.merge(L2_World, L3_Services).pipe(
	Layer.provide(L2_World),
);

// Level 4: Services that depend on the L3_World.
const L4_Services = Layer.mergeAll(
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
);

const L4_World = Layer.merge(L3_World, L4_Services).pipe(
	Layer.provide(L3_World),
);

// Level 5: Services that depend on the L4_World.
const L5_Services = Layer.mergeAll(
	EnvironmentService.Default,

	FileSystemService.Default,

	CommandService.Default,
);

const L5_World = Layer.merge(L4_World, L5_Services).pipe(
	Layer.provide(L4_World),
);

// Level 6: Services that depend on the L5_World.
const L6_Services = Layer.mergeAll(
	StoragePathService.Default,

	WorkSpaceService.Default,

	StatusBarService.Default,

	TreeViewService.Default,
);

const L6_World = Layer.merge(L5_World, L6_Services).pipe(
	Layer.provide(L5_World),
);

// Level 7: Services that depend on the L6_World.
const L7_Services = Layer.mergeAll(ExtensionHostService.Default);

const L7_World = Layer.merge(L6_World, L7_Services).pipe(
	Layer.provide(L6_World),
);

// Level 8: Services that depend on the L7_World.
const L8_Services = Layer.mergeAll(ExtensionService.Default);

const L8_World = Layer.merge(L7_World, L8_Services).pipe(
	Layer.provide(L7_World),
);

// Level 9: Services that depend on the L8_World.
const L9_Services = Layer.mergeAll(APIFactoryService.Default);

const L9_World = Layer.merge(L8_World, L9_Services).pipe(
	Layer.provide(L8_World),
);

// Level 10: The top-level services.
const L10_Services = Layer.mergeAll(
	ESMInterceptorService.Default,

	RequireInterceptorService.Default,
);

const AppLayer = Layer.merge(L9_World, L10_Services).pipe(
	Layer.provide(L9_World),
);

// =============================================================================
// --- APPLICATION ENTRYPOINT ---
// =============================================================================

/** The main logic for the application. */
const mainLogic = Effect.gen(function* () {
	// This first `yield*` will trigger the construction of LoggerService.
	const logger = yield* LoggerService;

	yield* logger.log("--- Main logic started. Base logger is available. ---");

	yield* logger.log(
		"--- Triggering full initialization by requesting top-level services... ---",
	);

	// Requesting the highest-level services will cause the DI container
	// to build everything they depend on, in the correct order.
	// The logs in their constructors will fire as they are built.
	yield* RequireInterceptorService;

	yield* ESMInterceptorService;

	yield* logger.log(
		"--- Initialization complete. All services are built and memoized. ---",
	);

	yield* logger.log("Application is now running and will hang indefinitely.");

	// `Effect.never` creates an effect that never completes, which is ideal for
	// modeling a long-running application process that should not exit.
	yield* Effect.never;
});

/**
 * The final, executable Effect for the application.
 * It combines the main logic with the fully resolved application layer (`AppLayer`)
 * and the utility layers for tracing and dev tools.
 */
const MainEffect = Effect.provide(mainLogic, AppLayer).pipe(
	Effect.provide(Layer.merge(TracingLive, DevToolsLive)),

	Effect.withSpan("cocoon-main-app-fixed"),

	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
