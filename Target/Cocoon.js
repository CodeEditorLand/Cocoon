import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer, Logger } from "effect";
import APIFactoryLive from "./Core/APIFactory/Live.js";
import ESMInterceptorLive from "./Core/ESMInterceptor/Live.js";
import ExtensionHostLive from "./Core/ExtensionHost/Live.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import ExtensionPathLive from "./Core/ExtensionPath/Live.js";
import HostKindPickerLive from "./Core/HostKindPicker/Live.js";
import NodeModuleShimLive from "./Core/NodeModuleShim/Live.js";
import RequireInterceptorLive from "./Core/RequireInterceptor/Live.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
import RunProcessPatch from "./PatchProcess.js";
import APIDeprecationLive from "./Service/APIDeprecation/Live.js";
import AuthenticationLive from "./Service/Authentication/Live.js";
import CancellationLive from "./Service/Cancellation/Live.js";
import ClipboardLive from "./Service/Clipboard/Live.js";
import CommandLive from "./Service/Command/Live.js";
import ConfigurationLive from "./Service/Configuration/Live.js";
import DebugLive from "./Service/Debug/Live.js";
import DiagnosticLive from "./Service/Diagnostic/Live.js";
import DialogLive from "./Service/Dialog/Live.js";
import DocumentLive from "./Service/Document/Live.js";
import EnvironmentLive from "./Service/Environment/Live.js";
import ExtensionLive from "./Service/Extension/Live.js";
import FileSystemLive from "./Service/FileSystem/Live.js";
import FileSystemInformationLive from "./Service/FileSystemInformation/Live.js";
import InitDataLive from "./Service/InitData/Live.js";
import IPCConfigurationService from "./Service/IPC/Configuration.js";
import IPCLive from "./Service/IPC/Live.js";
import IPCService from "./Service/IPC/Service.js";
import LanguageFeatureLive from "./Service/LanguageFeature/Live.js";
import LocalizationLive from "./Service/Localization/Live.js";
import LogLive from "./Service/Log/Live.js";
import MessageLive from "./Service/Message/Live.js";
import ProposedAPILive from "./Service/ProposedAPI/Live.js";
import QuickInputLive from "./Service/QuickInput/Live.js";
import SecretStorageLive from "./Service/SecretStorage/Live.js";
import StatusBarLive from "./Service/StatusBar/Live.js";
import StorageLive from "./Service/Storage/Live.js";
import StoragePathLive from "./Service/StoragePath/Live.js";
import TaskLive from "./Service/Task/Live.js";
import TelemetryLive from "./Service/Telemetry/Live.js";
import TreeViewLive from "./Service/TreeView/Live.js";
import WebViewPanelLive from "./Service/WebViewPanel/Live.js";
import WindowLive from "./Service/Window/Live.js";
import WorkSpaceLive from "./Service/WorkSpace/Live.js";
const VSCodeOutputDirectory = process.env["VSCODE_OUT_DIR"] ?? Path.resolve(__dirname, "../../../Dependency/VSCode/out");
module.paths.unshift(VSCodeOutputDirectory);
const CoreInfraLayer = Layer.mergeAll(
  Layer.succeed(IPCConfigurationService, {
    MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
    CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052"
  }),
  Logger.logFmt,
  CancellationLive
).pipe(Layer.provide(IPCLive));
const CoreServicesLayer = Layer.mergeAll(
  LogLive,
  TelemetryLive,
  NodeModuleShimLive,
  RequireInterceptorLive,
  ESMInterceptorLive,
  ExtensionPathLive,
  HostKindPickerLive
).pipe(Layer.provide(CoreInfraLayer));
const AppServicesLayer = Layer.mergeAll(
  APIDeprecationLive,
  AuthenticationLive,
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
  LanguageFeatureLive,
  LocalizationLive,
  MessageLive,
  ProposedAPILive,
  QuickInputLive,
  SecretStorageLive,
  StatusBarLive,
  StorageLive,
  StoragePathLive,
  TaskLive,
  TreeViewLive,
  WebViewPanelLive,
  WindowLive,
  WorkSpaceLive
).pipe(Layer.provide(CoreServicesLayer));
const TopLevelLayer = Layer.mergeAll(APIFactoryLive, ExtensionHostLive).pipe(
  Layer.provide(AppServicesLayer)
  // Depends on AppServicesLayer
);
const PreHandshakeEffect = Effect.gen(function* (G) {
  const InitializationBarrier = yield* G(
    Deferred.make()
  );
  const IPC = yield* G(IPCService);
  IPC.RegisterInvokeHandler(
    "initExtensionHost",
    (data) => Effect.runPromise(
      Deferred.succeed(InitializationBarrier, data).pipe(
        Effect.asVoid
      )
    )
  );
  yield* G(IPC.SendNotification("$initialHandshake", []));
  return yield* G(Deferred.await(InitializationBarrier));
});
const PostHandshakeEffect = Effect.gen(function* (G) {
  yield* G(Effect.logInfo("Proceeding with full initialization..."));
  yield* G(RunProcessPatch);
  const Interceptor = yield* G(RequireInterceptorService);
  yield* G(Interceptor.Install());
  yield* G(Effect.logInfo("Node.js require() interceptor installed."));
  const Host = yield* G(ExtensionHostService);
  yield* G(
    Host.ActivateById(
      "*",
      { startup: true, activationEvent: "*" }
    )
  );
  yield* G(Effect.logInfo("Startup extensions activated."));
  yield* G(Effect.logInfo("Cocoon is fully initialized and operational."));
  yield* G(Effect.never);
});
const MainEffect = Effect.gen(function* (G) {
  const InitializationData = yield* G(
    PreHandshakeEffect.pipe(Effect.provide(CoreInfraLayer))
  );
  const InitDataLayer = InitDataLive(InitializationData);
  const FinalApplicationLayer = TopLevelLayer.pipe(
    Layer.provide(InitDataLayer)
  );
  yield* G(PostHandshakeEffect.pipe(Effect.provide(FinalApplicationLayer)));
}).pipe(
  Effect.catchAllCause(
    (Cause) => Effect.logFatal("Cocoon main process failed.", Cause)
  ),
  Effect.scoped
);
NodeRuntime.runMain(MainEffect);
//# sourceMappingURL=Cocoon.js.map
