var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Range as VscodeRange } from "../../Type/ExtHostTypes.js";
import * as PositionConverter from "./Position.js";
const fromApi = /* @__PURE__ */ __name((range) => ({
  startLineNumber: range.start.line + 1,
  startColumn: range.start.character + 1,
  endLineNumber: range.end.line + 1,
  endColumn: range.end.character + 1
}), "fromApi");
const toApi = /* @__PURE__ */ __name((dto) => new VscodeRange(
  new Position(dto.startLineNumber - 1, dto.startColumn - 1),
  new Position(dto.endLineNumber - 1, dto.endColumn - 1)
), "toApi");
export {
  fromApi,
  toApi
};
//# sourceMappingURL=Range.js.map
