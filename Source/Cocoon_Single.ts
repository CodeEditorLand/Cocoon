/*
 * File: Cocoon_Single.ts
 * Responsibility: A single-file, dependency-free skeleton of the Cocoon
 * application's layer architecture. This file is designed to statically
 * analyze and debug layer composition issues by allowing the TypeScript
 * compiler to see the entire dependency graph.
 *
 * This version uses the Effect.Service pattern for more declarative and
 * maintainable service definitions.
 */

import { NodeRuntime } from "@effect/platform-node";
import { Context, Effect, Layer, Logger } from "effect";

// --- Placeholder Types ---
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

// --- Service Definitions using Effect.Service ---
// Each service is defined using `Effect.Service`, which combines the
// `Context.Tag` and a default `Layer` implementation in one place.
// The implementation is a stub, but the dependencies are explicitly listed.

// --- Core Services ---
class APIFactoryService extends Effect.Service<APIFactoryService>()(
	"Core/APIFactory",
	{
		succeed: () => ({}),
		dependencies: [
			APIDeprecationService,
			CommandService,
			DebugService,
			DocumentService,
			ExtensionService,
			LanguageFeatureService,
			Logger,
			ProposedAPIService,
			StatusBarService,
			TaskService,
			TreeViewService,
			WebViewPanelService,
			WindowService,
			WorkSpaceService,
		],
	},
) {}

class ESMInterceptorService extends Effect.Service<ESMInterceptorService>()(
	"Core/ESMInterceptor",
	{
		succeed: () => ({}),
		dependencies: [APIFactoryService, ExtensionPathService, Logger],
	},
) {}

class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Core/ExtensionHost",
	{
		succeed: () => ({}),
		dependencies: [IPCService, InitDataService, Logger, TelemetryService],
	},
) {}

class ExtensionPathService extends Effect.Service<ExtensionPathService>()(
	"Core/ExtensionPath",
	{
		succeed: () => ({}),
		dependencies: [InitDataService],
	},
) {}

class HostKindPickerService extends Effect.Service<HostKindPickerService>()(
	"Core/HostKindPicker",
	{
		succeed: () => ({}),
		dependencies: [Logger],
	},
) {}

class NodeModuleShimService extends Effect.Service<NodeModuleShimService>()(
	"Core/NodeModuleShim",
	{
		succeed: () => ({}),
		dependencies: [Logger, InitDataService],
	},
) {}

class RequireInterceptorService extends Effect.Service<RequireInterceptorService>()(
	"Core/RequireInterceptor",
	{
		succeed: () => ({}),
		dependencies: [
			APIFactoryService,
			ExtensionPathService,
			NodeModuleShimService,
			Logger,
		],
	},
) {}

class ProcessPatchService extends Effect.Service<ProcessPatchService>()(
	"PatchProcess/ProcessPatch",
	{
		succeed: () => ({}),
	},
) {}

// --- Application Services (A-Z) ---
class APIDeprecationService extends Effect.Service<APIDeprecationService>()(
	"Service/APIDeprecation",
	{
		succeed: () => ({}),
		dependencies: [Logger],
	},
) {}

class AuthenticationService extends Effect.Service<AuthenticationService>()(
	"Service/Authentication",
	{
		succeed: () => ({}),
		dependencies: [IPCService, Logger],
	},
) {}

class CancellationService extends Effect.Service<CancellationService>()(
	"Service/Cancellation",
	{ succeed: () => ({}) },
) {}

class ClipboardService extends Effect.Service<ClipboardService>()(
	"Service/Clipboard",
	{
		succeed: () => ({}),
		dependencies: [IPCService],
	},
) {}

class CommandService extends Effect.Service<CommandService>()(
	"Service/Command",
	{
		succeed: () => ({}),
		dependencies: [IPCService, TelemetryService, WindowService],
	},
) {}

class ConfigurationService extends Effect.Service<ConfigurationService>()(
	"Service/Configuration",
	{
		succeed: () => ({}),
		dependencies: [IPCService, Logger],
	},
) {}

class DebugService extends Effect.Service<DebugService>()("Service/Debug", {
	succeed: () => ({}),
	dependencies: [IPCService],
}) {}

class DiagnosticService extends Effect.Service<DiagnosticService>()(
	"Service/Diagnostic",
	{
		succeed: () => ({}),
		dependencies: [IPCService],
	},
) {}

class DialogService extends Effect.Service<DialogService>()("Service/Dialog", {
	succeed: () => ({}),
	dependencies: [IPCService],
}) {}

class DocumentService extends Effect.Service<DocumentService>()(
	"Service/Document",
	{
		succeed: () => ({}),
		dependencies: [IPCService],
	},
) {}

class EnvironmentService extends Effect.Service<EnvironmentService>()(
	"Service/Environment",
	{
		succeed: () => ({}),
		dependencies: [IPCService, InitDataService, ClipboardService],
	},
) {}

class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{
		succeed: () => ({}),
		dependencies: [ExtensionHostService, InitDataService],
	},
) {}

class FileSystemService extends Effect.Service<FileSystemService>()(
	"Service/FileSystem",
	{
		succeed: () => ({}),
		dependencies: [IPCService, FileSystemInformationService],
	},
) {}

class FileSystemInformationService extends Effect.Service<FileSystemInformationService>()(
	"Service/FileSystemInformation",
	{
		succeed: () => ({}),
		dependencies: [IPCService, Logger],
	},
) {}

class InitDataService extends Effect.Service<InitDataService>()(
	"Service/InitData",
	{
		succeed: () => DUMMY_INIT_DATA,
	},
) {}

