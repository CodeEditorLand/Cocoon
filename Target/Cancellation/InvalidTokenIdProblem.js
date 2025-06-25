var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class InvalidTokenIdProblem extends Data.TaggedError(
  "InvalidTokenIdProblem"
) {
  static {
    __name(this, "InvalidTokenIdProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Invalid TokenId ('${this.TokenId}') provided. Must be a positive number.`;
  }
}
export {
  InvalidTokenIdProblem
};
//# sourceMappingURL=InvalidTokenIdProblem.js.map
