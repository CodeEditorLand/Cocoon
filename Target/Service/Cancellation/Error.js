var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class InvalidTokenIdError extends Data.TaggedError(
  "InvalidTokenIdError"
) {
  static {
    __name(this, "InvalidTokenIdError");
  }
  get message() {
    return `Invalid tokenId ('${this.tokenId}') provided. Must be a positive number.`;
  }
}
export {
  InvalidTokenIdError
};
//# sourceMappingURL=Error.js.map
