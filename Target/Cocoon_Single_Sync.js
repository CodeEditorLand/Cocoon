var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter
} from "@opentelemetry/sdk-trace-base";
import { Effect, Layer } from "effect";
const DUMMY_INIT_DATA = {
  extensions: { allExtensions: [] },
  environment: {},
  logLevel: 0,
  remote: {},
  telemetryInfo: {},
  uiKind: 0,
  quality: "",
  workspace: {}
};
class ConfigurationService extends Effect.Service()(
  "Service/Configuration",
  { sync: /* @__PURE__ */ __name(() => ({ logLevel: "INFO" }), "sync") }
) {
  static {
    __name(this, "ConfigurationService");
  }
}
class ProcessPatchService extends Effect.Service()(
  "PatchProcess/ProcessPatch",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ProcessPatchService");
  }
}
class CancellationService extends Effect.Service()(
  "Service/Cancellation",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "CancellationService");
  }
}
class LanguageFeatureService extends Effect.Service()(
  "Service/LanguageFeature",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "LanguageFeatureService");
  }
}
class IPCConfigurationService extends Effect.Service()(
  "Service/IPCConfiguration",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "IPCConfigurationService");
  }
}
class InitDataService extends Effect.Service()(
  "Service/InitData",
  { sync: /* @__PURE__ */ __name(() => DUMMY_INIT_DATA, "sync") }
) {
  static {
    __name(this, "InitDataService");
  }
}
class LoggerService extends Effect.Service()("Service/Logger", {
  sync: /* @__PURE__ */ __name(() => ({
    log: /* @__PURE__ */ __name((message) => Effect.sync(() => console.log(`[LOG] ${message}`)), "log")
  }), "sync")
}) {
  static {
    __name(this, "LoggerService");
  }
}
class IPCService extends Effect.Service()("Service/IPC", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "IPCService");
  }
}
class ExtensionPathService extends Effect.Service()(
  "Core/ExtensionPath",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ExtensionPathService");
  }
}
class APIDeprecationService extends Effect.Service()(
  "Service/APIDeprecation",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "APIDeprecationService");
  }
}
class HostKindPickerService extends Effect.Service()(
  "Core/HostKindPicker",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "HostKindPickerService");
  }
}
class NodeModuleShimService extends Effect.Service()(
  "Core/NodeModuleShim",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "NodeModuleShimService");
  }
}
class ClipboardService extends Effect.Service()(
  "Service/Clipboard",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ClipboardService");
  }
}
class DebugService extends Effect.Service()("Service/Debug", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "DebugService");
  }
}
class DiagnosticService extends Effect.Service()(
  "Service/Diagnostic",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "DiagnosticService");
  }
}
class DialogService extends Effect.Service()("Service/Dialog", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "DialogService");
  }
}
class DocumentService extends Effect.Service()(
  "Service/Document",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "DocumentService");
  }
}
class MessageService extends Effect.Service()(
  "Service/Message",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "MessageService");
  }
}
class QuickInputService extends Effect.Service()(
  "Service/QuickInput",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "QuickInputService");
  }
}
class WebViewPanelService extends Effect.Service()(
  "Service/WebViewPanel",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "WebViewPanelService");
  }
}
class WindowService extends Effect.Service()("Service/Window", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "WindowService");
  }
}
class LocalizationService extends Effect.Service()(
  "Service/Localization",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "LocalizationService");
  }
}
class AuthenticationService extends Effect.Service()(
  "Service/Authentication",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "AuthenticationService");
  }
}
class FileSystemInformationService extends Effect.Service()(
  "Service/FileSystemInformation",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "FileSystemInformationService");
  }
}
class ProposedAPIService extends Effect.Service()(
  "Service/ProposedAPI",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ProposedAPIService");
  }
}
class SecretStorageService extends Effect.Service()(
  "Service/SecretStorage",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "SecretStorageService");
  }
}
class StorageService extends Effect.Service()(
  "Service/Storage",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "StorageService");
  }
}
class TaskService extends Effect.Service()("Service/Task", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "TaskService");
  }
}
class TelemetryService extends Effect.Service()(
  "Service/Telemetry",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "TelemetryService");
  }
}
class EnvironmentService extends Effect.Service()(
  "Service/Environment",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "EnvironmentService");
  }
}
class FileSystemService extends Effect.Service()(
  "Service/FileSystem",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "FileSystemService");
  }
}
class CommandService extends Effect.Service()(
  "Service/Command",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "CommandService");
  }
}
class StoragePathService extends Effect.Service()(
  "Service/StoragePath",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "StoragePathService");
  }
}
class WorkSpaceService extends Effect.Service()(
  "Service/WorkSpace",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "WorkSpaceService");
  }
}
class StatusBarService extends Effect.Service()(
  "Service/StatusBar",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "StatusBarService");
  }
}
class TreeViewService extends Effect.Service()(
  "Service/TreeView",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "TreeViewService");
  }
}
class ExtensionHostService extends Effect.Service()(
  "Core/ExtensionHost",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ExtensionHostService");
  }
}
class ExtensionService extends Effect.Service()(
  "Service/Extension",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ExtensionService");
  }
}
class APIFactoryService extends Effect.Service()(
  "Core/APIFactory",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "APIFactoryService");
  }
}
class ESMInterceptorService extends Effect.Service()(
  "Core/ESMInterceptor",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ESMInterceptorService");
  }
}
class RequireInterceptorService extends Effect.Service()(
  "Core/RequireInterceptor",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "RequireInterceptorService");
  }
}
const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "cocoon-skeleton" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}));
const DevToolsLive = DevTools.layerWebSocket().pipe(
  Layer.provide(NodeSocket.layerWebSocketConstructor)
);
const AllServicesLayer = Layer.mergeAll(
  ConfigurationService.Default,
  ProcessPatchService.Default,
  CancellationService.Default,
  LanguageFeatureService.Default,
  IPCConfigurationService.Default,
  InitDataService.Default,
  LoggerService.Default,
  IPCService.Default,
  ExtensionPathService.Default,
  APIDeprecationService.Default,
  HostKindPickerService.Default,
  NodeModuleShimService.Default,
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
  EnvironmentService.Default,
  FileSystemService.Default,
  CommandService.Default,
  StoragePathService.Default,
  WorkSpaceService.Default,
  StatusBarService.Default,
  TreeViewService.Default,
  ExtensionHostService.Default,
  ExtensionService.Default,
  APIFactoryService.Default,
  ESMInterceptorService.Default,
  RequireInterceptorService.Default
);
const mainLogic = Effect.gen(function* () {
  const logger = yield* LoggerService;
  yield* logger.log("Main logic running...");
  const extensionHost = yield* ExtensionHostService;
  const requireInterceptor = yield* RequireInterceptorService;
  const apiFactory = yield* APIFactoryService;
  const processPatch = yield* ProcessPatchService;
  const initData = yield* InitDataService;
  const ipc = yield* IPCService;
  yield* logger.log("All services accessed successfully");
  yield* logger.log(
    "Process patch, init data, and IPC services accessed successfully"
  );
  yield* logger.log(
    "Cocoon skeleton is fully initialized. All services were resolved."
  );
  yield* Effect.sleep("1 second");
  yield* logger.log("Application completed successfully");
});
const MainEffect = mainLogic.pipe(
  Effect.provide(AllServicesLayer),
  Effect.provide(Layer.merge(TracingLive, DevToolsLive)),
  Effect.withSpan("cocoon-main-app-fixed"),
  Effect.catchAllCause(
    (cause) => Effect.logFatal("Cocoon main process failed.", cause)
  )
);
NodeRuntime.runMain(MainEffect);
//# sourceMappingURL=Cocoon_Single_Sync.js.map
