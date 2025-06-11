var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Position as VscodePosition } from "../../Type/ExtHostTypes.js";
const fromApi = /* @__PURE__ */ __name((pos) => ({
  lineNumber: pos.line + 1,
  column: pos.character + 1
}), "fromApi");
const toApi = /* @__PURE__ */ __name((dto) => new VscodePosition(dto.lineNumber - 1, dto.column - 1), "toApi");
export {
  fromApi,
  toApi
};
//# sourceMappingURL=Position.js.map
