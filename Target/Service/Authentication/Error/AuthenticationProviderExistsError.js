var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class AuthenticationProviderExistsError_default extends Data.TaggedError(
  "AuthenticationProviderExistsError"
) {
  static {
    __name(this, "default");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Authentication provider with ID '${this.ProviderID}' is already registered.`;
  }
  message;
}
export {
  AuthenticationProviderExistsError_default as default
};
//# sourceMappingURL=AuthenticationProviderExistsError.js.map
