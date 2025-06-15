var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position } from "../../Type/ExtHostTypes.js";
const FromAPI = /* @__PURE__ */ __name((PositionInstance) => ({
  lineNumber: PositionInstance.line + 1,
  column: PositionInstance.character + 1
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((PositionDTO) => new Position(PositionDTO.lineNumber - 1, PositionDTO.column - 1), "ToAPI");
var Position_default = { FromAPI, ToAPI };
export {
  Position_default as default
};
//# sourceMappingURL=Position.js.map
