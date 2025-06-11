import * as Path from "path";
import { Barrier, Context, Effect, Layer, Scope } from "effect";
import { ExtensionHost } from "./Core/ExtensionHost.js";
import { CoreServicesLayer } from "./Core/mod.js";
import { RequireInterceptor } from "./Core/RequireInterceptor.js";
import { RunProcessPatches } from "./PatchProcess/mod.js";
import { InitDataLayer } from "./Service/InitData.js";
import { IpcProvider, Live as LiveIpc } from "./Service/Ipc/mod.js";
import { AllServicesLayer } from "./Service/mod.js";
const VscodeOutDir = process.env["VSCODE_OUT_DIR"] ?? Path.resolve(__dirname, "../../../Dependency/VSCode/out");
module.paths.unshift(VscodeOutDir);
const FullAppInitialization = Effect.gen(function* (_) {
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
  const InitBarrier = yield* _(Barrier.make());
  yield* _(RunProcessPatches);
  const Ipc = yield* _(IpcProvider.Tag);
  Ipc.RegisterInvokeHandler(
    "initExtensionHost",
    (InitData) => Effect.gen(function* (_2) {
      yield* _2(
        Effect.logInfo(
          "Received 'initExtensionHost' data from Mountain."
        )
      );
      const AppLayer = AllServicesLayer.pipe(
        Layer.provide(CoreServicesLayer),
        Layer.provide(InitDataLayer(InitData))
      );
      yield* _2(Effect.provide(FullAppInitialization, AppLayer));
      yield* _2(Barrier.succeed(InitBarrier, void 0));
      return "initialized";
    }).pipe(Effect.runPromise)
  );
  yield* _(Ipc.SendNotification("$initialHandshake", []));
  yield* _(Effect.logInfo("Cocoon is ready. Sent handshake to Mountain."));
  yield* _(Barrier.await(InitBarrier));
  yield* _(Effect.logInfo("Cocoon is fully initialized and operational."));
  yield* _(Effect.never);
}).pipe(
  // Global error handler for the entire application.
  Effect.catchAllCause(
    (cause) => Effect.logFatal("Cocoon main process failed.", cause)
  )
);
const AppConfig = {
  MountainAddress: process.env["MOUNTAIN_ADDR"] || "localhost:50051",
  CocoonAddress: process.env["COCOON_ADDR"] || "localhost:50052"
};
const CocoonBaseLayer = LiveIpc(AppConfig);
const AppWithScope = Scope.make().pipe(
  Effect.flatMap(
    (scope) => Effect.provide(Main, CocoonBaseLayer).pipe(Scope.extend(scope))
  )
);
Effect.runFork(AppWithScope);
//# sourceMappingURL=Index.js.map
