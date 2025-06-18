var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime } from "@effect/platform-node";
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
class LoggerService extends Effect.Service()("Service/Logger", {
  effect: Effect.gen(function* () {
    const config = yield* ConfigurationService;
    return {
      log: /* @__PURE__ */ __name((message) => Effect.sync(() => {
        console.log(`[${config.logLevel}] ${message}`);
      }), "log")
    };
  })
}) {
  static {
    __name(this, "LoggerService");
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
class HostKindPickerService extends Effect.Service()(
  "Core/HostKindPicker",
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
class NodeModuleShimService extends Effect.Service()(
  "Core/NodeModuleShim",
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
class AuthenticationService extends Effect.Service()(
  "Service/Authentication",
  {
    effect: Effect.gen(function* () {
      yield* IPCService;
      yield* LoggerService;
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
      yield* IPCService;
      yield* LoggerService;
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
      yield* InitDataService;
      yield* LoggerService;
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
      yield* IPCService;
      yield* LoggerService;
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
      yield* IPCService;
      yield* LoggerService;
      return {};
    })
  }
) {
  static {
    __name(this, "StorageService");
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
class TelemetryService extends Effect.Service()(
  "Service/Telemetry",
  {
    effect: Effect.gen(function* () {
      yield* InitDataService;
      yield* IPCService;
      yield* LoggerService;
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
    effect: Effect.suspend(
      () => Effect.gen(function* () {
        yield* IPCService;
        yield* InitDataService;
        yield* ClipboardService;
        return {};
      })
    )
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
    effect: Effect.suspend(
      () => Effect.gen(function* () {
        yield* IPCService;
        yield* TelemetryService;
        yield* WindowService;
        return {};
      })
    )
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
      yield* InitDataService;
      yield* LoggerService;
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
    effect: Effect.suspend(
      () => Effect.gen(function* () {
        yield* IPCService;
        yield* DocumentService;
        yield* FileSystemService;
        yield* ConfigurationService;
        return {};
      })
    )
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
    effect: Effect.suspend(
      () => Effect.gen(function* () {
        yield* IPCService;
        yield* InitDataService;
        yield* LoggerService;
        yield* TelemetryService;
        return {};
      })
    )
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
    effect: Effect.suspend(
      () => Effect.gen(function* () {
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
      })
    )
  }
) {
  static {
    __name(this, "APIFactoryService");
  }
}
class ESMInterceptorService extends Effect.Service()(
  "Core/ESMInterceptor",
  {
    effect: Effect.suspend(
      () => Effect.gen(function* () {
        yield* APIFactoryService;
        yield* ExtensionPathService;
        yield* LoggerService;
        return {};
      })
    )
  }
) {
  static {
    __name(this, "ESMInterceptorService");
  }
}
class RequireInterceptorService extends Effect.Service()(
  "Core/RequireInterceptor",
  {
    effect: Effect.suspend(
      () => Effect.gen(function* () {
        yield* APIFactoryService;
        yield* ExtensionPathService;
        yield* NodeModuleShimService;
        yield* LoggerService;
        return {};
      })
    )
  }
) {
  static {
    __name(this, "RequireInterceptorService");
  }
}
const traceLayer = /* @__PURE__ */ __name((name, layer) => Layer.withSpan(layer, name), "traceLayer");
const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "cocoon-skeleton" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}));
const buildNextLevel = /* @__PURE__ */ __name((levelName, servicesToBuild, dependencyLayer) => {
  const combinedProvider = Layer.merge(dependencyLayer, servicesToBuild);
  const resolvedServices = Layer.provide(servicesToBuild, combinedProvider);
  return Layer.merge(dependencyLayer, resolvedServices);
}, "buildNextLevel");
const L0_Services = Layer.mergeAll(
  traceLayer("ConfigurationService", ConfigurationService.Default),
  traceLayer("CancellationService", CancellationService.Default),
  traceLayer("LanguageFeatureService", LanguageFeatureService.Default),
  traceLayer("IPCConfigurationService", IPCConfigurationService.Default),
  traceLayer("InitDataService", InitDataService.Default),
  traceLayer("ProcessPatchService", ProcessPatchService.Default)
);
const Logger_Layer = traceLayer(
  "LoggerService",
  Layer.provide(LoggerService.Default, L0_Services)
);
const L0_Complete = Layer.merge(L0_Services, Logger_Layer);
const Core_Services = Layer.mergeAll(
  traceLayer("APIDeprecationService", APIDeprecationService.Default),
  traceLayer("HostKindPickerService", HostKindPickerService.Default),
  traceLayer("ExtensionPathService", ExtensionPathService.Default),
  traceLayer("NodeModuleShimService", NodeModuleShimService.Default)
);
const Core_Live = buildNextLevel("Core", Core_Services, L0_Complete);
const L1_Services = Layer.mergeAll(
  traceLayer("IPCService", IPCService.Default)
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
    FileSystemInformationService.Default
  ),
  traceLayer("ProposedAPIService", ProposedAPIService.Default),
  traceLayer("SecretStorageService", SecretStorageService.Default),
  traceLayer("StorageService", StorageService.Default),
  traceLayer("TaskService", TaskService.Default),
  traceLayer("TelemetryService", TelemetryService.Default),
  traceLayer("EnvironmentService", EnvironmentService.Default)
);
const L2_Live = buildNextLevel("Level 2", L2_Services, L1_Live);
const L3_Services = Layer.mergeAll(
  traceLayer("FileSystemService", FileSystemService.Default),
  traceLayer("CommandService", CommandService.Default)
);
const L3_Live = buildNextLevel("Level 3", L3_Services, L2_Live);
const L4_Services = Layer.mergeAll(
  traceLayer("StoragePathService", StoragePathService.Default),
  traceLayer("WorkSpaceService", WorkSpaceService.Default),
  traceLayer("StatusBarService", StatusBarService.Default),
  traceLayer("TreeViewService", TreeViewService.Default),
  traceLayer("ExtensionHostService", ExtensionHostService.Default)
);
const L4_Live = buildNextLevel("Level 4", L4_Services, L3_Live);
const L5_Services = Layer.mergeAll(
  traceLayer("ExtensionService", ExtensionService.Default)
);
const L5_Live = buildNextLevel("Level 5", L5_Services, L4_Live);
const L6_Services = Layer.mergeAll(
  traceLayer("APIFactoryService", APIFactoryService.Default)
);
const L6_Live = buildNextLevel("Level 6", L6_Services, L5_Live);
const L7_Services = Layer.mergeAll(
  traceLayer("ESMInterceptorService", ESMInterceptorService.Default),
  traceLayer("RequireInterceptorService", RequireInterceptorService.Default)
);
const ApplicationLive = buildNextLevel("Level 7", L7_Services, L6_Live);
const MainEffect = Effect.gen(function* () {
  const logger = yield* LoggerService;
  yield* logger.log("Main effect running...");
  yield* ExtensionHostService;
  yield* RequireInterceptorService;
  yield* APIFactoryService;
  const RunProcessPatch = Effect.void;
  yield* RunProcessPatch;
  yield* logger.log(
    "Cocoon skeleton is fully initialized. All services were resolved."
  );
  yield* Effect.never;
}).pipe(
  Effect.provide(Layer.merge(ApplicationLive, TracingLive)),
  Effect.catchAllCause(
    (cause) => Effect.logFatal("Cocoon main process failed.", cause)
  ),
  Effect.withSpan("cocoon-main-app")
);
NodeRuntime.runMain(MainEffect);
//# sourceMappingURL=Cocoon_Single.js.map
