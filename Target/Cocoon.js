import * as Path from "path";
import { Barrier, Effect, Layer, Scope } from "effect";
import { CoreServiceLayer } from "./Core.js";
import { ExtensionHost } from "./Core/ExtensionHost.js";
import { RequireInterceptor } from "./Core/RequireInterceptor.js";
import { RunProcessPatch } from "./PatchProcess.js";
import { AllServiceLayer } from "./Service.js";
import { InitDataLayer } from "./Service/InitData.js";
import { IPCProvider, Live as LiveIPC } from "./Service/IPC.js";
const VSCodeOutputDirectory = process.env["VSCODE_OUT_DIR"] ?? Path.resolve(__dirname, "../../../Dependency/VSCode/out");
module.paths.unshift(VSCodeOutputDirectory);
const FullApplicationInitialization = Effect.gen(function* (_) {
  const Interceptor = yield* _(RequireInterceptor.Tag);
  yield* _(Interceptor.Install());
  yield* _(Effect.logInfo("Node.js require() interceptor installed."));
  const Host = yield* _(ExtensionHost.Tag);
  yield* _(
    Host.ActivateById("*", { startup: true, activationEvent: "*" })
  );
  yield* _(Effect.logInfo("Startup extensions activated."));
});
const Main = Effect.gen(function* (_) {
  const InitializationBarrier = yield* _(Barrier.make());
  yield* _(RunProcessPatch);
  const IPC = yield* _(IPCProvider.Tag);
  IPC.RegisterInvokeHandler(
    "initExtensionHost",
    (initializationData) => Effect.gen(function* (_2) {
      yield* _2(
        Effect.logInfo(
          "Received 'initExtensionHost' data from Mountain."
        )
      );
      const ApplicationLayer = AllServiceLayer.pipe(
        Layer.provide(CoreServiceLayer),
        Layer.provide(InitDataLayer(initializationData))
      );
      yield* _2(
        Effect.provide(
          FullApplicationInitialization,
          ApplicationLayer
        )
      );
      yield* _2(Barrier.succeed(InitializationBarrier, void 0));
      return "initialized";
    }).pipe(Effect.runPromise)
  );
  yield* _(IPC.SendNotification("$initialHandshake", []));
  yield* _(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));
  yield* _(Barrier.await(InitializationBarrier));
  yield* _(Effect.logInfo("Cocoon is fully initialized and operational."));
  yield* _(Effect.never);
}).pipe(
  // Global error handler for the entire application.
  Effect.catchAllCause(
    (cause) => Effect.logFatal("Cocoon main process failed.", cause)
  )
);
const ApplicationConfiguration = {
  MountainAddress: process.env["MOUNTAIN_ADDR"] || "localhost:50051",
  CocoonAddress: process.env["COCOON_ADDR"] || "localhost:50052"
};
const CocoonBaseLayer = LiveIPC(ApplicationConfiguration);
const ApplicationWithScope = Scope.make().pipe(
  Effect.flatMap(
    (scope) => Effect.provide(Main, CocoonBaseLayer).pipe(Scope.extend(scope))
  )
);
Effect.runFork(ApplicationWithScope);
//# sourceMappingURL=Cocoon.js.map
