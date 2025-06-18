/*
 * File: Cocoon_Single_Atomic.ts
 * Approach: The most robust method. Merges all service layers into one and
 * resolves them in a single, atomic step. Includes OpenTelemetry tracing.
 */

// Import required OpenTelemetry modules for tracing
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Effect, Layer } from "effect";

// --- Placeholder Types & Service Definitions (Unchanged) ---
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
class ConfigurationService extends Effect.Service<ConfigurationService>()(
	"Service/Configuration",
	{ sync: () => ({ logLevel: "INFO" as const }) },
) {}
class LoggerService extends Effect.Service<LoggerService>()("Service/Logger", {
	effect: Effect.gen(function* () {
		const config = yield* ConfigurationService;
		return {
			log: (message: string) =>
				Effect.sync(() => {
					console.log(`[${config.logLevel}] ${message}`);
				}),
		};
	}),
}) {}
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
class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			return {};
		}),
	},
) {}
class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Core/HostKindPicker",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			return {};
		}),
	},
) {}
class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	effect: Effect.gen(function* () {
		yield* IPCConfigurationService;
		yield* CancellationService;
		return {};
	}),
}) {}
class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Core/ExtensionPath",
	{
		effect: Effect.gen(function* () {
			yield* InitDataService;
			return {};
		}),
	},
) {}
class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Core/NodeModuleShim",
	{
		effect: Effect.gen(function* () {
			yield* LoggerService;
			yield* InitDataService;
			return {};
		}),
	},
) {}
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
class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{
		effect: Effect.gen(function* () {
			yield* InitDataService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",
	{
		effect: Effect.gen(function* () {
			yield* IPCService;
			yield* LoggerService;
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
class TelemetryService extends Effect.Service<TelemetryService>()(
	"Service/Telemetry",
	{
		effect: Effect.gen(function* () {
			yield* InitDataService;
			yield* IPCService;
			yield* LoggerService;
			return {};
		}),
	},
) {}
class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* IPCService;
				yield* InitDataService;
				yield* ClipboardService;
				return {};
			}),
		),
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
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* IPCService;
				yield* TelemetryService;
				yield* WindowService;
				return {};
			}),
		),
	},
) {}
class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",
	{
		effect: Effect.gen(function* () {
			yield* InitDataService;
			yield* LoggerService;
			yield* FileSystemService;
			return {};
		}),
	},
) {}
class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* IPCService;
				yield* DocumentService;
				yield* FileSystemService;
				yield* ConfigurationService;
				return {};
			}),
		),
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
class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Core/ExtensionHost",
	{
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* IPCService;
				yield* InitDataService;
				yield* LoggerService;
				yield* TelemetryService;
				return {};
			}),
		),
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
	"Core/APIFactory",
	{
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* APIDeprecationService;
				yield* CommandService;
				yield* DebugService;
				yield* DocumentService;
				yield* ExtensionService;
				yield* LanguageFeatureService;
				yield* LoggerService;
				yield* ProposedAPIService;
				yield* StatusBarService;
				yield* TaskService;
				yield* TreeViewService;
				yield* WebViewPanelService;
				yield* WindowService;
				yield* WorkSpaceService;
				return {};
			}),
		),
	},
) {}
class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Core/ESMInterceptor",
	{
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* APIFactoryService;
				yield* ExtensionPathService;
				yield* LoggerService;
				return {};
			}),
		),
	},
) {}
class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Core/RequireInterceptor",
	{
		effect: Effect.suspend(() =>
			Effect.gen(function* () {
				yield* APIFactoryService;
				yield* ExtensionPathService;
				yield* NodeModuleShimService;
				yield* LoggerService;
				return {};
			}),
		),
	},
) {}

// --- Atomic Layer Composition with OpenTelemetry Tracing ---

/**
 * A helper function to wrap a layer's construction in a trace span.
 */
const traceLayer = <T extends Layer.Layer<any, any, any>>(
	name: string,
	layer: T,
): T => Layer.withSpan(layer, name) as T;

