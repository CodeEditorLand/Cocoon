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
import { LogLevel, UIKind } from "vscode";
const DUMMY_INIT_DATA = {
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
    globalStorageHome: {},
    workspaceStorageHome: {}
  },
  workspace: null,
  extensions: {
    versionId: 0,
    allExtensions: [],
    activationEvents: {},
    myExtensions: []
  },
  telemetryInfo: {
    sessionId: "",
    machineId: "",
    sqmId: "",
    devDeviceId: "",
    firstSessionDate: (/* @__PURE__ */ new Date()).toISOString()
  },
  logLevel: LogLevel.Info,
  loggers: [],
  logsLocation: {},
  autoStart: false,
  remote: { isRemote: false, authority: void 0, connectionData: null },
  consoleForward: { includeStack: false, logNative: false },
  uiKind: UIKind.Desktop
};
class IPCConfigurationService extends Effect.Service()(
  "Service/IPCConfiguration",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "IPCConfigurationService");
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
class ApplicationConfigurationService extends Effect.Service()(
  "vscode/ApplicationConfigurationService",
  {
    sync: /* @__PURE__ */ __name(() => ({
      getValue: /* @__PURE__ */ __name(() => void 0, "getValue"),
      updateValue: /* @__PURE__ */ __name(() => Promise.resolve(), "updateValue"),
      inspect: /* @__PURE__ */ __name(() => ({ key: "" }), "inspect")
    }), "sync")
  }
) {
  static {
    __name(this, "ApplicationConfigurationService");
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
    yield* ApplicationConfigurationService;
    return {
      log: /* @__PURE__ */ __name((Message) => Effect.sync(() => console.log(`[LOG] ${Message}`)), "log")
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
class TelemetryService extends Effect.Service()(
  "Service/Telemetry",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* InitDataService;
      yield* LoggerService;
      return {};
    })
  }
) {
  static {
    __name(this, "TelemetryService");
  }
}
class ExtensionPathService extends Effect.Service()(
  "Service/ExtensionPath",
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
class HostKindPickerService extends Effect.Service()(
  "Service/HostKindPicker",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
      return {};
    })
  }
) {
  static {
    __name(this, "HostKindPickerService");
  }
}
class NodeModuleShimService extends Effect.Service()(
  "Service/NodeModuleShim",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
      yield* InitDataService;
      return {};
    })
  }
) {
  static {
    __name(this, "NodeModuleShimService");
  }
}
class APIDeprecationService extends Effect.Service()(
  "Service/APIDeprecation",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
      return {};
    })
  }
) {
  static {
    __name(this, "APIDeprecationService");
  }
}
class ClipboardService extends Effect.Service()(
  "vscode/ClipboardService",
  {
    sync: /* @__PURE__ */ __name(() => ({
      writeText: /* @__PURE__ */ __name(() => Promise.resolve(), "writeText"),
      readText: /* @__PURE__ */ __name(() => Promise.resolve(""), "readText")
    }), "sync")
  }
) {
  static {
    __name(this, "ClipboardService");
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
class ProposedAPIService extends Effect.Service()(
  "Service/ProposedAPI",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
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
      yield* LoggerService;
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "SecretStorageService");
  }
}
class FileSystemInformationService extends Effect.Service()(
  "Service/FileSystemInformation",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "FileSystemInformationService");
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
      yield* LoggerService;
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "AuthenticationService");
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
class StorageService extends Effect.Service()(
  "Service/Storage",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
      yield* IPCService;
      return {};
    })
  }
) {
  static {
    __name(this, "StorageService");
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
class StoragePathService extends Effect.Service()(
  "Service/StoragePath",
  {
    effect: Effect.gen(function* () {
      yield* InitDataService;
      yield* FileSystemService;
      yield* LoggerService;
      return {};
    })
  }
) {
  static {
    __name(this, "StoragePathService");
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
class WorkSpaceService extends Effect.Service()(
  "Service/WorkSpace",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* DocumentService;
      yield* FileSystemService;
      yield* ApplicationConfigurationService;
      return {};
    })
  }
) {
  static {
    __name(this, "WorkSpaceService");
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
class ExtensionHostService extends Effect.Service()(
  "Service/ExtensionHost",
  {
    effect: Effect.gen(function* () {
      yield* LoggerService;
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
    })
  }
) {
  static {
    __name(this, "APIFactoryService");
  }
}
class RequireInterceptorService extends Effect.Service()(
  "Service/RequireInterceptor",
  {
    effect: Effect.gen(function* () {
      yield* APIFactoryService;
      yield* ExtensionPathService;
      yield* LoggerService;
      yield* NodeModuleShimService;
      return {};
    })
  }
) {
  static {
    __name(this, "RequireInterceptorService");
  }
}
class ESMInterceptorService extends Effect.Service()(
  "Service/ESMInterceptor",
  {
    effect: Effect.gen(function* () {
      yield* APIFactoryService;
      yield* ExtensionPathService;
      yield* LoggerService;
      return {};
    })
  }
) {
  static {
    __name(this, "ESMInterceptorService");
  }
}
const L0_World = Layer.mergeAll(
  ApplicationConfigurationService.Default,
  CancellationService.Default,
  LanguageFeatureService.Default,
  IPCConfigurationService.Default,
  InitDataService.Default
);
const L1_Services = Layer.mergeAll(
  LoggerService.Default,
  IPCService.Default,
  ExtensionPathService.Default
);
const L1_World = Layer.merge(L0_World, L1_Services).pipe(
  Layer.provide(L0_World)
);
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
  TelemetryService.Default
);
const L2_World = Layer.merge(L1_World, L2_Services).pipe(
  Layer.provide(L1_World)
);
const L3_Services = Layer.mergeAll(
  EnvironmentService.Default,
  FileSystemService.Default,
  CommandService.Default
);
const L3_World = Layer.merge(L2_World, L3_Services).pipe(
  Layer.provide(L2_World)
);
const L4_Services = Layer.mergeAll(
  StoragePathService.Default,
  WorkSpaceService.Default,
  StatusBarService.Default,
  TreeViewService.Default
);
const L4_World = Layer.merge(L3_World, L4_Services).pipe(
  Layer.provide(L3_World)
);
const L5_Services = Layer.mergeAll(ExtensionHostService.Default);
const L5_World = Layer.merge(L4_World, L5_Services).pipe(
  Layer.provide(L4_World)
);
const L6_Services = Layer.mergeAll(ExtensionService.Default);
const L6_World = Layer.merge(L5_World, L6_Services).pipe(
  Layer.provide(L5_World)
);
const L7_Services = Layer.mergeAll(APIFactoryService.Default);
const L7_World = Layer.merge(L6_World, L7_Services).pipe(
  Layer.provide(L6_World)
);
const L8_Services = Layer.mergeAll(
  ESMInterceptorService.Default,
  RequireInterceptorService.Default
);
const AppLayer = Layer.merge(L7_World, L8_Services).pipe(
  Layer.provide(L7_World)
);
const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "cocoon-skeleton" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}));
const DevToolsLive = Layer.provide(
  DevTools.layerWebSocket(),
  NodeSocket.layerWebSocketConstructor
);
const MainLogic = Effect.gen(function* () {
  const logger = yield* LoggerService;
  yield* logger.log("--- Main logic started. Base Logger is available. ---");
  yield* logger.log(
    "--- Triggering full initialization by requesting top-level services... ---"
  );
  yield* RequireInterceptorService;
  yield* ESMInterceptorService;
  yield* logger.log(
    "--- Initialization complete. All services are built and memoized. ---"
  );
  yield* logger.log("Application is now running and will hang indefinitely.");
  yield* Effect.never;
});
const FinalLayer = Layer.mergeAll(AppLayer, TracingLive, DevToolsLive);
const MainEffectWithRequirements = MainLogic.pipe(
  Effect.catchAllCause(
    (cause) => (
      // This logFatal still requires LoggerService, which is fine at this stage.
      Effect.logFatal("Skeleton main process failed.", cause)
    )
  )
);
const ExecutableMainEffect = Effect.provide(
  MainEffectWithRequirements,
  FinalLayer
);
NodeRuntime.runMain(ExecutableMainEffect);
//# sourceMappingURL=Skeleton.js.map
