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

// Source/TypeConverter/Main/Markdown/String.ts
var FromAPI = /* @__PURE__ */ __name((MarkdownStringInstance) => ({
  value: MarkdownStringInstance.value,
  // FIX: Handle exactOptionalPropertyTypes
  ...MarkdownStringInstance.isTrusted && {
    isTrusted: MarkdownStringInstance.isTrusted
  },
  ...MarkdownStringInstance.baseUri && {
    baseUri: MarkdownStringInstance.baseUri
  },
  ...MarkdownStringInstance.supportHtml && {
    supportHtml: MarkdownStringInstance.supportHtml
  }
}), "FromAPI");
var ToAPI = /* @__PURE__ */ __name((MarkdownStringDTO) => {
  const result = new Type_exports.MarkdownString(
    MarkdownStringDTO.value,
    typeof MarkdownStringDTO.isTrusted === "boolean" ? MarkdownStringDTO.isTrusted : !!MarkdownStringDTO.isTrusted
  );
  if (MarkdownStringDTO.baseUri) {
    result.baseUri = MarkdownStringDTO.baseUri;
  }
  if (MarkdownStringDTO.supportHtml) {
    result.supportHtml = MarkdownStringDTO.supportHtml;
  }
  return result;
}, "ToAPI");

// Source/TypeConverter/Status/Bar.ts
var FromAPI2 = /* @__PURE__ */ __name((From, EntryId, _ExtensionId, CommandConverter) => {
  return {
    id: EntryId,
    name: From.name,
    text: From.text,
    tooltip: typeof From.tooltip === "string" ? From.tooltip : From.tooltip instanceof Type_exports.MarkdownString ? FromAPI(From.tooltip) : void 0,
    command: From.command ? CommandConverter.ToInternal(From.command, []) : void 0,
    priority: From.priority,
    alignment: From.alignment === 1 ? 0 : 1,
    backgroundColor: From.backgroundColor instanceof Type_exports.ThemeColor ? From.backgroundColor.id : void 0,
    color: typeof From.color === "string" ? From.color : From.color instanceof Type_exports.ThemeColor ? From.color.id : void 0,
    accessibilityInformation: From.accessibilityInformation
  };
}, "FromAPI");
export {
  FromAPI2 as FromAPI
};
//# sourceMappingURL=Bar.js.map
