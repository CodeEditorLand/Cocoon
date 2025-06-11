var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI as VscodeUri } from "../../Type/ExtHostTypes.js";
const fromApi = /* @__PURE__ */ __name((uri) => {
  return uri.toJSON();
}, "fromApi");
const toApi = /* @__PURE__ */ __name((dto) => {
  return VscodeUri.revive(dto);
}, "toApi");
export {
  fromApi,
  toApi
};
//# sourceMappingURL=Uri.js.map
