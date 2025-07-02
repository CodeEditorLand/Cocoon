var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import {
  DisposableStore
} from "@codeeditorland/output/vs/base/common/lifecycle.js";
import { TelemetryLevel } from "@codeeditorland/output/vs/platform/telemetry/common/telemetry.js";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { LogLevel, UIKind } from "vscode";
import { CancellationService } from "./Cancellation.js";
import { InitDataService } from "./InitData.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { LoggerService } from "./Logger.js";
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
const DummyConfigurationService = {
  _serviceBrand: void 0,
  getValue: /* @__PURE__ */ __name(() => void 0, "getValue"),
  updateValue: /* @__PURE__ */ __name(() => Promise.resolve(), "updateValue"),
  inspect: /* @__PURE__ */ __name(() => ({ key: "" }), "inspect"),
  keys: /* @__PURE__ */ __name(() => ({ default: [], user: [], workspace: [], workspaceFolder: [] }), "keys"),
  reloadConfiguration: /* @__PURE__ */ __name(() => Promise.resolve(), "reloadConfiguration"),
  onDidChangeConfiguration: new Emitter().event,
  getConfigurationData: /* @__PURE__ */ __name(() => null, "getConfigurationData")
};
const DummyTelemetryService = {
  _serviceBrand: void 0,
  _productConfig: { usage: false, error: false },
  _level: TelemetryLevel.NONE,
  _oldTelemetryEnablement: false,
  _inLoggingOnlyMode: false,
  _outputLogger: {
    dispose: /* @__PURE__ */ __name(() => {
    }, "dispose"),
    flush: /* @__PURE__ */ __name(() => {
    }, "flush"),
    getLevel: /* @__PURE__ */ __name(() => LogLevel.Off, "getLevel"),
    info: /* @__PURE__ */ __name(() => {
    }, "info"),
    setLevel: /* @__PURE__ */ __name(() => {
    }, "setLevel"),
    trace: /* @__PURE__ */ __name(() => {
    }, "trace"),
    debug: /* @__PURE__ */ __name(() => {
    }, "debug"),
    error: /* @__PURE__ */ __name(() => {
    }, "error"),
    warn: /* @__PURE__ */ __name(() => {
    }, "warn"),
    onDidChangeLogLevel: new Emitter().event
  },
  _telemetryLoggers: /* @__PURE__ */ new Map(),
  _onDidChangeTelemetryEnabled: new Emitter(),
  _onDidChangeTelemetryConfiguration: new Emitter(),
  _store: new DisposableStore(),
  _register: /* @__PURE__ */ __name((o) => o, "_register"),
  onDidChangeTelemetryConfiguration: new Emitter().event,
  onDidChangeTelemetryEnabled: new Emitter().event,
  getTelemetryConfiguration: /* @__PURE__ */ __name(() => false, "getTelemetryConfiguration"),
  getTelemetryDetails: /* @__PURE__ */ __name(() => ({}), "getTelemetryDetails"),
  instantiateLogger: /* @__PURE__ */ __name(() => ({}), "instantiateLogger"),
  getBuiltInCommonProperties: /* @__PURE__ */ __name(() => ({}), "getBuiltInCommonProperties"),
  $initializeTelemetryLevel: /* @__PURE__ */ __name(() => {
  }, "$initializeTelemetryLevel"),
  $onDidChangeTelemetryLevel: /* @__PURE__ */ __name(() => {
  }, "$onDidChangeTelemetryLevel"),
  onExtensionError: /* @__PURE__ */ __name(() => false, "onExtensionError"),
  dispose: /* @__PURE__ */ __name(() => {
  }, "dispose"),
  initData: DUMMY_INIT_DATA
};
class ApplicationConfigurationService extends Effect.Service()(
  "vscode/ApplicationConfigurationService",
  { sync: /* @__PURE__ */ __name(() => DummyConfigurationService, "sync") }
) {
  static {
    __name(this, "ApplicationConfigurationService");
  }
}
class IPCService extends Effect.Service()("Service/IPC", {
  sync: /* @__PURE__ */ __name(() => ({
    CreateProxy: /* @__PURE__ */ __name(() => ({}), "CreateProxy"),
    RegisterInvokeHandler: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "RegisterInvokeHandler"),
    SendNotification: /* @__PURE__ */ __name(() => Effect.void, "SendNotification"),
    SendRequest: /* @__PURE__ */ __name(() => Effect.void, "SendRequest"),
    SendCancel: /* @__PURE__ */ __name(() => Effect.void, "SendCancel"),
    CreateProtocolAdapter: /* @__PURE__ */ __name(() => ({}), "CreateProtocolAdapter")
  }), "sync")
}) {
  static {
    __name(this, "IPCService");
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
class TelemetryService extends Effect.Service()(
  "Service/Telemetry",
  { sync: /* @__PURE__ */ __name(() => DummyTelemetryService, "sync") }
) {
  static {
    __name(this, "TelemetryService");
  }
}
class ExtensionPathService extends Effect.Service()(
  "Service/ExtensionPath",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ExtensionPathService");
  }
}
class HostKindPickerService extends Effect.Service()(
  "Service/HostKindPicker",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "HostKindPickerService");
  }
}
class NodeModuleShimService extends Effect.Service()(
  "Service/NodeModuleShim",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "NodeModuleShimService");
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
class ClipboardService extends Effect.Service()(
  "vscode/ClipboardService",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ClipboardService");
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
class FileSystemInformationService extends Effect.Service()(
  "Service/FileSystemInformation",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "FileSystemInformationService");
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
class TaskService extends Effect.Service()("Service/Task", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "TaskService");
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
class StorageService extends Effect.Service()(
  "Service/Storage",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "StorageService");
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
class WindowService extends Effect.Service()("Service/Window", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "WindowService");
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
class CommandService extends Effect.Service()(
  "Service/Command",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "CommandService");
  }
}
class DebugService extends Effect.Service()("Service/Debug", {
  sync: /* @__PURE__ */ __name(() => ({}), "sync")
}) {
  static {
    __name(this, "DebugService");
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
class WebViewPanelService extends Effect.Service()(
  "Service/WebViewPanel",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "WebViewPanelService");
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
class ExtensionHostService extends Effect.Service()(
  "Service/ExtensionHost",
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
  "Service/APIFactory",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "APIFactoryService");
  }
}
class ESMInterceptorService extends Effect.Service()(
  "Service/ESMInterceptor",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "ESMInterceptorService");
  }
}
class RequireInterceptorService extends Effect.Service()(
  "Service/RequireInterceptor",
  { sync: /* @__PURE__ */ __name(() => ({}), "sync") }
) {
  static {
    __name(this, "RequireInterceptorService");
  }
}
const composeAppLayer = /* @__PURE__ */ __name((_initializationData) => {
  const L0_Services = Layer.mergeAll(
    IPCConfigurationService.Default,
    CancellationService.Default,
    LoggerService.Default,
    Layer.succeed(InitDataService, DUMMY_INIT_DATA)
  );
  const L1_Services = Layer.mergeAll(
    ApplicationConfigurationService.Default,
    IPCService.Default,
    LanguageFeatureService.Default
  );
  const L2_Services = Layer.mergeAll(
    TelemetryService.Default,
    ExtensionPathService.Default,
    HostKindPickerService.Default,
    NodeModuleShimService.Default,
    FileSystemInformationService.Default
  );
  const L3_Services = Layer.mergeAll(
    APIDeprecationService.Default,
    ClipboardService.Default,
    DialogService.Default,
    DocumentService.Default,
    MessageService.Default,
    QuickInputService.Default,
    ProposedAPIService.Default,
    SecretStorageService.Default,
    AuthenticationService.Default,
    TaskService.Default
  );
  const L4_Services = Layer.mergeAll(
    FileSystemService.Default,
    StorageService.Default
  );
  const L5_Services = Layer.mergeAll(
    StoragePathService.Default,
    WorkSpaceService.Default,
    EnvironmentService.Default
  );
  const L6_Services = Layer.mergeAll(
    WindowService.Default,
    CommandService.Default
  );
  const L7_Services = Layer.mergeAll(
    DebugService.Default,
    StatusBarService.Default,
    TreeViewService.Default,
    WebViewPanelService.Default
  );
  const L8_Services = Layer.mergeAll(
    ExtensionHostService.Default,
    ExtensionService.Default
  );
  const L9_Services = Layer.mergeAll(
    APIFactoryService.Default,
    RequireInterceptorService.Default,
    ESMInterceptorService.Default
  );
  const L1_World = Layer.provide(L1_Services, L0_Services);
  const L2_World = Layer.provide(L2_Services, L1_World);
  const L3_World = Layer.provide(L3_Services, L2_World);
  const L4_World = Layer.provide(L4_Services, L3_World);
  const L5_World = Layer.provide(L5_Services, L4_World);
  const L6_World = Layer.provide(L6_Services, L5_World);
  const L7_World = Layer.provide(L7_Services, L6_World);
  const L8_World = Layer.provide(L8_Services, L7_World);
  const FinalAppWorld = Layer.provide(L9_Services, L8_World);
  return Layer.mergeAll(FinalAppWorld, L0_Services).pipe(Layer.orDie);
}, "composeAppLayer");
const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "cocoon" }
}));
const DevToolsLive = Layer.provide(
  DevTools.layerWebSocket(),
  NodeSocket.layerWebSocketConstructor
);
const UtilityLayers = Layer.mergeAll(TracingLive, DevToolsLive);
const MainLogic = Effect.gen(function* () {
  yield* Effect.log("--- Verifying Top-Level Service ---");
  yield* Effect.log(
    "Attempting to resolve a top-level service (RequireInterceptorService)..."
  );
  yield* RequireInterceptorService;
  yield* Effect.log("\u2714 RequireInterceptorService resolved successfully.");
  yield* Effect.log(
    "--- Full skeleton application layer is valid. Idling. ---"
  );
  yield* Effect.never;
});
const AppLayer = composeAppLayer(DUMMY_INIT_DATA);
const FinalLayer = Layer.mergeAll(AppLayer, UtilityLayers);
const AppEffectWithRequirements = MainLogic.pipe(
  Effect.catchAllCause(
    (cause) => Effect.logFatal("An unrecoverable error occurred in MainLogic.", cause)
  )
);
const ExecutableMainEffect = Effect.provide(
  AppEffectWithRequirements,
  FinalLayer
).pipe(Effect.scoped);
NodeRuntime.runMain(ExecutableMainEffect);
//# sourceMappingURL=Skeleton.js.map
