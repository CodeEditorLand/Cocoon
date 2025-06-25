var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { WorkspaceEdit as VSCodeWorkspaceEdit } from "../Platform/VSCode/Type.js";
import {
  FromAPI as TextEditFromAPI,
  ToAPI as TextEditToAPI
} from "./Main/TextEdit.js";
import { FromAPI as UriFromAPI, ToAPI as UriToAPI } from "./Main/URI.js";
const FromAPI = /* @__PURE__ */ __name((Edit, VersionProvider) => {
  const Result = { edits: [] };
  for (const [URI, URIEditArray] of Edit.entries()) {
    const Resource = UriFromAPI(URI);
    const VersionId = VersionProvider?.GetTextDocumentVersion(URI);
    for (const SingleEdit of URIEditArray) {
      Result.edits.push({
        resource: Resource,
        textEdit: TextEditFromAPI(SingleEdit),
        versionId: VersionId
      });
    }
  }
  return Result;
}, "FromAPI");
const ToAPI = /* @__PURE__ */ __name((DTO) => {
  const Result = new VSCodeWorkspaceEdit();
  for (const Edit of DTO.edits) {
    if ("textEdit" in Edit) {
      const WorkspaceTextEdit = Edit;
      const URI = UriToAPI(WorkspaceTextEdit.resource);
      const TextEditArray = [TextEditToAPI(WorkspaceTextEdit.textEdit)];
      Result.set(URI, TextEditArray);
    } else {
      const FileEdit = Edit;
      if (FileEdit.oldResource && FileEdit.newResource) {
        Result.renameFile(
          UriToAPI(FileEdit.oldResource),
          UriToAPI(FileEdit.newResource),
          FileEdit.options
        );
      } else if (FileEdit.newResource) {
        Result.createFile(
          UriToAPI(FileEdit.newResource),
          FileEdit.options
        );
      } else if (FileEdit.oldResource) {
        Result.deleteFile(
          UriToAPI(FileEdit.oldResource),
          FileEdit.options
        );
      }
    }
  }
  return Result;
}, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=WorkSpaceEdit.js.map
