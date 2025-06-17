/*
 * File: Cocoon_Single.ts
 * Responsibility: A single-file, dependency-free skeleton of the Cocoon
 * application's layer architecture. This file is designed to statically
 * analyze and debug layer composition issues by allowing the TypeScript
 * compiler to see the entire dependency graph.
 *
 * All service implementations are stubbed out. The focus is exclusively on
 * the `Context.Tag` definitions and the `Layer` composition.
 */

import { NodeRuntime } from "@effect/platform-node";
import { Context, Effect, Layer, Logger } from "effect";

// --- Placeholder Types ---
// These are minimal stubs for complex types to satisfy the compiler.
interface IExtensionHostInitData {
	readonly extensions: {
		readonly allExtensions: readonly any[];
	};

	readonly environment: any;

	readonly logLevel: any;

	readonly remote: any;

	readonly telemetryInfo: any;

	readonly uiKind: any;

	readonly quality: any;

	readonly workspace: any;
}

// A dummy object to represent the initialization data we receive.
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

// --- Service Tag Definitions ---
// Each service is represented by a Context.Tag.
// The implementation details are irrelevant for this debugging exercise,

// so the service interface is defined as a minimal `{}`.

// --- Core Services ---
class APIFactoryService extends Context.Tag("Core/APIFactory")<
	APIFactoryService,
	{}
>() {}
class ESMInterceptorService extends Context.Tag("Core/ESMInterceptor")<
	ESMInterceptorService,
	{}
>() {}
class ExtensionHostService extends Context.Tag("Core/ExtensionHost")<
	ExtensionHostService,
	{}
>() {}
class ExtensionPathService extends Context.Tag("Core/ExtensionPath")<
	ExtensionPathService,
	{}
>() {}
class HostKindPickerService extends Context.Tag("Core/HostKindPicker")<
	HostKindPickerService,
	{}
>() {}
class NodeModuleShimService extends Context.Tag("Core/NodeModuleShim")<
	NodeModuleShimService,
	{}
>() {}
class RequireInterceptorService extends Context.Tag("Core/RequireInterceptor")<
	RequireInterceptorService,
	{}
>() {}
class ProcessPatchService extends Context.Tag("PatchProcess/ProcessPatch")<
	ProcessPatchService,
	{}
>() {}

// --- Application Services (A-Z) ---
class APIDeprecationService extends Context.Tag("Service/APIDeprecation")<
	APIDeprecationService,
	{}
>() {}
class AuthenticationService extends Context.Tag("Service/Authentication")<
	AuthenticationService,
	{}
>() {}
class CancellationService extends Context.Tag("Service/Cancellation")<
	CancellationService,
	{}
>() {}
class ClipboardService extends Context.Tag("Service/Clipboard")<
	ClipboardService,
	{}
>() {}
class CommandService extends Context.Tag("Service/Command")<
	CommandService,
	{}
>() {}
class ConfigurationService extends Context.Tag("Service/Configuration")<
	ConfigurationService,
	{}
>() {}
class DebugService extends Context.Tag("Service/Debug")<DebugService, {}>() {}
class DiagnosticService extends Context.Tag("Service/Diagnostic")<
	DiagnosticService,
	{}
>() {}
class DialogService extends Context.Tag("Service/Dialog")<
	DialogService,
	{}
>() {}
class DocumentService extends Context.Tag("Service/Document")<
	DocumentService,
	{}
>() {}
class EnvironmentService extends Context.Tag("Service/Environment")<
	EnvironmentService,
	{}
>() {}
class ExtensionService extends Context.Tag("Service/Extension")<
	ExtensionService,
	{}
>() {}
class FileSystemService extends Context.Tag("Service/FileSystem")<
	FileSystemService,
	{}
>() {}
class FileSystemInformationService extends Context.Tag(
	"Service/FileSystemInformation",
)<FileSystemInformationService, {}>() {}
class InitDataService extends Context.Tag("Service/InitData")<
	InitDataService,
	IExtensionHostInitData