class IPCConfigurationService extends Effect.Service<IPCConfigurationService>()(
	"Service/IPCConfiguration",
	{
		succeed: () => ({}),
	},
) {}

class IPCService extends Effect.Service<IPCService>()("Service/IPC", {
	succeed: () => ({}),
	dependencies: [IPCConfigurationService, CancellationService],
}) {}

class LanguageFeatureService extends Effect.Service<LanguageFeatureService>()(
	"Service/LanguageFeature",
	{
		succeed: () => ({}),
	},
) {}

class LocalizationService extends Effect.Service<LocalizationService>()(
	"Service/Localization",
	{
		succeed: () => ({}),
		dependencies: [IPCService, InitDataService],
	},
) {}

class MessageService extends Effect.Service<MessageService>()(
	"Service/Message",
	{
		succeed: () => ({}),
		dependencies: [IPCService],
	},
) {}

class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{
		succeed: () => ({}),
		dependencies: [InitDataService, Logger],
	},
) {}

class QuickInputService extends Effect.Service<QuickInputService>()(
	"Service/QuickInput",
	{
		succeed: () => ({}),
		dependencies: [IPCService],
	},
) {}

class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{
		succeed: () => ({}),
		dependencies: [IPCService, Logger],
	},
) {}

class StatusBarService extends Effect.Service<StatusBarService>()(
	"Service/StatusBar",
	{
		succeed: () => ({}),
		dependencies: [IPCService, CommandService],
	},
) {}

class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",
	{
		succeed: () => ({}),
		dependencies: [IPCService, Logger],
	},
) {}

class StoragePathService extends Effect.Service<StoragePathService>()(
	"Service/StoragePath",
	{
		succeed: () => ({}),
		dependencies: [InitDataService, Logger, FileSystemService],
	},
) {}

class TaskService extends Effect.Service<TaskService>()("Service/Task", {
	succeed: () => ({}),
	dependencies: [IPCService, CancellationService],
}) {}

class TelemetryService extends Effect.Service<TelemetryService>()(
	"Service/Telemetry",
	{
		succeed: () => ({}),
		dependencies: [InitDataService, IPCService, Logger],
	},
) {}

class TreeViewService extends Effect.Service<TreeViewService>()(
	"Service/TreeView",
	{
		succeed: () => ({}),
		dependencies: [IPCService, CommandService],
	},
) {}

class WebViewPanelService extends Effect.Service<WebViewPanelService>()(
	"Service/WebViewPanel",
	{
		succeed: () => ({}),
		dependencies: [IPCService],
	},
) {}

class WindowService extends Effect.Service<WindowService>()("Service/Window", {
	succeed: () => ({}),
	dependencies: [IPCService],
}) {}

class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{
		succeed: () => ({}),
		dependencies: [
			IPCService,
			DocumentService,
			FileSystemService,
			ConfigurationService,
		],
	},
) {}

// --- Layer Composition & Main Logic ---

// The `Effect.Service` pattern automatically generates a `.Live` layer for
// each service. This layer includes all the dependencies we defined.
// `Layer.mergeAll` is smart enough to build the entire dependency graph.
const ApplicationLive = Layer.mergeAll(
	APIFactoryService.Live,
	ESMInterceptorService.Live,
	ExtensionHostService.Live,
	ExtensionPathService.Live,
	HostKindPickerService.Live,
	NodeModuleShimService.Live,
	RequireInterceptorService.Live,
	ProcessPatchService.Live,
	APIDeprecationService.Live,
	AuthenticationService.Live,
	CancellationService.Live,
	ClipboardService.Live,
	CommandService.Live,
	ConfigurationService.Live,
	DebugService.Live,
	DiagnosticService.Live,
	DialogService.Live,
	DocumentService.Live,
	EnvironmentService.Live,
	ExtensionService.Live,
	FileSystemService.Live,
	FileSystemInformationService.Live,
	IPCService.Live,
	LanguageFeatureService.Live,
	LocalizationService.Live,
	MessageService.Live,
	ProposedAPIService.Live,
	QuickInputService.Live,
	SecretStorageLive.Live,
	StatusBarService.Live,
	StorageService.Live,
	StoragePathService.Live,
	TaskService.Live,
	TelemetryService.Live,
	TreeViewService.Live,
	WebViewPanelService.Live,
	WindowService.Live,
	WorkSpaceService.Live,
	// Primitives/Defaults
	IPCConfigurationService.Live,
	InitDataService.Live, // Uses the DUMMY_INIT_DATA by default
	Logger.logFmt, // The single, unified logger implementation
);

const MainEffect = Effect.gen(function* () {
	yield* Effect.logInfo("Main effect running...");
	// We prove the layer works by requesting a few services.
	// If any of these were not provided, the compiler would fail.
	yield* ExtensionHostService;
	yield* RequireInterceptorService;
	yield* APIFactoryService;
	const RunProcessPatch: Effect.Effect<
		void,
		never,
		ProcessPatchService | InitDataService | IPCService
	> = Effect.void;
	yield* RunProcessPatch; // This effect also has dependencies that must be met.
	yield* Effect.logInfo(
		"Cocoon skeleton is fully initialized. All services were resolved.",
	);
	yield* Effect.never;
}).pipe(
	// Provide the fully resolved layer.
	// `ApplicationLive` has no remaining requirements, so this is valid.
	Effect.provide(ApplicationLive),
	Effect.catchAllCause((cause) =>
		Effect.logFatal("Cocoon main process failed.", cause),
	),
);

// --- Run the Application ---
NodeRuntime.runMain(MainEffect);
