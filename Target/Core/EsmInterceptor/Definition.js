var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Buffer as Buffer2 } from "node:buffer";
import * as Module from "node:module";
import { MessageChannel } from "node:worker_threads";
import { BidirectionalMap, Effect, pipe, Ref, Scope } from "effect";
import { Tag as ApiFactoryTag } from "../ApiFactory/mod.js";
import { LOADER_HOOK_SCRIPT_FILENAME } from "./Constants.js";
import { HandleResolveRequest } from "./HandleResolveRequest.js";
import { LoadHookScript } from "./LoadHookScript.js";
import { SetupGlobalApiRetriever } from "./SetupGlobalApiRetriever.js";
const Definition = Effect.gen(function* (_) {
  const ApiFactory = yield* _(ApiFactoryTag);
  const InstallEffect = /* @__PURE__ */ __name(() => Effect.gen(function* (_2) {
    if (typeof Module.register !== "function") {
      return yield* _2(
        Effect.fail(
          new Error(
            "`node:module.register` is not available. ESM interception will fail."
          )
        )
      );
    }
    const VscodeApiCache = yield* _2(
      Ref.make(BidirectionalMap.empty())
    );
    const DataUriCache = yield* _2(Ref.make(/* @__PURE__ */ new Map()));
    const { port1: MainThreadPort, port2: LoaderHookPort } = new MessageChannel();
    yield* _2(SetupGlobalApiRetriever(VscodeApiCache));
    MainThreadPort.on("message", (Message) => {
      Effect.runFork(
        HandleResolveRequest({
          Message,
          ApiFactory,
          VscodeApiCache,
          DataUriCache,
          MainThreadPort
        })
      );
    });
    const HookScriptContent = yield* _2(
      LoadHookScript(LOADER_HOOK_SCRIPT_FILENAME)
    );
    const HookDataUri = `data:text/javascript;base64,${Buffer2.from(HookScriptContent).toString("base64")}`;
    Module.register(HookDataUri, {
      parentURL: import.meta.url,
      data: { port: LoaderHookPort },
      transferList: [LoaderHookPort]
    });
    yield* _2(
      Effect.logInfo("ESM loader hook successfully registered.")
    );
    yield* _2(
      Scope.addFinalizer(
        Effect.sync(() => {
          MainThreadPort.close();
          LoaderHookPort.close();
          delete globalThis[ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME];
          Effect.logInfo("ESM Interceptor resources released.");
        })
      )
    );
  }).pipe(
    Effect.catchAll(
      (error) => Effect.logFatal(
        "Critical failure during ESM Interceptor installation.",
        error
      )
    )
  ), "InstallEffect");
  return { Install: InstallEffect };
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
