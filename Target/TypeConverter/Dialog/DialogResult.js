var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI } from "../../Platform/VSCode/Type.js";
const ToURI = /* @__PURE__ */ __name((DTO) => {
  if (!DTO) {
    return void 0;
  }
  return URI.revive(DTO);
}, "ToURI");
const ToURIArray = /* @__PURE__ */ __name((DTOs) => {
  if (!DTOs || !Array.isArray(DTOs)) {
    return void 0;
  }
  return DTOs.map(ToURI).filter((URIValue) => !!URIValue);
}, "ToURIArray");
export {
  ToURI,
  ToURIArray
};
//# sourceMappingURL=DialogResult.js.map
