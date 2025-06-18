/*
 * File: Cocoon_Single_Manual_Final.ts
 * Approach: A manual composition of layers, which can be fragile for complex graphs.
 * The final layer is provided along with utility layers.
 * Includes tracing and DevTools.
 */

import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
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

// --- Utility Layers ---
const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: "cocoon-skeleton" },
	spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));
const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor),
);

// --- Manual Layer Composition (Corrected) ---
const BaseServices = Layer.mergeAll(
	ConfigurationService.Default,
	CancellationService.Default,
	LanguageFeatureService.Default,
	IPCConfigurationService.Default,
	InitDataService.Default,
	ProcessPatchService.Default,
);
const LoggerLive = Layer.provide(LoggerService.Default, BaseServices);
const FoundationLive = Layer.merge(BaseServices, LoggerLive);
const CoreServices = Layer.mergeAll(
	APIDeprecationService.Default,
	HostKindPickerService.Default,
	ExtensionPathService.Default,
	NodeModuleShimService.Default,
);
const L1Services = Layer.mergeAll(IPCService.Default);
const L2Services = Layer.mergeAll(
	ClipboardService.Default,
	DebugService.Default,
	DiagnosticService.Default,
	DialogService.Default,
	DocumentService.Default,
	LocalizationService.Default,
	MessageService.Default,
	QuickInputService.Default,
	WebViewPanelService.Default,
	WindowService.Default,
	AuthenticationService.Default,
	FileSystemInformationService.Default,
	ProposedAPIService.Default,
	SecretStorageService.Default,
	StorageService.Default,
	TaskService.Default,
	TelemetryService.Default,
	EnvironmentService.Default,
);
const L3Services = Layer.mergeAll(
	FileSystemService.Default,
	CommandService.Default,
);
const L4Services = Layer.mergeAll(
	StoragePathService.Default,
	WorkSpaceService.Default,
	StatusBarService.Default,
	TreeViewService.Default,
	ExtensionHostService.Default,
);
const L5Services = Layer.mergeAll(ExtensionService.Default);
const L6Services = Layer.mergeAll(APIFactoryService.Default);
const L7Services = Layer.mergeAll(
	ESMInterceptorService.Default,
	RequireInterceptorService.Default,
);

// Merge all layers into a single, unresolved layer
const AllServicesUnresolved = Layer.mergeAll(
	FoundationLive,
	CoreServices,
	L1Services,
	L2Services,
	L3Services,
	L4Services,
	L5Services,
	L6Services,
	L7Services,
);
// Resolve all internal dependencies in one step
const ApplicationLive = Layer.provide(
	AllServicesUnresolved,
	AllServicesUnresolved,
);

// --- Main Application Effect ---
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
	Effect.provide([ApplicationLive, TracingLive, DevToolsLive]),
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
	Effect.withSpan("cocoon-main-app-manual"),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
