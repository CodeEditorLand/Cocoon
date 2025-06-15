var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { TextEdit as TextEditConverter, URI as URIConverter } from "./Main.js";
const FromAPI = /* @__PURE__ */ __name((Edit, VersionProvider) => {
  const Result = { edits: [] };
  for (const [URI, URIEditArray] of Edit.entries()) {
    if (URIEditArray.length > 0 && URIEditArray[0] instanceof ExtHostTypes.TextEdit) {
      const Resource = URIConverter.FromAPI(URI);
      const VersionId = VersionProvider?.GetTextDocumentVersion(URI);
      for (const SingleEdit of URIEditArray) {
        Result.edits.push({
          resource: Resource,
          textEdit: TextEditConverter.FromAPI(SingleEdit),
          versionId: VersionId
        });
      }
    } else {
      for (const FileEdit of URIEditArray) {
        Result.edits.push({
          oldResource: FileEdit.oldUri ? URIConverter.FromAPI(FileEdit.oldUri) : void 0,
          newResource: FileEdit.newUri ? URIConverter.FromAPI(FileEdit.newUri) : void 0,
          options: FileEdit.options,
          metadata: FileEdit.metadata
        });
      }
    }
  }
  return Result;
}, "FromAPI");
const ToAPI = /* @__PURE__ */ __name((DTO) => {
  const Result = new ExtHostTypes.WorkspaceEdit();
  for (const Edit of DTO.edits) {
    if ("textEdit" in Edit) {
      const WorkspaceTextEdit = Edit;
      const URI = URIConverter.ToAPI(WorkspaceTextEdit.resource);
      const TextEditArray = [
        TextEditConverter.ToAPI(WorkspaceTextEdit.textEdit)
      ];
      Result.set(URI, TextEditArray);
    } else {
      const FileEdit = Edit;
      if (FileEdit.oldResource && FileEdit.newResource) {
        Result.renameFile(
          URIConverter.ToAPI(FileEdit.oldResource),
          URIConverter.ToAPI(FileEdit.newResource),
          FileEdit.options
        );
      } else if (FileEdit.newResource) {
        Result.createFile(
          URIConverter.ToAPI(FileEdit.newResource),
          FileEdit.options
        );
      } else if (FileEdit.oldResource) {
        Result.deleteFile(
          URIConverter.ToAPI(FileEdit.oldResource),
          FileEdit.options
        );
      }
    }
  }
  return Result;
}, "ToAPI");
var WorkSpaceEdit_default = { FromAPI, ToAPI };
export {
  WorkSpaceEdit_default as default
};
//# sourceMappingURL=WorkSpaceEdit.js.map
