/*
 * File: Cocoon_Single_Manual.ts
 * Approach: A manual, step-by-step layer composition. More fragile but useful
 * for conceptually understanding the dependency graph. Includes OpenTelemetry tracing.
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

// --- Manual Layer Composition with OpenTelemetry Tracing ---

const traceLayer = <T extends Layer.Layer<any, any, any>>(
	name: string,
	layer: T,
): T => Layer.withSpan(layer, name) as T;

const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

const buildNextLevel = (
	levelName: string,
	servicesToBuild: Layer.Layer<any, any, any>,
	dependencyLayer: Layer.Layer<any, any, any>,
) => {
	const combinedProvider = Layer.merge(dependencyLayer, servicesToBuild);
	const resolvedServices = Layer.provide(servicesToBuild, combinedProvider);
	return Layer.merge(dependencyLayer, resolvedServices);
};

const L0_Services = Layer.mergeAll(
	traceLayer("ConfigurationService", ConfigurationService.Default),
	traceLayer("CancellationService", CancellationService.Default),
	traceLayer("LanguageFeatureService", LanguageFeatureService.Default),
	traceLayer("IPCConfigurationService", IPCConfigurationService.Default),
	traceLayer("InitDataService", InitDataService.Default),
	traceLayer("ProcessPatchService", ProcessPatchService.Default),
);
const Logger_Layer = traceLayer(
	"LoggerService",
	Layer.provide(LoggerService.Default, L0_Services),
);
const L0_Complete = Layer.merge(L0_Services, Logger_Layer);
const Core_Services = Layer.mergeAll(
	traceLayer("APIDeprecationService", APIDeprecationService.Default),
	traceLayer("HostKindPickerService", HostKindPickerService.Default),
	traceLayer("ExtensionPathService", ExtensionPathService.Default),
	traceLayer("NodeModuleShimService", NodeModuleShimService.Default),
);
const Core_Live = buildNextLevel("Core", Core_Services, L0_Complete);

const L1_Services = Layer.mergeAll(
	traceLayer("IPCService", IPCService.Default),
);
const L1_Live = buildNextLevel("Level 1", L1_Services, Core_Live);

const L2_Services = Layer.mergeAll(
	traceLayer("ClipboardService", ClipboardService.Default),
	traceLayer("DebugService", DebugService.Default),
	traceLayer("DiagnosticService", DiagnosticService.Default),
	traceLayer("DialogService", DialogService.Default),
	traceLayer("DocumentService", DocumentService.Default),
	traceLayer("LocalizationService", LocalizationService.Default),
	traceLayer("MessageService", MessageService.Default),
	traceLayer("QuickInputService", QuickInputService.Default),
	traceLayer("WebViewPanelService", WebViewPanelService.Default),
	traceLayer("WindowService", WindowService.Default),
	traceLayer("AuthenticationService", AuthenticationService.Default),
	traceLayer(
		"FileSystemInformationService",
		FileSystemInformationService.Default,
	),
	traceLayer("ProposedAPIService", ProposedAPIService.Default),
	traceLayer("SecretStorageService", SecretStorageService.Default),
	traceLayer("StorageService", StorageService.Default),
	traceLayer("TaskService", TaskService.Default),
	traceLayer("TelemetryService", TelemetryService.Default),
	traceLayer("EnvironmentService", EnvironmentService.Default),
);
const L2_Live = buildNextLevel("Level 2", L2_Services, L1_Live);

const L3_Services = Layer.mergeAll(
	traceLayer("FileSystemService", FileSystemService.Default),
	traceLayer("CommandService", CommandService.Default),
);
const L3_Live = buildNextLevel("Level 3", L3_Services, L2_Live);

const L4_Services = Layer.mergeAll(
	traceLayer("StoragePathService", StoragePathService.Default),
	traceLayer("WorkSpaceService", WorkSpaceService.Default),
	traceLayer("StatusBarService", StatusBarService.Default),
	traceLayer("TreeViewService", TreeViewService.Default),
	traceLayer("ExtensionHostService", ExtensionHostService.Default),
);
const L4_Live = buildNextLevel("Level 4", L4_Services, L3_Live);

const L5_Services = Layer.mergeAll(
	traceLayer("ExtensionService", ExtensionService.Default),
);
const L5_Live = buildNextLevel("Level 5", L5_Services, L4_Live);

const L6_Services = Layer.mergeAll(
	traceLayer("APIFactoryService", APIFactoryService.Default),
);
const L6_Live = buildNextLevel("Level 6", L6_Services, L5_Live);

const L7_Services = Layer.mergeAll(
	traceLayer("ESMInterceptorService", ESMInterceptorService.Default),
	traceLayer("RequireInterceptorService", RequireInterceptorService.Default),
);
const ApplicationLive = buildNextLevel("Level 7", L7_Services, L6_Live);

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
	Effect.provide(Layer.merge(ApplicationLive, TracingLive)),
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
	Effect.withSpan("cocoon-main-app"),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
