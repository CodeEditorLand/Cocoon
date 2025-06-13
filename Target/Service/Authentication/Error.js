var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class AuthenticationProviderExistsError extends Data.TaggedError(
  "AuthenticationProviderExistsError"
) {
  static {
    __name(this, "AuthenticationProviderExistsError");
  }
  get message() {
    return `Authentication provider with ID '${this.ProviderID}' is already registered.`;
  }
}
class AuthenticationProviderRegistrationError extends Data.TaggedError(
  "AuthenticationProviderRegistrationError"
) {
  static {
    __name(this, "AuthenticationProviderRegistrationError");
  }
}
export {
  AuthenticationProviderExistsError,
  AuthenticationProviderRegistrationError
};
//# sourceMappingURL=Error.js.map
