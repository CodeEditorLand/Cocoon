var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context } from "effect";
class AuthenticationService extends Context.Tag(
  "Service/Authentication"
)() {
  static {
    __name(this, "AuthenticationService");
  }
}
export {
  AuthenticationService as default
};
//# sourceMappingURL=Service.js.map
