var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class DialogProblem extends Data.TaggedError("DialogProblem") {
  static {
    __name(this, "DialogProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Dialog operation failed: ${this.Context}`;
  }
}
export {
  DialogProblem
};
//# sourceMappingURL=DialogProblem.js.map