// This layer configures the OpenTelemetry SDK to export trace data to the console.
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

// 1. Merge ALL service layers into a single, massive, unresolved layer.
// Each individual layer is wrapped in a span for detailed tracing.
const AllServicesUnresolved = Layer.mergeAll(
	traceLayer("APIFactoryService", APIFactoryService.Default),
	traceLayer("ESMInterceptorService", ESMInterceptorService.Default),
	traceLayer("ExtensionHostService", ExtensionHostService.Default),
	traceLayer("ExtensionPathService", ExtensionPathService.Default),
	traceLayer("HostKindPickerService", HostKindPickerService.Default),
	traceLayer("NodeModuleShimService", NodeModuleShimService.Default),
	traceLayer("RequireInterceptorService", RequireInterceptorService.Default),
	traceLayer("ProcessPatchService", ProcessPatchService.Default),
	traceLayer("APIDeprecationService", APIDeprecationService.Default),
	traceLayer("AuthenticationService", AuthenticationService.Default),
	traceLayer("CancellationService", CancellationService.Default),
	traceLayer("ClipboardService", ClipboardService.Default),
	traceLayer("CommandService", CommandService.Default),
	traceLayer("ConfigurationService", ConfigurationService.Default),
	traceLayer("DebugService", DebugService.Default),
	traceLayer("DiagnosticService", DiagnosticService.Default),
	traceLayer("DialogService", DialogService.Default),
	traceLayer("DocumentService", DocumentService.Default),
	traceLayer("EnvironmentService", EnvironmentService.Default),
	traceLayer("ExtensionService", ExtensionService.Default),
	traceLayer("FileSystemService", FileSystemService.Default),
	traceLayer(
		"FileSystemInformationService",
		FileSystemInformationService.Default,
	),
	traceLayer("IPCService", IPCService.Default),
	traceLayer("LanguageFeatureService", LanguageFeatureService.Default),
	traceLayer("LocalizationService", LocalizationService.Default),
	traceLayer("MessageService", MessageService.Default),
	traceLayer("ProposedAPIService", ProposedAPIService.Default),
	traceLayer("QuickInputService", QuickInputService.Default),
	traceLayer("SecretStorageService", SecretStorageService.Default),
	traceLayer("StatusBarService", StatusBarService.Default),
	traceLayer("StorageService", StorageService.Default),
	traceLayer("StoragePathService", StoragePathService.Default),
	traceLayer("TaskService", TaskService.Default),
	traceLayer("TelemetryService", TelemetryService.Default),
	traceLayer("TreeViewService", TreeViewService.Default),
	traceLayer("WebViewPanelService", WebViewPanelService.Default),
	traceLayer("WindowService", WindowService.Default),
	traceLayer("WorkSpaceService", WorkSpaceService.Default),
	traceLayer("IPCConfigurationService", IPCConfigurationService.Default),
	traceLayer("InitDataService", InitDataService.Default),
	traceLayer("LoggerService", LoggerService.Default),
);

// 2. Create the final, runnable layer by providing the big layer to itself.
// This single, atomic step resolves all internal dependencies, including circular ones.
const ApplicationLive = Layer.provide(
	AllServicesUnresolved,
	AllServicesUnresolved,
);

// --- Main Application Effect (using .pipe) ---

const MainEffect = Effect.gen(function* () {
	const logger = yield* LoggerService;

	yield* logger.log("Main effect running...");

	yield* ExtensionHostService;
	yield* RequireInterceptorService;
	yield* APIFactoryService;

	const RunProcessPatch: Effect.Effect<
		void,
		never,
		ProcessPatchService | InitDataService | IPCService
	> = Effect.void;
	yield* RunProcessPatch;

	yield* logger.log(
		"Cocoon skeleton is fully initialized. All services were resolved.",
	);

	yield* Effect.never;
}).pipe(
	// Provide both the application layer and the tracing layer
	Effect.provide(Layer.merge(ApplicationLive, TracingLive)),
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
	// Wrap the entire application in a root span for context
	Effect.withSpan("cocoon-main-app"),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
