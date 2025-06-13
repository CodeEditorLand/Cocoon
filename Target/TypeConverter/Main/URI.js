var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI as VSCodeURI } from "../../Type/ExtHostTypes.js";
function fromAPI(uri) {
  return uri.toJSON();
}
__name(fromAPI, "fromAPI");
function toAPI(dto) {
  return VSCodeURI.revive(dto);
}
__name(toAPI, "toAPI");
export {
  fromAPI,
  toAPI
};
//# sourceMappingURL=URI.js.map
