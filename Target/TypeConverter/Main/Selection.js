var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position, Selection } from "../../Type/ExtHostTypes.js";
function FromAPI(SelectionInstance) {
  return {
    selectionStartLineNumber: SelectionInstance.start.line + 1,
    selectionStartColumn: SelectionInstance.start.character + 1,
    positionLineNumber: SelectionInstance.end.line + 1,
    positionColumn: SelectionInstance.end.character + 1
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(SelectionDTO) {
  const Anchor = new Position(
    SelectionDTO.selectionStartLineNumber - 1,
    SelectionDTO.selectionStartColumn - 1
  );
  const Active = new Position(
    SelectionDTO.positionLineNumber - 1,
    SelectionDTO.positionColumn - 1
  );
  return new Selection(Anchor, Active);
}
__name(ToAPI, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Selection.js.map
