var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const ConvertContentOptionsToDto = /* @__PURE__ */ __name((Extension, Option) => ({
  EnableCommandUri: Option.enableCommandUris,
  EnableScript: Option.enableScripts,
  EnableForm: Option.enableForms,
  LocalResourceRoot: Option.localResourceRoots ?? [
    Extension.extensionLocation
  ]
  // Note: Port mappings would be handled here if implemented.
}), "ConvertContentOptionsToDto");
export {
  ConvertContentOptionsToDto
};
//# sourceMappingURL=ConvertContentOptionsToDto.js.map
