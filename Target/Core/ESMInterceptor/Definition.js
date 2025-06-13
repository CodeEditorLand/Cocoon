var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Buffer as Buffer2 } from "node:buffer";
import * as Module from "node:module";
import { MessageChannel } from "node:worker_threads";
import { BidirectionalMap, Effect, Ref, Scope } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import { Log } from "../../Service/Log.js";
import { APIFactory } from "../APIFactory.js";
import { ExtensionPath } from "../ExtensionPath.js";
import {
  ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME,
  LOADER_HOOK_SCRIPT_FILENAME
} from "./Constants.js";
import { CreateDynamicModule } from "./CreateDynamicModule.js";
function LoadHookScript(FileName) {
  return Effect.try({
    try: /* @__PURE__ */ __name(() => {
      const { readFileSync } = require("node:fs");
      const { join } = require("node:path");
      const scriptPath = join(__dirname, FileName);
      return readFileSync(scriptPath, "utf-8");
    }, "try"),
    catch: /* @__PURE__ */ __name((e) => new Error(`Failed to load ESM hook script: ${e}`), "catch")
  });
}
__name(LoadHookScript, "LoadHookScript");
function SetupGlobalAPIRetriever(APICache) {
  return Effect.sync(() => {
    globalThis[ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME] = (APIKey) => {
      const cache = Ref.get(APICache).pipe(Effect.runSync);
      const maybeAPI = BidirectionalMap.getKey(cache, APIKey);
      if (maybeAPI._tag === "Some") {
        return maybeAPI.value;
      }
      return void 0;
    };
  });
}
__name(SetupGlobalAPIRetriever, "SetupGlobalAPIRetriever");
function HandleResolveRequest({
  Message,
  APIFactory: APIFactory2,
  ExtensionPath: ExtensionPath2,
  Log: Log2,
  VSCodeAPICache,
  DataURICache,
  MainThreadPort
}) {
  return Effect.gen(function* (_) {
    const { ID, ImportingModuleURL } = Message;
    const parentURI = yield* _(
      Effect.try(() => new URL(ImportingModuleURL))
    );
    const extension = ExtensionPath2.FindSubstr(parentURI);
    if (!extension) {
      const error = new Error(
        `Could not find extension for module: ${ImportingModuleURL}`
      );
      yield* _(
        Log2.Error(
          "ESM Interceptor failed to identify extension.",
          error
        )
      );
      MainThreadPort.postMessage({
        id: ID,
        error: { message: error.message }
      });
      return;
    }
    const dataURICache = yield* _(Ref.get(DataURICache));
    if (dataURICache.has(extension.identifier.value)) {
      MainThreadPort.postMessage({
        id: ID,
        url: dataURICache.get(extension.identifier.value)
      });
      return;
    }
    const apiCache = yield* _(Ref.get(VSCodeAPICache));
    let apiKey = BidirectionalMap.get(apiCache, extension);
    let apiObject;
    if (apiKey._tag === "None") {
      apiObject = APIFactory2.CreateAPI(extension);
      apiKey = generateUuid();
      yield* _(
        Ref.update(
          VSCodeAPICache,
          BidirectionalMap.set(apiObject, apiKey)
        )
      );
    } else {
      apiObject = APIFactory2.CreateAPI(extension);
    }
    const moduleScript = CreateDynamicModule(apiKey, apiObject);
    const dataURI = `data:text/javascript;base64,${Buffer2.from(moduleScript).toString("base64")}`;
    yield* _(
      Ref.update(
        DataURICache,
        (map) => map.set(extension.identifier.value, dataURI)
      )
    );
    MainThreadPort.postMessage({ id: ID, url: dataURI });
  });
}
__name(HandleResolveRequest, "HandleResolveRequest");
const Definition = Effect.gen(function* (_) {
  const APIFactoryService = yield* _(APIFactory.Tag);
  const ExtensionPathService = yield* _(ExtensionPath.Tag);
  const LogService = yield* _(Log.Tag);
  const Install = /* @__PURE__ */ __name(() => Effect.gen(function* (_2) {
    if (typeof Module.register !== "function") {
      return yield* _2(
        Effect.fail(
          new Error(
            "`node:module.register` is not available. ESM interception will fail."
          )
        )
      );
    }
    const VSCodeAPICache = yield* _2(
      Ref.make(BidirectionalMap.empty())
    );
    const DataURICache = yield* _2(Ref.make(/* @__PURE__ */ new Map()));
    const { port1: MainThreadPort, port2: LoaderHookPort } = new MessageChannel();
    yield* _2(SetupGlobalAPIRetriever(VSCodeAPICache));
    MainThreadPort.on("message", (Message) => {
      Effect.runFork(
        HandleResolveRequest({
          Message,
          APIFactory: APIFactoryService,
          ExtensionPath: ExtensionPathService,
          Log: LogService,
          VSCodeAPICache,
          DataURICache,
          MainThreadPort
        })
      );
    });
    const HookScriptContent = yield* _2(
      LoadHookScript(LOADER_HOOK_SCRIPT_FILENAME)
    );
    const HookDataURI = `data:text/javascript;base64,${Buffer2.from(HookScriptContent).toString("base64")}`;
    Module.register(HookDataURI, {
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
        }).pipe(
          Effect.tap(
            () => Effect.logInfo(
              "ESM Interceptor resources released."
            )
          )
        )
      )
    );
  }).pipe(
    Effect.catchAll(
      (error) => Effect.logFatal(
        "Critical failure during ESM Interceptor installation.",
        error
      )
    )
  ), "Install");
  return { Install };
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
