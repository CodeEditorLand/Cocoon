var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import MementoImplementation from "./MementoImplementation.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Log = yield* G(LogService);
  const MementoCacheRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const [GlobalStorage, WorkSpaceStorage] = yield* G(
    IPC.SendRequest("$initializeStorage", []).pipe(
      // If this fails, it's a fatal error. The layer cannot be constructed.
      Effect.orDie
    )
  );
  yield* G(
    Effect.sync(
      () => IPC.RegisterInvokeHandler(
        "$acceptStorageAndMementoData",
        ([GlobalData, WorkSpaceData]) => Effect.runPromise(
          Effect.gen(function* (G2) {
            const GlobalCache = yield* G2(
              Ref.get(MementoCacheRef)
            );
            for (const [Key, Memento] of GlobalCache) {
              if (Memento.Scope === 0 /* GLOBAL */) {
                Memento.acceptValue(
                  GlobalData?.[Key]
                );
              } else {
                Memento.acceptValue(
                  WorkSpaceData?.[Key]
                );
              }
            }
          })
        )
      )
    )
  );
  const StorageImplementation = {
    CreateMemento: /* @__PURE__ */ __name((ExtensionID, IsGlobal) => {
      const CacheKey = `${IsGlobal ? "global" : "workspace"}:${ExtensionID}`;
      const Cached = Effect.runSync(
        Ref.get(MementoCacheRef).pipe(
          Effect.map((Cache) => Cache.get(CacheKey))
        )
      );
      if (Cached) {
        return Cached;
      }
      const ScopeName = IsGlobal ? "Global" : "WorkSpace";
      const InitialValue = IsGlobal ? GlobalStorage?.[ExtensionID] : WorkSpaceStorage?.[ExtensionID];
      Effect.runSync(
        Log.Debug(
          `Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`
        )
      );
      const Memento = new MementoImplementation(
        ExtensionID,
        IsGlobal,
        InitialValue,
        IPC,
        Log
      );
      Effect.runSync(
        Ref.update(
          MementoCacheRef,
          (Map2) => Map2.set(CacheKey, Memento)
        )
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
