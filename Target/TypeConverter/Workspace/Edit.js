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

// Source/TypeConverter/Main/Text/Edit.ts
function ToExtHostRange(range) {
  return new Type_exports.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}
__name(ToExtHostRange, "ToExtHostRange");
var FromAPI2 = /* @__PURE__ */ __name((TextEditInstance) => ({
  text: TextEditInstance.newText,
  range: FromAPI(TextEditInstance.range),
  forceMoveMarkers: false
}), "FromAPI");
var ToAPI2 = /* @__PURE__ */ __name((TextEditDTO) => new Type_exports.TextEdit(
  ToExtHostRange(ToAPI(TextEditDTO.range)),
  TextEditDTO.text ?? ""
), "ToAPI");

// Source/TypeConverter/Main/URI.ts
var FromAPI3 = /* @__PURE__ */ __name((TheURI) => TheURI.toJSON(), "FromAPI");
var ToAPI3 = /* @__PURE__ */ __name((DTO) => URI.revive(DTO), "ToAPI");

// Source/TypeConverter/Workspace/Edit.ts
var FromAPI4 = /* @__PURE__ */ __name((Edit, VersionProvider) => {
  const Result = { edits: [] };
  for (const [URI2, URIEditArray] of Edit.entries()) {
    const Resource = FromAPI3(URI2);
    const VersionId = VersionProvider?.GetTextDocumentVersion(URI2);
    for (const SingleEdit of URIEditArray) {
      if (SingleEdit instanceof Type_exports.TextEdit) {
        const textEditDto = {
          _type: "text",
          resource: Resource,
          edit: FromAPI2(SingleEdit)
        };
        if (VersionId !== void 0) {
          textEditDto.versionId = VersionId;
        }
        Result.edits.push(textEditDto);
      } else {
      }
    }
  }
  return Result;
}, "FromAPI");
var ToAPI4 = /* @__PURE__ */ __name((DTO) => {
  const Result = new Type_exports.WorkspaceEdit();
  for (const Edit of DTO.edits) {
    if (Edit._type === "text") {
      const URI2 = ToAPI3(Edit.resource);
      const TextEditArray = [ToAPI2(Edit.edit)];
      Result.set(URI2, TextEditArray);
    } else if (Edit._type === "file") {
      if (Edit.oldResource && Edit.newResource) {
        Result.renameFile(
          ToAPI3(Edit.oldResource),
          ToAPI3(Edit.newResource),
          Edit.options
        );
      } else if (Edit.newResource) {
        Result.createFile(ToAPI3(Edit.newResource), Edit.options);
      } else if (Edit.oldResource) {
        Result.deleteFile(ToAPI3(Edit.oldResource), Edit.options);
      }
    }
  }
  return Result;
}, "ToAPI");
export {
  FromAPI4 as FromAPI,
  ToAPI4 as ToAPI
};
//# sourceMappingURL=Edit.js.map
