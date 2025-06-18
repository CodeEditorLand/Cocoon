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
  effect: Effect.gen(function* () {
    const c = yield* ConfigurationService;
    console.log(
      `[CONSTRUCTOR] LoggerService Initializing with logLevel: ${c.logLevel}`
    );
    return {
      log: /* @__PURE__ */ __name((m) => Effect.sync(() => console.log(`[LOG] ${m}`)), "log")
    };
  })
}) {
  static {
    __name(this, "LoggerService");
  }
}
class IPCService extends Effect.Service()("Service/IPC", {
  effect: Effect.gen(function* () {
    yield* IPCConfigurationService;
    yield* CancellationService;
    return {};
  })
}) {
  static {
    __name(this, "IPCService");
  }
}
class ExtensionPathService extends Effect.Service()(
  "Core/ExtensionPath",
  {
    effect: Effect.gen(function* () {
      yield* InitDataService;
      return {};
    })
  }
) {
  static {
    __name(this, "ExtensionPathService");
  }
}
class APIDeprecationService extends Effect.Service()(
  "Service/APIDeprecation",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] APIDeprecationService");
      return {};
    })
  }
) {
  static {
    __name(this, "APIDeprecationService");
  }
}
class HostKindPickerService extends Effect.Service()(
  "Core/HostKindPicker",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] HostKindPickerService");
      return {};
    })
  }
) {
  static {
    __name(this, "HostKindPickerService");
  }
}
class NodeModuleShimService extends Effect.Service()(
  "Core/NodeModuleShim",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] NodeModuleShimService");
      yield* InitDataService;
      return {};
    })
  }
) {
  static {
    __name(this, "NodeModuleShimService");
  }
}
class ClipboardService extends Effect.Service()(
  "Service/Clipboard",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "ClipboardService");
  }
}
class DebugService extends Effect.Service()("Service/Debug", {
  effect: Effect.gen(function* () {
    yield* IPCService;
    return {};
  })
}) {
  static {
    __name(this, "DebugService");
  }
}
class DiagnosticService extends Effect.Service()(
  "Service/Diagnostic",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "DiagnosticService");
  }
}
class DialogService extends Effect.Service()("Service/Dialog", {
  effect: Effect.gen(function* () {
    yield* IPCService;
    return {};
  })
}) {
  static {
    __name(this, "DialogService");
  }
}
class DocumentService extends Effect.Service()(
  "Service/Document",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "DocumentService");
  }
}
class MessageService extends Effect.Service()(
  "Service/Message",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "MessageService");
  }
}
class QuickInputService extends Effect.Service()(
  "Service/QuickInput",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "QuickInputService");
  }
}
class WebViewPanelService extends Effect.Service()(
  "Service/WebViewPanel",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "WebViewPanelService");
  }
}
class WindowService extends Effect.Service()("Service/Window", {
  effect: Effect.gen(function* () {
    yield* IPCService;
    return {};
  })
}) {
  static {
    __name(this, "WindowService");
  }
}
class LocalizationService extends Effect.Service()(
  "Service/Localization",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* InitDataService;
      return {};
    })
  }
) {
  static {
    __name(this, "LocalizationService");
  }
}
class TaskService extends Effect.Service()("Service/Task", {
  effect: Effect.gen(function* () {
    yield* IPCService;
    yield* CancellationService;
    return {};
  })
}) {
  static {
    __name(this, "TaskService");
  }
}
class AuthenticationService extends Effect.Service()(
  "Service/Authentication",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] AuthenticationService");
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "AuthenticationService");
  }
}
class FileSystemInformationService extends Effect.Service()(
  "Service/FileSystemInformation",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] FileSystemInformationService");
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "FileSystemInformationService");
  }
}
class ProposedAPIService extends Effect.Service()(
  "Service/ProposedAPI",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] ProposedAPIService");
      yield* InitDataService;
      return {};
    })
  }
) {
  static {
    __name(this, "ProposedAPIService");
  }
}
class SecretStorageService extends Effect.Service()(
  "Service/SecretStorage",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] SecretStorageService");
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "SecretStorageService");
  }
}
class StorageService extends Effect.Service()(
  "Service/Storage",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] StorageService");
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "StorageService");
  }
}
class TelemetryService extends Effect.Service()(
  "Service/Telemetry",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] TelemetryService");
      yield* InitDataService;
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "TelemetryService");
  }
}
class EnvironmentService extends Effect.Service()(
  "Service/Environment",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* InitDataService;
      yield* ClipboardService;
      return {};
    })
  }
) {
  static {
    __name(this, "EnvironmentService");
  }
}
class FileSystemService extends Effect.Service()(
  "Service/FileSystem",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* FileSystemInformationService;
      return {};
    })
  }
) {
  static {
    __name(this, "FileSystemService");
  }
}
class CommandService extends Effect.Service()(
  "Service/Command",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* TelemetryService;
      yield* WindowService;
      return {};
    })
  }
) {
  static {
    __name(this, "CommandService");
  }
}
class StoragePathService extends Effect.Service()(
  "Service/StoragePath",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] StoragePathService");
      yield* InitDataService;
      yield* FileSystemService;
      return {};
    })
  }
) {
  static {
    __name(this, "StoragePathService");
  }
}
class WorkSpaceService extends Effect.Service()(
  "Service/WorkSpace",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* DocumentService;
      yield* FileSystemService;
      yield* ConfigurationService;
      return {};
    })
  }
) {
  static {
    __name(this, "WorkSpaceService");
  }
}
class StatusBarService extends Effect.Service()(
  "Service/StatusBar",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* CommandService;
      return {};
    })
  }
) {
  static {
    __name(this, "StatusBarService");
  }
}
class TreeViewService extends Effect.Service()(
  "Service/TreeView",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* CommandService;
      return {};
    })
  }
) {
  static {
    __name(this, "TreeViewService");
  }
}
class ExtensionHostService extends Effect.Service()(
  "Core/ExtensionHost",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] ExtensionHostService");
      yield* IPCService;
      yield* InitDataService;
      yield* TelemetryService;
      return {};
    })
  }
) {
  static {
    __name(this, "ExtensionHostService");
  }
}
class ExtensionService extends Effect.Service()(
  "Service/Extension",
  {
    effect: Effect.gen(function* () {
      yield* ExtensionHostService;
      yield* InitDataService;
      return {};
    })
  }
) {
  static {
    __name(this, "ExtensionService");
  }
}
class APIFactoryService extends Effect.Service()(
  "Core/APIFactory",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] APIFactoryService");
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
    })
  }
) {
  static {
    __name(this, "APIFactoryService");
  }
}
class ESMInterceptorService extends Effect.Service()(
  "Core/ESMInterceptor",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] ESMInterceptorService");
      yield* APIFactoryService;
      yield* ExtensionPathService;
      return {};
    })
  }
) {
  static {
    __name(this, "ESMInterceptorService");
  }
}
class RequireInterceptorService extends Effect.Service()(
  "Core/RequireInterceptor",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      yield* Logger.log("... [CONSTRUCTOR] RequireInterceptorService");
      yield* APIFactoryService;
      yield* ExtensionPathService;
      yield* NodeModuleShimService;
      return {};
    })
  }
) {
  static {
    __name(this, "RequireInterceptorService");
  }
}
const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "cocoon-skeleton" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}));
const DevToolsLive = Layer.provide(
  DevTools.layerWebSocket(),
  NodeSocket.layerWebSocketConstructor
);
const L1_World = Layer.mergeAll(
  ConfigurationService.Default,
  ProcessPatchService.Default,
  CancellationService.Default,
  LanguageFeatureService.Default,
  IPCConfigurationService.Default,
  InitDataService.Default
);
const L2_Services = Layer.mergeAll(
  LoggerService.Default,
  IPCService.Default,
  ExtensionPathService.Default
);
const L2_World = Layer.merge(L1_World, L2_Services).pipe(
  Layer.provide(L1_World)
);
const L3_Services = Layer.mergeAll(
  APIDeprecationService.Default,
  HostKindPickerService.Default,
  NodeModuleShimService.Default
);
const L3_World = Layer.merge(L2_World, L3_Services).pipe(
  Layer.provide(L2_World)
);
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
  TelemetryService.Default
);
const L4_World = Layer.merge(L3_World, L4_Services).pipe(
  Layer.provide(L3_World)
);
const L5_Services = Layer.mergeAll(
  EnvironmentService.Default,
  FileSystemService.Default,
  CommandService.Default
);
const L5_World = Layer.merge(L4_World, L5_Services).pipe(
  Layer.provide(L4_World)
);
const L6_Services = Layer.mergeAll(
  StoragePathService.Default,
  WorkSpaceService.Default,
  StatusBarService.Default,
  TreeViewService.Default
);
const L6_World = Layer.merge(L5_World, L6_Services).pipe(
  Layer.provide(L5_World)
);
const L7_Services = Layer.mergeAll(ExtensionHostService.Default);
const L7_World = Layer.merge(L6_World, L7_Services).pipe(
  Layer.provide(L6_World)
);
const L8_Services = Layer.mergeAll(ExtensionService.Default);
const L8_World = Layer.merge(L7_World, L8_Services).pipe(
  Layer.provide(L7_World)
);
const L9_Services = Layer.mergeAll(APIFactoryService.Default);
const L9_World = Layer.merge(L8_World, L9_Services).pipe(
  Layer.provide(L8_World)
);
const L10_Services = Layer.mergeAll(
  ESMInterceptorService.Default,
  RequireInterceptorService.Default
);
const AppLayer = Layer.merge(L9_World, L10_Services).pipe(
  Layer.provide(L9_World)
);
const MainLogic = Effect.gen(function* () {
  const Logger = yield* LoggerService;
  yield* Logger.log("--- Main logic started. Base Logger is available. ---");
  yield* Logger.log(
    "--- Triggering full initialization by requesting top-level services... ---"
  );
  yield* RequireInterceptorService;
  yield* ESMInterceptorService;
  yield* Logger.log(
    "--- Initialization complete. All services are built and memoized. ---"
  );
  yield* Logger.log("Application is now running and will hang indefinitely.");
  yield* Effect.never;
});
const MainEffect = Effect.provide(MainLogic, AppLayer).pipe(
  Effect.provide(Layer.merge(TracingLive, DevToolsLive)),
  Effect.withSpan("cocoon-skeleton"),
  Effect.catchAllCause(
    (cause) => Effect.logFatal("Cocoon main process failed.", cause)
  )
);
NodeRuntime.runMain(MainEffect);
//# sourceMappingURL=Skeleton.js.map
