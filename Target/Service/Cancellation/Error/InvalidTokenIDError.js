var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class InvalidTokenIDError_default extends Data.TaggedError("InvalidTokenIDError") {
  static {
    __name(this, "default");
  }
  constructor(properties) {
    super(properties);
    this.message = `Invalid TokenID ('${this.TokenID}') provided. Must be a positive number.`;
  }
  message;
}
export {
  InvalidTokenIDError_default as default
};
//# sourceMappingURL=InvalidTokenIDError.js.map
