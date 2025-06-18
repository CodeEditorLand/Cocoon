var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class EnvironmentService extends Context.Tag(
  "Service/Environment"
)() {
  static {
    __name(this, "EnvironmentService");
  }
}
export {
  EnvironmentService as default
};
//# sourceMappingURL=Service.js.map
