var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import URIConverter from "./URI.js";
const FromDTO = /* @__PURE__ */ __name((DTO) => {
  return {
    uri: URIConverter.ToAPI(DTO.uri),
    name: DTO.name,
    index: DTO.index
  };
}, "FromDTO");
var WorkspaceFolder_default = {
  FromDTO
};
export {
  WorkspaceFolder_default as default
};
//# sourceMappingURL=WorkspaceFolder.js.map
