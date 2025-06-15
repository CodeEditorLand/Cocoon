var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import SecretStorageImplementation from "./SecretStorageImplementation.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const SecretStorageFactoryImplementation = {
    CreateStorage: /* @__PURE__ */ __name((ExtensionID) => {
      Log.Debug(`Created SecretStorage for extension: '${ExtensionID}'`);
      return new SecretStorageImplementation(ExtensionID, IPC, Log);
    }, "CreateStorage")
  };
  return SecretStorageFactoryImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
