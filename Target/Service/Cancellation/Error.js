var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class InvalidTokenIDError extends Data.TaggedError(
  "InvalidTokenIDError"
) {
  static {
    __name(this, "InvalidTokenIDError");
  }
  get message() {
    return `Invalid TokenID ('${this.TokenID}') provided. Must be a positive number.`;
  }
}
export {
  InvalidTokenIDError
};
//# sourceMappingURL=Error.js.map
