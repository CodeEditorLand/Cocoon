var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Buffer as Buffer2 } from "node:buffer";
import * as Module from "node:module";
import { URL } from "node:url";
import { MessageChannel } from "node:worker_threads";
import { Effect, Option, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
import ExtensionPathService from "../ExtensionPath/Service.js";
import {
  ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME,
  LOADER_HOOK_SCRIPT_FILENAME
} from "./Constants.js";
import CreateDynamicModule from "./CreateDynamicModule.js";
class BidirectionalMap {
  static {
    __name(this, "BidirectionalMap");
  }
  A = /* @__PURE__ */ new Map();
  B = /* @__PURE__ */ new Map();
  set(Key, Value) {
    this.A.set(Key, Value);
    this.B.set(Value, Key);
    return this;
  }
  getKey(Value) {
    return Option.fromNullable(this.B.get(Value));
  }
}
const LoadHookScriptEffect = /* @__PURE__ */ __name((FileName) => {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const { readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const ScriptPath = join(__dirname, FileName);
      return readFileSync(ScriptPath, "utf-8");
    }, "try"),
    catch: /* @__PURE__ */ __name((CaughtError) => new Error(`Failed to load ESM hook script: ${CaughtError}`), "catch")
  });
}, "LoadHookScriptEffect");
const SetupGlobalAPIRetrieverEffect = /* @__PURE__ */ __name((APICache) => {
  return Effect.sync(() => {
    globalThis[ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME] = (APIKey) => {
      const Cache = Effect.runSync(Ref.get(APICache));
      const MaybeAPI = Cache.getKey(APIKey);
      if (Option.isSome(MaybeAPI)) {
        return MaybeAPI.value;
      }
      return void 0;
    };
  });
}, "SetupGlobalAPIRetrieverEffect");
const HandleResolveRequestEffect = /* @__PURE__ */ __name((Message, APIFactory, ExtensionPath, Log, VSCodeAPICache, DataURICache, MainThreadPort) => {
  return Effect.gen(function* (G) {
    const { ID, ImportingModuleURL } = Message;
    const ParentURI = yield* G(
      Effect.try({
        try: /* @__PURE__ */ __name(() => new URL(ImportingModuleURL), "try"),
        catch: /* @__PURE__ */ __name((CaughtError) => new Error(`Invalid URL: ${CaughtError}`), "catch")
      })
    );
    const VscodeParentUri = {
      scheme: ParentURI.protocol.slice(0, -1),
      authority: ParentURI.host,
      path: ParentURI.pathname,
      query: ParentURI.search,
      fragment: ParentURI.hash,
      fsPath: ParentURI.pathname,
      with: /* @__PURE__ */ __name(() => VscodeParentUri, "with"),
      toJSON: /* @__PURE__ */ __name(() => ({
        scheme: VscodeParentUri.scheme,
        authority: VscodeParentUri.authority,
        path: VscodeParentUri.path,
        query: VscodeParentUri.query,
        fragment: VscodeParentUri.fragment
      }), "toJSON")
    };
    const MaybeExtension = ExtensionPath.FindSubstr(VscodeParentUri);
    if (!MaybeExtension) {
      const ErrorValue = new Error(
        `Could not find extension for module: ${ImportingModuleURL}`
      );
      yield* G(
        Log.Error(
          "ESM Interceptor failed to identify extension.",
          ErrorValue
        )
      );
      MainThreadPort.postMessage({
        id: ID,
        error: { message: ErrorValue.message }
      });
      return;
    }
    const DataURICacheValue = yield* G(Ref.get(DataURICache));
    const CachedDataURI = DataURICacheValue.get(
      MaybeExtension.identifier.value
    );
    if (CachedDataURI) {
      MainThreadPort.postMessage({ id: ID, url: CachedDataURI });
      return;
    }
    const APIObject = APIFactory.CreateAPI(MaybeExtension);
    const APIKey = generateUuid();
    yield* G(
      Ref.update(VSCodeAPICache, (Cache) => Cache.set(APIObject, APIKey))
    );
    const ModuleScript = CreateDynamicModule(
      APIKey,
      APIObject
    );
    const DataURI = `data:text/javascript;base64,${Buffer2.from(ModuleScript).toString("base64")}`;
    yield* G(
      Ref.update(
        DataURICache,
        (Map2) => Map2.set(MaybeExtension.identifier.value, DataURI)
      )
    );
    MainThreadPort.postMessage({ id: ID, url: DataURI });
  });
}, "HandleResolveRequestEffect");
var Definition_default = Effect.gen(function* (G) {
  const APIFactory = yield* G(APIFactoryService);
  const ExtensionPath = yield* G(ExtensionPathService);
  const Log = yield* G(LogService);
  const InstallEffect = /* @__PURE__ */ __name(() => Effect.gen(function* (G2) {
    if (typeof Module.register !== "function") {
      return yield* G2(
        Effect.fail(
          new Error(
            "`node:module.register` is not available. ESM interception will fail."
          )
        )
      );
    }
    const VSCodeAPICache = yield* G2(
      Ref.make(new BidirectionalMap())
    );
    const DataURICache = yield* G2(Ref.make(/* @__PURE__ */ new Map()));
    const { port1: MainThreadPort, port2: LoaderHookPort } = new MessageChannel();
    yield* G2(SetupGlobalAPIRetrieverEffect(VSCodeAPICache));
    MainThreadPort.on(
      "message",
      (Message) => Effect.runFork(
        HandleResolveRequestEffect(
          Message,
          APIFactory,
          ExtensionPath,
          Log,
          VSCodeAPICache,
          DataURICache,
          MainThreadPort
        )
      )
    );
    const HookScriptContent = yield* G2(
      LoadHookScriptEffect(LOADER_HOOK_SCRIPT_FILENAME)
    );
    const HookDataURI = `data:text/javascript;base64,${Buffer2.from(HookScriptContent).toString("base64")}`;
    Module.register(HookDataURI, {
      parentURL: import.meta.url,
      data: { port: LoaderHookPort },
      transferList: [LoaderHookPort]
    });
    yield* G2(Log.Info("ESM loader hook successfully registered."));
    yield* G2(
      Effect.addFinalizer(
        () => Effect.sync(() => {
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
      (Error2) => Log.Fatal(
        "Critical failure during ESM Interceptor installation.",
        Error2
      )
    ),
    Effect.scoped
    // Use Effect.scoped to discharge the Scope requirement from addFinalizer
  ), "InstallEffect");
  const ESMInterceptorImplementation = {
    Install: InstallEffect
  };
  return ESMInterceptorImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
