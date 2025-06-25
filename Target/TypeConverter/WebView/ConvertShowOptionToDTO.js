var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { FromAPI as ViewColumnFromAPI } from "../Main/ViewColumn.js";
const ConvertShowOptionToDTO = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  const DTO = {
    preserveFocus: PreserveFocus
  };
  const ViewColumnValue = ViewColumnFromAPI(ViewColumn);
  if (ViewColumnValue !== void 0) {
    DTO.viewColumn = ViewColumnValue;
  }
  return DTO;
}, "ConvertShowOptionToDTO");
export {
  ConvertShowOptionToDTO
};
//# sourceMappingURL=ConvertShowOptionToDTO.js.map
