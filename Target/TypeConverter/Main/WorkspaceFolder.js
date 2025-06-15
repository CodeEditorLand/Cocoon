var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import URIConverter from "./URI.js";
const fromDTO = /* @__PURE__ */ __name((DTO) => {
  return {
    uri: URIConverter.ToAPI(DTO.uri),
    name: DTO.name,
    index: DTO.index
  };
}, "fromDTO");
var WorkspaceFolder_default = {
  fromDTO
};
export {
  WorkspaceFolder_default as default
};
//# sourceMappingURL=WorkspaceFolder.js.map
