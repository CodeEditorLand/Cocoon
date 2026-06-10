var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Webview/Convert/Content/Option/To/DTO.ts
var ConvertContentOptionToDTO = /* @__PURE__ */ __name((ExtensionDescription, Options) => {
  return {
    enableCommandUris: Options.enableCommandUris,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    localResourceRoots: Options.localResourceRoots ?? [
      ExtensionDescription.extensionLocation
    ],
    portMapping: Options.portMapping
  };
}, "ConvertContentOptionToDTO");
export {
  ConvertContentOptionToDTO
};
//# sourceMappingURL=DTO.js.map
