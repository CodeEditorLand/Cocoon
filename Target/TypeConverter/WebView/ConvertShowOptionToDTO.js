var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ViewColumnConverter from "../Main/ViewColumn.js";
function ConvertShowOptionToDTO(ViewColumn, PreserveFocus) {
  return {
    viewColumn: ViewColumnConverter.FromAPI(ViewColumn),
    preserveFocus: PreserveFocus
  };
}
__name(ConvertShowOptionToDTO, "ConvertShowOptionToDTO");
export {
  ConvertShowOptionToDTO
};
//# sourceMappingURL=ConvertShowOptionToDTO.js.map
