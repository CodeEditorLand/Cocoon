var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  Position,
  Range,
  Location as VscLocation
} from "../../Type/ExtHostTypes.js";
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
    new Range(
      new Position(
        LocationDTO.range.startLineNumber - 1,
        LocationDTO.range.startColumn - 1
      ),
      new Position(
        LocationDTO.range.endLineNumber - 1,
        LocationDTO.range.endColumn - 1
      )
    )
  );
}, "ToAPI");
var Location_default = { FromAPI, ToAPI };
export {
  Location_default as default
};
//# sourceMappingURL=Location.js.map