>() {}
class IPCConfigurationService extends Context.Tag("Service/IPCConfiguration")<
	IPCConfigurationService,
	{}
>() {}
class IPCService extends Context.Tag("Service/IPC")<IPCService, {}>() {}
class LanguageFeatureService extends Context.Tag("Service/LanguageFeature")<
	LanguageFeatureService,
	{}
>() {}
class LocalizationService extends Context.Tag("Service/Localization")<
	LocalizationService,
	{}
>() {}
class LogService extends Context.Tag("Service/Log")<LogService, {}>() {}
class MessageService extends Context.Tag("Service/Message")<
	MessageService,
	{}
>() {}
class ProposedAPIService extends Context.Tag("Service/ProposedAPI")<
	ProposedAPIService,
	{}
>() {}
class QuickInputService extends Context.Tag("Service/QuickInput")<
	QuickInputService,
	{}
>() {}
class SecretStorageService extends Context.Tag("Service/SecretStorage")<
	SecretStorageService,
	{}
>() {}
class StatusBarService extends Context.Tag("Service/StatusBar")<
	StatusBarService,
	{}
>() {}
class StorageService extends Context.Tag("Service/Storage")<
	StorageService,
	{}
>() {}
class StoragePathService extends Context.Tag("Service/StoragePath")<
	StoragePathService,
	{}
>() {}
class TaskService extends Context.Tag("Service/Task")<TaskService, {}>() {}
class TelemetryService extends Context.Tag("Service/Telemetry")<
	TelemetryService,
	{}
>() {}
class TreeViewService extends Context.Tag("Service/TreeView")<
	TreeViewService,
	{}
>() {}
class WebViewPanelService extends Context.Tag("Service/WebViewPanel")<
	WebViewPanelService,
	{}
>() {}
class WindowService extends Context.Tag("Service/Window")<
	WindowService,
	{}
>() {}
class WorkSpaceService extends Context.Tag("Service/WorkSpace")<
	WorkSpaceService,
	{}
>() {}

// --- Stubbed Live Layer Definitions ---
// Each layer provides one service. Its type signature explicitly declares all
// the other services it depends on (its requirements, or `R`). The
// implementation is just a stub (`Effect.succeed({})`) that provides an empty object.

// A helper for creating stub layers.
const stubLayer = <T extends Context.Tag<any, any>>(tag: T) =>
	Layer.effect(tag, Effect.succeed({}));

// --- Core Service Layers ---
const APIFactoryLive: Layer.Layer<
	APIFactoryService,
	never,
	| APIDeprecationService
	| CommandService
	| DebugService
	| DocumentService
	| ExtensionService
	| LanguageFeatureService
	| LogService
	| ProposedAPIService
	| StatusBarService
	| TaskService
	| TreeViewService
	| WebViewPanelService
	| WindowService
	| WorkSpaceService
> = stubLayer(APIFactoryService);

const ESMInterceptorLive: Layer.Layer<
	ESMInterceptorService,
	never,
	APIFactoryService | ExtensionPathService | LogService
> = stubLayer(ESMInterceptorService);

const ExtensionHostLive: Layer.Layer<
	ExtensionHostService,
	never,
	IPCService | InitDataService | LogService | TelemetryService
> = stubLayer(ExtensionHostService);

const ExtensionPathLive: Layer.Layer<
	ExtensionPathService,
	never,
	InitDataService
> = stubLayer(ExtensionPathService);

const HostKindPickerLive: Layer.Layer<
	HostKindPickerService,
	never,
	LogService
> = stubLayer(HostKindPickerService);

const NodeModuleShimLive: Layer.Layer<
	NodeModuleShimService,
	never,
	LogService | InitDataService
> = stubLayer(NodeModuleShimService);

const RequireInterceptorLive: Layer.Layer<
	RequireInterceptorService,
	never,
	| APIFactoryService
	| ExtensionPathService
	| NodeModuleShimService
	| LogService
> = stubLayer(RequireInterceptorService);

