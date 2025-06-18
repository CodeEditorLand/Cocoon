var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position, Range } from "../../Type/ExtHostTypes.js";
const FromAPI = /* @__PURE__ */ __name((RangeInstance) => ({
  startLineNumber: RangeInstance.start.line + 1,
  startColumn: RangeInstance.start.character + 1,
  endLineNumber: RangeInstance.end.line + 1,
  endColumn: RangeInstance.end.character + 1
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((RangeDTO) => new Range(
  new Position(RangeDTO.startLineNumber - 1, RangeDTO.startColumn - 1),
  new Position(RangeDTO.endLineNumber - 1, RangeDTO.endColumn - 1)
), "ToAPI");
var Range_default = { FromAPI, ToAPI };
export {
  Range_default as default
};
//# sourceMappingURL=Range.js.map
