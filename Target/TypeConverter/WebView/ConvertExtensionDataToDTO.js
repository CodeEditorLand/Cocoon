var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function ConvertExtensionDataToDTO(Extension) {
  return {
    id: Extension.identifier,
    location: Extension.extensionLocation
  };
}
__name(ConvertExtensionDataToDTO, "ConvertExtensionDataToDTO");
export {
  ConvertExtensionDataToDTO
};
//# sourceMappingURL=ConvertExtensionDataToDTO.js.map
