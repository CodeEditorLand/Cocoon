var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Range, TextEdit as VscTextEdit } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";
function FromAPI(TextEditInstance) {
  return {
    text: TextEditInstance.newText,
    range: RangeConverter.FromAPI(TextEditInstance.range),
    eol: TextEditInstance.newEol
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(TextEditDTO) {
  let range;
  if (TextEditDTO.range) {
    range = RangeConverter.ToAPI(TextEditDTO.range);
  } else {
    range = new Range(0, 0, 0, 0);
  }
  return new VscTextEdit(range, TextEditDTO.text, TextEditDTO.eol);
}
__name(ToAPI, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=TextEdit.js.map
