var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Location as VscLocation } from "../../Type/ExtHostTypes.js";
import RangeConverter from "./Range.js";
import URIConverter from "./URI.js";
const FromAPI = /* @__PURE__ */ __name((LocationInstance) => {
  return {
    uri: URIConverter.FromAPI(LocationInstance.uri),
    range: RangeConverter.FromAPI(LocationInstance.range)
  };
}, "FromAPI");
const ToAPI = /* @__PURE__ */ __name((LocationDTO) => {
  return new VscLocation(
    URIConverter.ToAPI(LocationDTO.uri),
    RangeConverter.ToAPI(LocationDTO.range)
  );
}, "ToAPI");
var Location_default = { FromAPI, ToAPI };
export {
  Location_default as default
};
//# sourceMappingURL=Location.js.map