// --- PatchProcess Layer ---
const ProcessPatchLive: Layer.Layer<ProcessPatchService, never, never> =
	stubLayer(ProcessPatchService);

const RunProcessPatch: Effect.Effect<
	void,
	never,
	ProcessPatchService | InitDataService | IPCService
> = Effect.void;

// --- Application Service Layers (A-Z) ---
const APIDeprecationLive: Layer.Layer<
	APIDeprecationService,
	never,
	LogService
> = stubLayer(APIDeprecationService);

const AuthenticationLive: Layer.Layer<
	AuthenticationService,
	never,
	IPCService | LogService
> = stubLayer(AuthenticationService);

const CancellationLive: Layer.Layer<CancellationService, never, never> =
	stubLayer(CancellationService);

const ClipboardLive: Layer.Layer<ClipboardService, never, IPCService> =
	stubLayer(ClipboardService);

const CommandLive: Layer.Layer<
	CommandService,
	never,
	IPCService | TelemetryService | WindowService
> = stubLayer(CommandService);

const ConfigurationLive: Layer.Layer<
	ConfigurationService,
	never,
	IPCService | LogService
> = stubLayer(ConfigurationService);

const DebugLive: Layer.Layer<DebugService, never, IPCService> =
	stubLayer(DebugService);

const DiagnosticLive: Layer.Layer<DiagnosticService, never, IPCService> =
	stubLayer(DiagnosticService);

const DialogLive: Layer.Layer<DialogService, never, IPCService> =
	stubLayer(DialogService);

const DocumentLive: Layer.Layer<DocumentService, never, IPCService> =
	stubLayer(DocumentService);

const EnvironmentLive: Layer.Layer<
	EnvironmentService,
	never,
	IPCService | InitDataService | ClipboardService
> = stubLayer(EnvironmentService);

const ExtensionLive: Layer.Layer<
	ExtensionService,
	never,
	ExtensionHostService | InitDataService
> = stubLayer(ExtensionService);

const FileSystemLive: Layer.Layer<
	FileSystemService,
	never,
	IPCService | FileSystemInformationService
> = stubLayer(FileSystemService);

const FileSystemInformationLive: Layer.Layer<
	FileSystemInformationService,
	never,
	IPCService | LogService
> = stubLayer(FileSystemInformationService);

const IPCConfigurationLive: Layer.Layer<IPCConfigurationService, never, never> =
	Layer.succeed(IPCConfigurationService, {});

const IPCLive: Layer.Layer<
	IPCService,
	never,
	IPCConfigurationService | CancellationService
> = stubLayer(IPCService);

const LanguageFeatureLive: Layer.Layer<LanguageFeatureService, never, never> =
	stubLayer(LanguageFeatureService);

const LocalizationLive: Layer.Layer<
	LocalizationService,
	never,
	IPCService | InitDataService
> = stubLayer(LocalizationService);

const LogLive: Layer.Layer<LogService, never, never> = stubLayer(LogService);

const MessageLive: Layer.Layer<MessageService, never, IPCService> =
	stubLayer(MessageService);

const ProposedAPILive: Layer.Layer<
	ProposedAPIService,
	never,
	InitDataService | LogService
> = stubLayer(ProposedAPIService);

const QuickInputLive: Layer.Layer<QuickInputService, never, IPCService> =
	stubLayer(QuickInputService);

const SecretStorageLive: Layer.Layer<
	SecretStorageService,
	never,
	IPCService | LogService
> = stubLayer(SecretStorageService);

const StatusBarLive: Layer.Layer<
	StatusBarService,
	never,
	IPCService | CommandService
> = stubLayer(StatusBarService);

const StorageLive: Layer.Layer<StorageService, never, IPCService | LogService> =
	stubLayer(StorageService);

const StoragePathLive: Layer.Layer<
	StoragePathService,
	never,
	InitDataService | LogService | FileSystemService
> = stubLayer(StoragePathService);

const TaskLive: Layer.Layer<
	TaskService,
	never,
	IPCService | CancellationService
