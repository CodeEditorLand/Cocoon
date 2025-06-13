var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Location } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";
import * as URIConverter from "./URI.js";
function FromAPI(LocationInstance) {
  return {
    uri: URIConverter.FromAPI(LocationInstance.uri),
    range: RangeConverter.FromAPI(LocationInstance.range)
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(LocationDTO) {
  return new Location(
    URIConverter.ToAPI(LocationDTO.uri),
    RangeConverter.ToAPI(LocationDTO.range)
  );
}
__name(ToAPI, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Location.js.map
