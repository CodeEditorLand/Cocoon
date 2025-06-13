var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as TextEditConverter from "./Main/TextEdit.js";
import * as URIConverter from "./Main/URI.js";
var WorkSpaceEdit;
((WorkSpaceEdit2) => {
  function FromAPI(Edit, VersionProvider) {
    const result = { edits: [] };
    for (const [uri, edits] of Edit.entries()) {
      if (edits[0] instanceof ExtHostTypes.TextEdit) {
        result.edits.push({
          resource: URIConverter.FromAPI(uri),
          textEdits: edits.map(
            TextEditConverter.FromAPI
          ),
          versionId: VersionProvider?.GetTextDocumentVersion(uri)
        });
      } else {
        for (const edit of edits) {
          result.edits.push({
            oldResource: edit.oldUri ? URIConverter.FromAPI(edit.oldUri) : void 0,
            newResource: edit.newUri ? URIConverter.FromAPI(edit.newUri) : void 0,
            options: edit.options,
            metadata: edit.metadata
          });
        }
      }
    }
    return result;
  }
  WorkSpaceEdit2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
  function ToAPI(DTO) {
    const result = new ExtHostTypes.WorkSpaceEdit();
    for (const edit of DTO.edits) {
      if ("textEdits" in edit) {
        const uri = URIConverter.ToAPI(edit.resource);
        const textEdits = edit.textEdits.map(TextEditConverter.ToAPI);
        result.set(uri, textEdits);
      } else {
        const fileEdit = edit;
        if (fileEdit.oldResource && fileEdit.newResource) {
          result.renameFile(
            URIConverter.ToAPI(fileEdit.oldResource),
            URIConverter.ToAPI(fileEdit.newResource),
            fileEdit.options
          );
        } else if (fileEdit.newResource) {
          result.createFile(
            URIConverter.ToAPI(fileEdit.newResource),
            fileEdit.options
          );
        } else if (fileEdit.oldResource) {
          result.deleteFile(
            URIConverter.ToAPI(fileEdit.oldResource),
            fileEdit.options
          );
        }
      }
    }
    return result;
  }
  WorkSpaceEdit2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(WorkSpaceEdit || (WorkSpaceEdit = {}));
export {
  WorkSpaceEdit
};
//# sourceMappingURL=WorkSpaceEdit.js.map
