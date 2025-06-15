var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position, Selection } from "../../Type/ExtHostTypes.js";
const FromAPI = /* @__PURE__ */ __name((SelectionInstance) => {
  return {
    selectionStartLineNumber: SelectionInstance.start.line + 1,
    selectionStartColumn: SelectionInstance.start.character + 1,
    positionLineNumber: SelectionInstance.end.line + 1,
    positionColumn: SelectionInstance.end.character + 1
  };
}, "FromAPI");
const ToAPI = /* @__PURE__ */ __name((SelectionDTO) => {
  const Anchor = new Position(
    SelectionDTO.selectionStartLineNumber - 1,
    SelectionDTO.selectionStartColumn - 1
  );
  const Active = new Position(
    SelectionDTO.positionLineNumber - 1,
    SelectionDTO.positionColumn - 1
  );
  return new Selection(Anchor, Active);
}, "ToAPI");
var Selection_default = { FromAPI, ToAPI };
export {
  Selection_default as default
};
//# sourceMappingURL=Selection.js.map
