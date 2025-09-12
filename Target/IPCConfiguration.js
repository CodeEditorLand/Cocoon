var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
class IPCConfigurationService extends Effect.Service()(
  "Service/IPCConfiguration",
  {
    effect: Effect.gen(function* () {
      return {
        MountainAddress: process.env["MOUNTAIN_ADDR"] ?? "localhost:50051",
        CocoonAddress: process.env["COCOON_ADDR"] ?? "localhost:50052"
      };
    })
  }
) {
  static {
    __name(this, "IPCConfigurationService");
  }
}
export {
  IPCConfigurationService
};
//# sourceMappingURL=IPCConfiguration.js.map
