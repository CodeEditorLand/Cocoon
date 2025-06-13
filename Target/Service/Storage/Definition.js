var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { MementoImplementation } from "./MementoImplementation.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const MementoCache = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const [global, workspace] = yield* _(
    IPCService.SendRequest("$initializeStorage", [])
  );
  IPCService.RegisterInvokeHandler(
    "$acceptStorageAndMementoData",
    ([global2, workspace2]) => {
      const globalCache = Ref.get(MementoCache).pipe(Effect.runSync);
      for (const [key, memento] of globalCache) {
        if (memento["Scope"] === 0 /* GLOBAL */) {
          memento.acceptValue(global2[key]);
        } else {
          memento.acceptValue(workspace2[key]);
        }
      }
      return Promise.resolve();
    }
  );
  const ServiceImplementation = {
    CreateMemento: /* @__PURE__ */ __name((ExtensionID, IsGlobal) => {
      const cacheKey = `${IsGlobal ? "global" : "workspace"}:${ExtensionID}`;
      const cached = Ref.get(MementoCache).pipe(
        Effect.map((c) => c.get(cacheKey)),
        Effect.runSync
      );
      if (cached) {
        return cached;
      }
      const ScopeName = IsGlobal ? "Global" : "WorkSpace";
      const initialValue = IsGlobal ? global[ExtensionID] : workspace[ExtensionID];
      LogService.Debug(
        `Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`
      );
      const memento = new MementoImplementation(
        ExtensionID,
        IsGlobal,
        IPCService,
        LogService,
        initialValue
      );
      Ref.update(MementoCache, (map) => map.set(cacheKey, memento)).pipe(
        Effect.runSync
      );
      return memento;
    }, "CreateMemento")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
