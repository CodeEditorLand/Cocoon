var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI as VSCodeURI } from "../../Type/ExtHostTypes.js";
const FromAPI = /* @__PURE__ */ __name((URI) => URI.toJSON(), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((DTO) => VSCodeURI.revive(DTO), "ToAPI");
var URI_default = { FromAPI, ToAPI };
export {
  URI_default as default
};
//# sourceMappingURL=URI.js.map
