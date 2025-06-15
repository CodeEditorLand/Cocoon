var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
import AuthenticationProviderExistsError from "./Error/AuthenticationProviderExistsError.js";
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
