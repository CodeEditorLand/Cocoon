var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// Source/Platform/VSCode/Type.ts
var Type_exports = {};
__export(Type_exports, {
  CancellationToken: () => CancellationToken,
  CancellationTokenSource: () => CancellationTokenSource,
  URI: () => URI
});
__reExport(Type_exports, extHostTypes_star);
import * as extHostTypes_star from "@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
import {
  CancellationToken,
  CancellationTokenSource
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";

// Source/TypeConverter/Main/Range.ts
var FromAPI = /* @__PURE__ */ __name((RangeInstance) => ({
  startLineNumber: RangeInstance.start.line + 1,
  startColumn: RangeInstance.start.character + 1,
  endLineNumber: RangeInstance.end.line + 1,
  endColumn: RangeInstance.end.character + 1
}), "FromAPI");
var ToAPI = /* @__PURE__ */ __name((RangeDTO) => new Type_exports.Range(
  new Type_exports.Position(RangeDTO.startLineNumber - 1, RangeDTO.startColumn - 1),
  new Type_exports.Position(RangeDTO.endLineNumber - 1, RangeDTO.endColumn - 1)
), "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Range.js.map
