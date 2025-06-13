var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function CreateWorkSpaceNamespace(WorkSpaceService, DeprecationService, AsEvent, Extension) {
  const workspace = {
    // --- Properties ---
    get workspaceFolders() {
      return WorkSpaceService.workspaceFolders;
    },
    get name() {
      return WorkSpaceService.name;
    },
    get workspaceFile() {
      return WorkSpaceService.workspaceFile;
    },
    get isTrusted() {
      return WorkSpaceService.isTrusted;
    },
    get fs() {
      return WorkSpaceService.fs;
    },
    get textDocuments() {
      return WorkSpaceService.textDocuments;
    },
    // --- Deprecated rootPath ---
    get rootPath() {
      Effect.runFork(
        DeprecationService.Report(
          Extension.identifier,
          "workspace.rootPath",
          "Use `workspace.workspaceFolders` instead."
        )
      );
      const folders = WorkSpaceService.workspaceFolders;
      return folders && folders.length > 0 ? folders[0].uri.fsPath : void 0;
    },
    // --- Events ---
    onDidChangeWorkspaceFolders: AsEvent(
      WorkSpaceService.onDidChangeWorkspaceFolders
    ),
    onDidOpenTextDocument: AsEvent(WorkSpaceService.onDidOpenTextDocument),
    onDidCloseTextDocument: AsEvent(
      WorkSpaceService.onDidCloseTextDocument
    ),
    onDidChangeTextDocument: AsEvent(
      WorkSpaceService.onDidChangeTextDocument
    ),
    // onDidSaveTextDocument, onWillSaveTextDocument, etc. would follow the same pattern
    // --- Methods ---
    getWorkspaceFolder: /* @__PURE__ */ __name((uri) => {
      return WorkSpaceService.getWorkspaceFolder(uri);
    }, "getWorkspaceFolder"),
    openTextDocument: /* @__PURE__ */ __name((uriOrOptions) => {
      return Effect.runPromise(
        WorkSpaceService.openTextDocument(uriOrOptions)
      );
    }, "openTextDocument"),
    findFiles: /* @__PURE__ */ __name((include, exclude, maxResults, token) => {
      return Effect.runPromise(
        WorkSpaceService.findFiles(include, exclude, maxResults, token)
      );
    }, "findFiles"),
    getConfiguration: /* @__PURE__ */ __name((section, scope) => {
      return WorkSpaceService.getConfiguration(section, scope);
    }, "getConfiguration"),
    applyEdit: /* @__PURE__ */ __name((edit) => {
      return Promise.resolve(false);
    }, "applyEdit"),
    registerTextDocumentContentProvider: /* @__PURE__ */ __name((scheme, provider) => {
      return new ExtHostTypes.Disposable(() => {
      });
    }, "registerTextDocumentContentProvider")
  };
  return workspace;
}
__name(CreateWorkSpaceNamespace, "CreateWorkSpaceNamespace");
export {
  CreateWorkSpaceNamespace
};
//# sourceMappingURL=CreateWorkSpaceNamespace.js.map
