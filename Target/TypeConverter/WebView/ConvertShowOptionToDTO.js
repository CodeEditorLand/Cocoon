var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import ViewColumnConverter from "../Main/ViewColumn.js";
const ConvertShowOptionToDTO = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  return {
    viewColumn: ViewColumnConverter.FromAPI(ViewColumn),
    preserveFocus: PreserveFocus
  };
}, "ConvertShowOptionToDTO");
var ConvertShowOptionToDTO_default = ConvertShowOptionToDTO;
export {
  ConvertShowOptionToDTO_default as default
};
//# sourceMappingURL=ConvertShowOptionToDTO.js.map
