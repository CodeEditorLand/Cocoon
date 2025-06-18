var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class SecretStorageService extends Context.Tag(
  "Service/SecretStorage"
)() {
  static {
    __name(this, "SecretStorageService");
  }
}
export {
  SecretStorageService as default
};
//# sourceMappingURL=Service.js.map
