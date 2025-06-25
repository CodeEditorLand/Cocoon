var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  Range as ExtHostRange,
  TextEdit as ExtHostTextEdit
} from "../../Platform/VSCode/Type.js";
import { ToAPI as RangeToAPI, FromAPI as RangeFromAPI } from "./Range.js";
function ToExtHostRange(range) {
  return new ExtHostRange(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}
__name(ToExtHostRange, "ToExtHostRange");
const FromAPI = /* @__PURE__ */ __name((TextEditInstance) => ({
  text: TextEditInstance.newText,
  range: RangeFromAPI(TextEditInstance.range),
  forceMoveMarkers: false
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((TextEditDTO) => new ExtHostTextEdit(
  ToExtHostRange(RangeToAPI(TextEditDTO.range)),
  TextEditDTO.text ?? ""
), "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=TextEdit.js.map
