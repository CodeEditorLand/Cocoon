var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Path from "node:path";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter
} from "@opentelemetry/sdk-trace-base";
import { Deferred, Effect, Layer } from "effect";
import { APIDeprecationService } from "./APIDeprecation.js";
import { APIFactoryService } from "./APIFactory.js";
import { ApplicationConfigurationService } from "./ApplicationConfiguration.js";
import { AuthenticationService } from "./Authentication.js";
import { CancellationService } from "./Cancellation.js";
import { ClipboardService } from "./Clipboard.js";
import { CommandService } from "./Command.js";
import { DebugService } from "./Debug.js";
import { DialogService } from "./Dialog.js";
import { DocumentService } from "./Document.js";
import { ESMInterceptorService } from "./ESMInterceptor.js";
import { EnvironmentService } from "./Environment.js";
import { ExtensionService } from "./Extension.js";
import { ExtensionHostService } from "./ExtensionHost.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { FileSystemService } from "./FileSystem.js";
import { FileSystemInformationService } from "./FileSystemInformation.js";
import { HostKindPickerService } from "./HostKindPicker.js";
import { IPCService } from "./IPC.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { InitDataService } from "./InitData.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { LoggerService } from "./Logger.js";
import { MessageService } from "./Message.js";
import { NodeModuleShimService } from "./NodeModuleShim.js";
import { RunPatchProcess } from "./PatchProcess.js";
import { ProposedAPIService } from "./ProposedAPI.js";
import { QuickInputService } from "./QuickInput.js";
import { RequireInterceptorService } from "./RequireInterceptor.js";
import { SecretStorageService } from "./SecretStorage.js";
import { StatusBarService } from "./StatusBar.js";
import { StorageService } from "./Storage.js";
import { StoragePathService } from "./StoragePath.js";
import { TaskService } from "./Task.js";
import { TelemetryService } from "./Telemetry.js";
import { TreeViewService } from "./TreeView.js";
import { WebViewPanelService } from "./WebViewPanel.js";
import { WindowService } from "./Window.js";
import { WorkSpaceService } from "./WorkSpace.js";
const VSCodeOutputDirectory = process.env["VSCODE_OUT_DIR"] ?? Path.resolve(__dirname, "../../../Dependency/VSCode/out");
module.paths.unshift(VSCodeOutputDirectory);
const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "cocoon" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}));
const DevToolsLive = Layer.provide(
  DevTools.layerWebSocket(),
  NodeSocket.layerWebSocketConstructor
);
const UtilityLayers = Layer.mergeAll(TracingLive, DevToolsLive);
const PreHandshakeEffect = Effect.gen(function* () {
  const InitializationBarrier = yield* Deferred.make();
  const IPC = yield* IPCService;
  IPC.RegisterInvokeHandler(
    "initExtensionHost",
    (Data) => Effect.runPromise(
      Deferred.succeed(InitializationBarrier, Data).pipe(
        Effect.asVoid
      )
    )
  );
  const ShutdownEffect = Effect.logInfo(
    "[Cocoon] Received shutdown signal from Mountain."
  ).pipe(
    Effect.andThen(() => {
      process.exit(0);
    })
  );
  IPC.RegisterInvokeHandler(
    "$shutdown",
    () => Effect.runPromise(
      Effect.provide(ShutdownEffect, LoggerService.Default)
    )
  );
  yield* IPC.SendNotification("$initialHandshake", []);
  return yield* Deferred.await(InitializationBarrier);
});
const PostHandshakeEffect = Effect.gen(function* () {
  yield* Effect.logInfo("Proceeding with full initialization...");
  yield* RunPatchProcess;
  const Interceptor = yield* RequireInterceptorService;
  yield* Interceptor.Install();
  yield* Effect.logInfo("Node.js require() interceptor installed.");
  const Host = yield* ExtensionHostService;
  yield* Host.ActivateById(
    "*",
    { startup: true, activationEvent: "*" }
  );
  yield* Effect.logInfo("Startup extensions activated.");
  yield* Effect.logInfo("Cocoon is fully initialized and operational.");
  yield* Effect.addFinalizer(
    () => Effect.logInfo(
      "Cocoon is shutting down. Deactivating all extensions..."
    ).pipe(
      Effect.andThen(Host.DeactivateAll()),
      Effect.andThen(
        Effect.logInfo(
          "All extensions deactivated. Graceful shutdown complete."
        )
      ),
      Effect.catchAllCause(
        (Cause) => Effect.logError("Error during extension deactivation.", Cause)
      )
    )
  );
  yield* Effect.never;
});
const composeAppLayer = /* @__PURE__ */ __name((InitializationData) => {
  const L0_World = Layer.mergeAll(
    IPCConfigurationService.Default,
    CancellationService.Default,
    LoggerService.Default
  );
  const InitDataLayer = Layer.succeed(
    InitDataService,
    InitDataService.of(InitializationData)
  );
  const L1_Services = Layer.mergeAll(
    IPCService.Default,
    ApplicationConfigurationService.Default,
    LanguageFeatureService.Default,
    TelemetryService.Default
  );
  const L1_World = Layer.provide(
    L1_Services,
    Layer.merge(L0_World, InitDataLayer)
  );
  const L2_Services = Layer.mergeAll(
    ExtensionPathService.Default,
    HostKindPickerService.Default,
    NodeModuleShimService.Default
  );
  const L2_World = Layer.provide(L2_Services, L1_World);
  const L3_Services = Layer.mergeAll(
    APIDeprecationService.Default,
    ClipboardService.Default,
    DialogService.Default,
    DocumentService.Default,
    MessageService.Default,
    QuickInputService.Default,
    ProposedAPIService.Default,
    SecretStorageService.Default,
    FileSystemInformationService.Default
  );
  const L3_World = Layer.provide(L3_Services, L2_World);
  const L4_Services = Layer.mergeAll(
    TaskService.Default,
    AuthenticationService.Default
  );
  const L4_World = Layer.provide(L4_Services, L3_World);
  const L5_Services = Layer.mergeAll(
    FileSystemService.Default,
    StorageService.Default
  );
  const L5_World = Layer.provide(L5_Services, L4_World);
  const L6_Services = Layer.mergeAll(
    StoragePathService.Default,
    WindowService.Default
  );
  const L6_World = Layer.provide(L6_Services, L5_World);
  const L7_Services = Layer.mergeAll(
    CommandService.Default,
    WorkSpaceService.Default
  );
  const L7_World = Layer.provide(L7_Services, L6_World);
  const L8_Services = Layer.mergeAll(
    DebugService.Default,
    StatusBarService.Default,
    TreeViewService.Default,
    WebViewPanelService.Default,
    EnvironmentService.Default,
    ExtensionHostService.Default
  );
  const L8_World = Layer.provide(L8_Services, L7_World);
  const L9_Services = Layer.mergeAll(ExtensionService.Default);
  const L9_World = Layer.provide(L9_Services, L8_World);
  const L10_Services = Layer.mergeAll(APIFactoryService.Default);
  const L10_World = Layer.provide(L10_Services, L9_World);
  const TopLevelServices = Layer.mergeAll(
    RequireInterceptorService.Default,
    ESMInterceptorService.Default
  );
  return Layer.provide(TopLevelServices, L10_World);
}, "composeAppLayer");
const MainEffect = Effect.gen(function* () {
  const PreHandshakeLayer = Layer.provide(
    IPCService.Default,
    Layer.mergeAll(
      IPCConfigurationService.Default,
      CancellationService.Default,
      LoggerService.Default
    )
  );
  const InitializationData = yield* Effect.provide(
    PreHandshakeEffect,
    PreHandshakeLayer
  );
  const FinalApplicationLayer = composeAppLayer(InitializationData);
  yield* Effect.provide(PostHandshakeEffect, FinalApplicationLayer);
}).pipe(
  Effect.catchAllCause(
    (Cause) => Effect.logFatal("Cocoon main process failed.", Cause)
  ),
  // FIX: Provide the foundational utility layers that are external to the main app logic.
  Effect.provide(Layer.merge(UtilityLayers, LoggerService.Default)),
  Effect.scoped
);
NodeRuntime.runMain(MainEffect);
//# sourceMappingURL=Cocoon.js.map
