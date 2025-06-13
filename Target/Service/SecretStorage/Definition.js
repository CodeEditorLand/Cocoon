var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { SecretStorageImplementation } from "./SecretStorageImplementation.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const ServiceImplementation = {
    CreateStorage: /* @__PURE__ */ __name((ExtensionID) => {
      LogService.Debug(
        `Created SecretStorage for extension: '${ExtensionID}'`
      );
      return new SecretStorageImplementation(
        ExtensionID,
        IPCService,
        LogService
      );
    }, "CreateStorage")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
