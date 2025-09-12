var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI } from "../../Platform/VSCode/Type.js";
const FromAPI = /* @__PURE__ */ __name((TheURI) => TheURI.toJSON(), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((DTO) => URI.revive(DTO), "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=URI.js.map
