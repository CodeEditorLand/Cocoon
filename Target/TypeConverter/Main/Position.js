var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position } from "../../Type/ExtHostTypes.js";
function FromAPI(PositionInstance) {
  return {
    lineNumber: PositionInstance.line + 1,
    column: PositionInstance.character + 1
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(PositionDTO) {
  return new Position(PositionDTO.lineNumber - 1, PositionDTO.column - 1);
}
__name(ToAPI, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Position.js.map
