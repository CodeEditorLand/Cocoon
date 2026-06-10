var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Webview/Convert/Panel/Option/To/DTO.ts
var ConvertPanelOptionToDTO = /* @__PURE__ */ __name((Options) => {
  const dto = {};
  if (Options.enableFindWidget !== void 0) {
    dto.enableFindWidget = Options.enableFindWidget;
  }
  if (Options.retainContextWhenHidden !== void 0) {
    dto.retainContextWhenHidden = Options.retainContextWhenHidden;
  }
  return dto;
}, "ConvertPanelOptionToDTO");
export {
  ConvertPanelOptionToDTO
};
//# sourceMappingURL=DTO.js.map
