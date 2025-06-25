var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ToAPI as UriToAPI } from "./URI.js";
const FromDTO = /* @__PURE__ */ __name((DTO) => {
  return {
    uri: UriToAPI(DTO.uri),
    name: DTO.name,
    index: DTO.index
  };
}, "FromDTO");
export {
  FromDTO
};
//# sourceMappingURL=WorkspaceFolder.js.map
