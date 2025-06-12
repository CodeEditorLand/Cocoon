var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { TextEdit as TextEditConverter, Uri as UriConverter } from "./Main.js";
var WorkspaceEdit;
((WorkspaceEdit2) => {
  WorkspaceEdit2.fromApi = /* @__PURE__ */ __name((edit, versionProvider) => {
    const result = { edits: [] };
    for (const [uri, edits] of edit.entries()) {
      if (edits.every((edit2) => edit2 instanceof ExtHostTypes.TextEdit)) {
        result.edits.push({
          _type: 1,
          // Type 'Text'
          resource: UriConverter.fromApi(uri),
          edit: edits.map(TextEditConverter.fromApi),
          versionId: versionProvider?.GetTextDocumentVersion(uri)
        });
      } else {
        for (const edit2 of edits) {
          result.edits.push({
            _type: 2,
            // Type 'File'
            oldUri: edit2.oldUri ? UriConverter.fromApi(edit2.oldUri) : void 0,
            newUri: edit2.newUri ? UriConverter.fromApi(edit2.newUri) : void 0,
            options: edit2.options,
            metadata: edit2.metadata
          });
        }
      }
    }
    return result;
  }, "fromApi");
  WorkspaceEdit2.toApi = /* @__PURE__ */ __name((dto) => {
    const result = new ExtHostTypes.WorkspaceEdit();
    for (const edit of dto.edits) {
      switch (edit._type) {
        case 1:
          const uri = UriConverter.toApi(edit.resource);
          const textEdits = edit.edit.map(TextEditConverter.toApi);
          result.set(uri, textEdits);
          break;
        case 2:
          const fileEdit = edit;
          if (fileEdit.oldUri && fileEdit.newUri) {
            result.renameFile(
              UriConverter.toApi(fileEdit.oldUri),
              UriConverter.toApi(fileEdit.newUri),
              fileEdit.options
            );
          } else if (fileEdit.newUri) {
            result.createFile(
              UriConverter.toApi(fileEdit.newUri),
              fileEdit.options
            );
          } else if (fileEdit.oldUri) {
            result.deleteFile(
              UriConverter.toApi(fileEdit.oldUri),
              fileEdit.options
            );
          }
          break;
      }
    }
    return result;
  }, "toApi");
})(WorkspaceEdit || (WorkspaceEdit = {}));
export {
  WorkspaceEdit
};
//# sourceMappingURL=WorkspaceEdit.js.map
