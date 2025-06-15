import * as Path from "node:path";
import { NodeRuntime } from "@effect/platform-node";
import { Deferred, Effect, Layer } from "effect";
import CoreServiceLayer from "./Core.js";
import ExtensionHostService from "./Core/ExtensionHost/Service.js";
import RequireInterceptorService from "./Core/RequireInterceptor/Service.js";
import RunProcessPatch from "./PatchProcess.js";
import AllServiceLayer from "./Service.js";
import InitDataLayer from "./Service/InitData/Live.js";
import IPCService from "./Service/IPC/Service.js";
const VSCodeOutputDirectory = process.env["VSCODE_OUT_DIR"] ?? Path.resolve(__dirname, "../../../Dependency/VSCode/out");
module.paths.unshift(VSCodeOutputDirectory);
const FullApplicationInitialization = Effect.gen(function* () {
  const Interceptor = yield* RequireInterceptorService;
  yield* Interceptor.Install();
  yield* Effect.logInfo("Node.js require() interceptor installed.");
  const Host = yield* ExtensionHostService;
  yield* Host.ActivateById(
    "*",
    {
      startup: true,
      activationEvent: "*"
    }
  );
  yield* Effect.logInfo("Startup extensions activated.");
});
const Main = Effect.gen(function* () {
  const InitializationBarrier = yield* Deferred.make();
  yield* RunProcessPatch;
  const IPC = yield* IPCService;
  IPC.RegisterInvokeHandler(
    "initExtensionHost",
    (InitializationData) => Effect.gen(function* () {
      yield* Effect.logInfo(
        "Received 'initExtensionHost' data from Mountain."
      );
      const ApplicationLayer = AllServiceLayer(
        ApplicationConfiguration
      ).pipe(
        Layer.provide(CoreServiceLayer),
        Layer.provide(InitDataLayer(InitializationData))
      );
      yield* Effect.provide(
        FullApplicationInitialization,
        ApplicationLayer
      );
      yield* Deferred.succeed(InitializationBarrier, void 0);
      return "initialized";
    }).pipe(Effect.runPromise)
  );
  yield* IPC.SendNotification("$initialHandshake", []);
  yield* Effect.logInfo("Cocoon is ready. Sent handshake to Mountain.");
  yield* Deferred.await(InitializationBarrier);
  yield* Effect.logInfo("Cocoon is fully initialized and operational.");
  yield* Effect.never;
}).pipe(
  Effect.catchAllCause(
    (Cause) => Effect.logFatal("Cocoon main process failed.", Cause)
  )
);
const ApplicationConfiguration = {
  MountainAddress: process.env["MOUNTAIN_ADDR"] || "localhost:50051",
  CocoonAddress: process.env["COCOON_ADDR"] || "localhost:50052"
};
const PreInitLayer = Layer.mergeAll(
  CoreServiceLayer,
  AllServiceLayer(ApplicationConfiguration)
);
const RunnableApplication = Effect.provide(Main, PreInitLayer);
NodeRuntime.runMain(RunnableApplication);
//# sourceMappingURL=Cocoon.js.map
