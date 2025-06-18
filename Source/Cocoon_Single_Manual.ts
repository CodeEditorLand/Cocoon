/*
 * File: Cocoon_Single_Manual_EagerBuild_v3.ts
 * Approach: A manual, step-by-step composition, but made robust by using
 * Layer.build to eagerly construct the final layer. Includes tracing and DevTools.
 * This version uses Effect.provide(effect, context) for compatibility.
 */

import { DevTools } from "@effect/experimental";
// Import required OpenTelemetry modules for tracing
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { Context, Effect, Layer } from "effect";

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

// --- Manual Layer Composition ---
const buildNextLevel = (
	servicesToBuild: Layer.Layer<any, any, any>,
	dependencyLayer: Layer.Layer<any, any, any>,
) => {
	const combinedProvider = Layer.merge(dependencyLayer, servicesToBuild);
	const resolvedServices = Layer.provide(servicesToBuild, combinedProvider);
	return Layer.merge(dependencyLayer, resolvedServices);
};
const L0_Services = Layer.mergeAll(
	ConfigurationService.Default,
	CancellationService.Default,
	LanguageFeatureService.Default,
	IPCConfigurationService.Default,
	InitDataService.Default,
	ProcessPatchService.Default,
);
const Logger_Layer = Layer.provide(LoggerService.Default, L0_Services);
const L0_Complete = Layer.merge(L0_Services, Logger_Layer);
const Core_Services = Layer.mergeAll(
	APIDeprecationService.Default,
	HostKindPickerService.Default,
	ExtensionPathService.Default,
	NodeModuleShimService.Default,
);
const Core_Live = buildNextLevel(Core_Services, L0_Complete);
const L1_Services = Layer.mergeAll(IPCService.Default);
const L1_Live = buildNextLevel(L1_Services, Core_Live);
const L2_Services = Layer.mergeAll(
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
const L2_Live = buildNextLevel(L2_Services, L1_Live);
const L3_Services = Layer.mergeAll(
	FileSystemService.Default,
	CommandService.Default,
);
const L3_Live = buildNextLevel(L3_Services, L2_Live);
const L4_Services = Layer.mergeAll(
	StoragePathService.Default,
	WorkSpaceService.Default,
	StatusBarService.Default,
	TreeViewService.Default,
	ExtensionHostService.Default,
);
const L4_Live = buildNextLevel(L4_Services, L3_Live);
const L5_Services = Layer.mergeAll(ExtensionService.Default);
const L5_Live = buildNextLevel(L5_Services, L4_Live);
const L6_Services = Layer.mergeAll(APIFactoryService.Default);
const L6_Live = buildNextLevel(L6_Services, L5_Live);
const L7_Services = Layer.mergeAll(
	ESMInterceptorService.Default,
	RequireInterceptorService.Default,
);
const ApplicationLive = buildNextLevel(L7_Services, L6_Live);

// --- Main Logic (Requires a fully-formed environment) ---
const mainLogic = Effect.gen(function* () {
	const logger = yield* LoggerService;
	yield* logger.log("Main logic running...");
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
});

// --- Final Eager Build and Execution ---
const FullLayer = Layer.mergeAll(ApplicationLive, TracingLive, DevToolsLive);
const buildAndGetEnv = Layer.build(FullLayer);
const MainEffect = buildAndGetEnv.pipe(
	Effect.flatMap((environment: Context.Context<any>) =>
		Effect.provide(mainLogic, environment),
	),
	Effect.withSpan("cocoon-main-app-manual-eager"),
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
