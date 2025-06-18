var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class InvalidTokenIDError extends Data.TaggedError(
  "InvalidTokenIDError"
) {
  static {
    __name(this, "InvalidTokenIDError");
  }
  constructor(properties) {
    super(properties);
    this.message = `Invalid TokenID ('${this.TokenID}') provided. Must be a positive number.`;
  }
  message;
}
var InvalidTokenIDError_default = InvalidTokenIDError;
export {
  InvalidTokenIDError,
  InvalidTokenIDError_default as default
};
//# sourceMappingURL=InvalidTokenIDError.js.map
