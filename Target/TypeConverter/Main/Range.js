var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position, Range } from "../../Type/ExtHostTypes.js";
function FromAPI(RangeInstance) {
  return {
    startLineNumber: RangeInstance.start.line + 1,
    startColumn: RangeInstance.start.character + 1,
    endLineNumber: RangeInstance.end.line + 1,
    endColumn: RangeInstance.end.character + 1
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(RangeDTO) {
  return new Range(
    new Position(RangeDTO.startLineNumber - 1, RangeDTO.startColumn - 1),
    new Position(RangeDTO.endLineNumber - 1, RangeDTO.endColumn - 1)
  );
}
__name(ToAPI, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Range.js.map
