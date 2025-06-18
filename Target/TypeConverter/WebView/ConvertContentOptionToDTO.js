var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var ConvertContentOptionToDTO_default = /* @__PURE__ */ __name((ExtensionDescription, Options) => {
  return {
    enableCommandUris: Options.enableCommandUris,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    localResourceRoots: Options.localResourceRoots ?? [
      ExtensionDescription.extensionLocation
    ],
    portMapping: Options.portMapping
  };
}, "default");
export {
  ConvertContentOptionToDTO_default as default
};
//# sourceMappingURL=ConvertContentOptionToDTO.js.map