> = stubLayer(TaskService);

const TelemetryLive: Layer.Layer<
	TelemetryService,
	never,
	InitDataService | IPCService | LogService
> = stubLayer(TelemetryService);

const TreeViewLive: Layer.Layer<
	TreeViewService,
	never,
	IPCService | CommandService
> = stubLayer(TreeViewService);

const WebViewPanelLive: Layer.Layer<WebViewPanelService, never, IPCService> =
	stubLayer(WebViewPanelService);

const WindowLive: Layer.Layer<WindowService, never, IPCService> =
	stubLayer(WindowService);

const WorkSpaceLive: Layer.Layer<
	WorkSpaceService,
	never,
	IPCService | DocumentService | FileSystemService | ConfigurationService
> = stubLayer(WorkSpaceService);

// A special layer factory for runtime data.
const InitDataLive = (data: IExtensionHostInitData) =>
	Layer.succeed(InitDataService, data);

// --- Corrected Layer Composition & Main Logic ---

// This flattened approach is the key to solving the dependency issue.
// We merge all service layers that depend on each other into one giant layer.
// Effect's `Layer.mergeAll` is smart enough to resolve the internal dependencies.
const AllServicesLayer = Layer.mergeAll(
	APIFactoryLive,

	ESMInterceptorLive,

	ExtensionHostLive,

	ExtensionPathLive,

	HostKindPickerLive,

	NodeModuleShimLive,

	RequireInterceptorLive,

	ProcessPatchLive,

	APIDeprecationLive,

	AuthenticationLive,

	CancellationLive,

	ClipboardLive,

	CommandLive,

	ConfigurationLive,

	DebugLive,

	DiagnosticLive,

	DialogLive,

	DocumentLive,

	EnvironmentLive,

	ExtensionLive,

	FileSystemLive,

	FileSystemInformationLive,

	IPCLive,

	LanguageFeatureLive,

	LocalizationLive,

	LogLive,

	MessageLive,

	ProposedAPILive,

	QuickInputLive,

	SecretStorageLive,

	StatusBarLive,

	StorageLive,

	StoragePathLive,

	TaskLive,

	TelemetryLive,

	TreeViewLive,

	WebViewPanelLive,

	WindowLive,

	WorkSpaceLive,
);

// We then create a simple layer for the few things that are truly external
// or have no dependencies themselves.
const PrimitivesLayer = Layer.mergeAll(
	// Data that comes from the runtime
	InitDataLive(DUMMY_INIT_DATA),

	// A simple configuration value
	IPCConfigurationLive,

	// The logger implementation from Effect
	Logger.logFmt,
);

// The final application layer is the giant merged layer, with the
// primitives provided to it. This resolves all dependencies.
const FinalApplicationLayer = AllServicesLayer.pipe(
	Layer.provide(PrimitivesLayer),
);

// The main application logic Effect.
const MainEffect = Effect.gen(function* (G) {
	yield* G(Effect.logInfo("Main effect running..."));

	// We prove the layer works by requesting a few services.
	// If any of these were not provided, the compiler would fail.
	yield* G(ExtensionHostService);

	yield* G(RequireInterceptorService);

	yield* G(APIFactoryService);

	// This effect also has dependencies that must be met.
	yield* G(RunProcessPatch);

	yield* G(
		Effect.logInfo(
			"Cocoon skeleton is fully initialized. All services were resolved.",
		),
	);

	yield* G(Effect.never);
}).pipe(
	// Provide the fully resolved layer
	Effect.provide(FinalApplicationLayer),

	Effect.catchAllCause((Cause) =>
		Effect.logFatal("Cocoon main process failed.", Cause),
	),

	Effect.scoped,
);

// --- Run the Application ---
// If you've assembled all chunks into one file, this line should now compile
// without any errors. The inferred type for `MainEffect` should be
// `Effect<void, never, never>`, indicating all requirements (`R`) have been met.
NodeRuntime.runMain(MainEffect);
