var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const ConvertContentOptionToDTO = /* @__PURE__ */ __name((ExtensionDescription, Options) => {
  return {
    enableCommandUris: Options.enableCommandUris,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    localResourceRoots: Options.localResourceRoots ?? [
      ExtensionDescription.extensionLocation
    ],
    portMappings: Options.portMapping
  };
}, "ConvertContentOptionToDTO");
var ConvertContentOptionToDTO_default = ConvertContentOptionToDTO;
export {
  ConvertContentOptionToDTO_default as default
};
//# sourceMappingURL=ConvertContentOptionToDTO.js.map
