var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import MementoImplementation from "./MementoImplementation.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const MementoCache = yield* Ref.make(
    /* @__PURE__ */ new Map()
  );
  const [Global, WorkSpace] = yield* IPC.SendRequest(
    "$initializeStorage",
    []
  );
  IPC.RegisterInvokeHandler(
    "$acceptStorageAndMementoData",
    ([GlobalData, WorkSpaceData]) => {
      const UpdateEffect = Effect.gen(function* () {
        const GlobalCache = yield* Ref.get(MementoCache);
        for (const [Key, Memento] of GlobalCache) {
          if (Memento["Scope"] === 0 /* GLOBAL */) {
            Memento.acceptValue(GlobalData[Key]);
          } else {
            Memento.acceptValue(WorkSpaceData[Key]);
          }
        }
      });
      return Effect.runPromise(UpdateEffect);
    }
  );
  const StorageImplementation = {
    CreateMemento: /* @__PURE__ */ __name((ExtensionID, IsGlobal) => {
      const CacheKey = `${IsGlobal ? "global" : "workspace"}:${ExtensionID}`;
      const Cached = Effect.runSync(
        Ref.get(MementoCache).pipe(
          Effect.map((Cache) => Cache.get(CacheKey))
        )
      );
      if (Cached) {
        return Cached;
      }
      const ScopeName = IsGlobal ? "Global" : "WorkSpace";
      const InitialValue = IsGlobal ? Global[ExtensionID] : WorkSpace[ExtensionID];
      Log.Debug(
        `Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`
      );
      const Memento = new MementoImplementation(
        ExtensionID,
        IsGlobal,
        IPC,
        Log,
        InitialValue
      );
      Effect.runSync(
        Ref.update(MementoCache, (Map2) => Map2.set(CacheKey, Memento))
      );
      return Memento;
    }, "CreateMemento")
  };
  return StorageImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
