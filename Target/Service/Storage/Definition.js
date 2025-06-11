var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { MementoImpl } from "./MementoImpl.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Log = yield* _(LogProvider.Tag);
  const ServiceImplementation = {
    CreateMemento: /* @__PURE__ */ __name((ExtensionId, IsGlobal) => {
      const ScopeName = IsGlobal ? "Global" : "Workspace";
      Log.Debug(
        `Created Memento for ExtId='${ExtensionId}', Scope='${ScopeName}'`
      );
      return new MementoImpl(ExtensionId, IsGlobal, Ipc, Log);
    }, "CreateMemento")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
