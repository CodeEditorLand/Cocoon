var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function ConvertContentOptionToDTO(Extension, Option) {
  return {
    enableCommandUris: Option.enableCommandUris,
    enableScripts: Option.enableScripts,
    enableForms: Option.enableForms,
    localResourceRoots: Option.localResourceRoots ?? [
      Extension.extensionLocation
    ],
    // Note: Port mappings would be handled here if implemented.
    portMappings: Option.portMapping
  };
}
__name(ConvertContentOptionToDTO, "ConvertContentOptionToDTO");
export {
  ConvertContentOptionToDTO
};
//# sourceMappingURL=ConvertContentOptionToDTO.js.map
