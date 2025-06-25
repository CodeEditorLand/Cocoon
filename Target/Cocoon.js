import { Effect, Layer, Deferred } from "effect";
import * as Path from "node:path";
import { DevTools } from "@effect/experimental";
import { NodeSdk } from "@effect/opentelemetry";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter
} from "@opentelemetry/sdk-trace-base";
import { APIDeprecationService } from "./APIDeprecation.js";
import { APIFactoryService } from "./APIFactory.js";
import { AuthenticationService } from "./Authentication.js";
import { CancellationService } from "./Cancellation.js";
import { ClipboardService } from "./Clipboard.js";
import { CommandService } from "./Command.js";
import { ConfigurationService } from "./ApplicationConfiguration.js";
import { DebugService } from "./Debug.js";
import { DialogService } from "./Dialog.js";
import { DocumentService } from "./Document.js";
import { EnvironmentService } from "./Environment.js";
import { ESMInterceptorService } from "./ESMInterceptor.js";
import { ExtensionService } from "./Extension.js";
import { ExtensionHostService } from "./ExtensionHost.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { FileSystemService } from "./FileSystem.js";
import { FileSystemInformationService } from "./FileSystemInformation.js";
import { HostKindPickerService } from "./HostKindPicker.js";
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { IPCConfigurationService } from "./IPCConfiguration.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { LoggerService } from "./Logger.js";
import { MessageService } from "./Message.js";
import { NodeModuleShimService } from "./NodeModuleShim.js";
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
import { RunPatchProcess } from "./PatchProcess.js";
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
const UtilityLayers = Layer.merge(TracingLive, DevToolsLive);
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
    () => Effect.runPromise(ShutdownEffect)
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
const MainEffect = Effect.gen(function* () {
  const L0_World = Layer.mergeAll(
    IPCConfigurationService.Default,
    CancellationService.Default,
    LoggerService.Default
  );
  const InitializationData = yield* Effect.provide(
    PreHandshakeEffect,
    Layer.provide(IPCService.Default, L0_World)
  );
  const InitDataLayer = Layer.succeed(
    InitDataService,
    InitDataService.of(InitializationData)
  );
  const L1_Services = Layer.mergeAll(
    IPCService.Default,
    ConfigurationService.Default,
    LanguageFeatureService.Default,
    TelemetryService.Default
  );
  const L1_World = L1_Services.pipe(
    Layer.provide(Layer.merge(L0_World, InitDataLayer))
  );
  const L2_Services = Layer.mergeAll(
    ExtensionPathService.Default,
    HostKindPickerService.Default,
    NodeModuleShimService.Default
  );
  const L2_World = Layer.merge(L1_World, L2_Services).pipe(
    Layer.provide(L1_World)
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
    FileSystemInformationService.Default
  );
  const L3_World = Layer.merge(L2_World, L3_Services).pipe(
    Layer.provide(L2_World)
  );
  const L4_Services = Layer.mergeAll(
    TaskService.Default,
    AuthenticationService.Default
  );
  const L4_World = Layer.merge(L3_World, L4_Services).pipe(
    Layer.provide(L3_World)
  );
  const L5_Services = Layer.mergeAll(
    FileSystemService.Default,
    StorageService.Default
  );
  const L5_World = Layer.merge(L4_World, L5_Services).pipe(
    Layer.provide(L4_World)
  );
  const L6_Services = Layer.mergeAll(
    StoragePathService.Default,
    WindowService.Default
  );
  const L6_World = Layer.merge(L5_World, L6_Services).pipe(
    Layer.provide(L5_World)
  );
  const L7_Services = Layer.mergeAll(
    CommandService.Default,
    WorkSpaceService.Default
  );
  const L7_World = Layer.merge(L6_World, L7_Services).pipe(
    Layer.provide(L6_World)
  );
  const L8_Services = Layer.mergeAll(
    DebugService.Default,
    StatusBarService.Default,
    TreeViewService.Default,
    WebViewPanelService.Default,
    EnvironmentService.Default,
    ExtensionHostService.Default
  );
  const L8_World = Layer.merge(L7_World, L8_Services).pipe(
    Layer.provide(L7_World)
  );
  const L9_Services = Layer.mergeAll(ExtensionService.Default);
  const L9_World = Layer.merge(L8_World, L9_Services).pipe(
    Layer.provide(L8_World)
  );
  const L10_Services = Layer.mergeAll(APIFactoryService.Default);
  const L10_World = Layer.merge(L9_World, L10_Services).pipe(
    Layer.provide(L9_World)
  );
  const TopLevelServices = Layer.mergeAll(
    RequireInterceptorService.Default,
    ESMInterceptorService.Default
  );
  const FinalApplicationLayer = Layer.merge(L10_World, TopLevelServices).pipe(
    Layer.provide(L10_World)
  );
  yield* Effect.provide(PostHandshakeEffect, FinalApplicationLayer);
}).pipe(
  Effect.catchAllCause(
    (Cause) => Effect.logFatal("Cocoon main process failed.", Cause)
  ),
  Effect.provide(UtilityLayers),
  Effect.scoped
);
NodeRuntime.runMain(MainEffect);
//# sourceMappingURL=Cocoon.js.map
