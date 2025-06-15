var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { TextEdit } from "../../Type/ExtHostTypes.js";
import RangeConverter from "./Range.js";
const FromAPI = /* @__PURE__ */ __name((TextEditInstance) => ({
  text: TextEditInstance.newText,
  range: RangeConverter.FromAPI(TextEditInstance.range),
  forceMoveMarkers: false
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((TextEditDTO) => new TextEdit(
  RangeConverter.ToAPI(TextEditDTO.range),
  TextEditDTO.text ?? ""
), "ToAPI");
var TextEdit_default = { FromAPI, ToAPI };
export {
  TextEdit_default as default
};
//# sourceMappingURL=TextEdit.js.map
