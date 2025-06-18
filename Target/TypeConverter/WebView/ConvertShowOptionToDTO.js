var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import ViewColumnConverter from "../Main/ViewColumn.js";
var ConvertShowOptionToDTO_default = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  return {
    viewColumn: ViewColumnConverter.FromAPI(ViewColumn),
    preserveFocus: PreserveFocus
  };
}, "default");
export {
  ConvertShowOptionToDTO_default as default
};
//# sourceMappingURL=ConvertShowOptionToDTO.js.map
