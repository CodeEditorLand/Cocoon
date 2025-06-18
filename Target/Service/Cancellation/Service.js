var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class CancellationService extends Context.Tag(
  "Service/CancellationTokenProvider"
)() {
  static {
    __name(this, "CancellationService");
  }
}
export {
  CancellationService as default
};
//# sourceMappingURL=Service.js.map
