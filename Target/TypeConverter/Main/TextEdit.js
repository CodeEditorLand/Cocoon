var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  Range as ExtHostRange,
  TextEdit as ExtHostTextEdit
} from "../../Type/ExtHostTypes.js";
import RangeConverter from "./Range.js";
function toExtHostRange(range) {
  return new ExtHostRange(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}
__name(toExtHostRange, "toExtHostRange");
const FromAPI = /* @__PURE__ */ __name((TextEditInstance) => ({
  text: TextEditInstance.newText,
  range: RangeConverter.FromAPI(TextEditInstance.range),
  forceMoveMarkers: false
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((TextEditDTO) => new ExtHostTextEdit(
  toExtHostRange(RangeConverter.ToAPI(TextEditDTO.range)),
  TextEditDTO.text ?? ""
), "ToAPI");
var TextEdit_default = { FromAPI, ToAPI };
export {
  TextEdit_default as default
};
//# sourceMappingURL=TextEdit.js.map
