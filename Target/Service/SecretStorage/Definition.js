var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { SecretStorageImpl } from "./SecretStorageImpl.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Log = yield* _(LogProvider.Tag);
  const ServiceImplementation = {
    CreateStorage: /* @__PURE__ */ __name((ExtensionId) => {
      Log.Debug(`Created SecretStorage for extension: '${ExtensionId}'`);
      return new SecretStorageImpl(ExtensionId, Ipc, Log);
    }, "CreateStorage")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
