var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { FromAPI as ViewColumnFromAPI } from "../Main/ViewColumn.js";
const ConvertShowOptionToDTO = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  return {
    viewColumn: ViewColumnFromAPI(ViewColumn),
    preserveFocus: PreserveFocus
  };
}, "ConvertShowOptionToDTO");
export {
  ConvertShowOptionToDTO
};
//# sourceMappingURL=ConvertShowOptionToDTO.js.map
