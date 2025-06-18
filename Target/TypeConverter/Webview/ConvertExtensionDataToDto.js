var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var ConvertExtensionDataToDTO_default = /* @__PURE__ */ __name((ExtensionDescription, resource) => {
  return {
    id: ExtensionDescription.identifier,
    location: resource ?? ExtensionDescription.extensionLocation
  };
}, "default");
export {
  ConvertExtensionDataToDTO_default as default
};
//# sourceMappingURL=ConvertExtensionDataToDTO.js.map
