var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Disposable } from "vscode";
const CreateWorkSpaceNamespace = /* @__PURE__ */ __name((WorkSpace, Deprecation, AsEvent, Extension) => {
  const Workspace = {
    // --- Properties ---
    get workspaceFolders() {
      return WorkSpace.workspaceFolders;
    },
    get name() {
      return WorkSpace.name;
    },
    get workspaceFile() {
      return WorkSpace.workspaceFile;
    },
    get isTrusted() {
      return WorkSpace.isTrusted;
    },
    get fs() {
      return WorkSpace.fs;
    },
    get textDocuments() {
      return WorkSpace.textDocuments;
    },
    // --- Deprecated rootPath ---
    get rootPath() {
      Effect.runFork(
        Deprecation.Report(
          Extension.identifier,
          "workspace.rootPath",
          "Use `workspace.workspaceFolders` instead."
        )
      );
      const Folders = WorkSpace.workspaceFolders;
      return Folders && Folders.length > 0 ? Folders[0].uri.fsPath : void 0;
    },
    // --- Events ---
    onDidChangeWorkspaceFolders: AsEvent(
      WorkSpace.onDidChangeWorkspaceFolders
    ),
    onDidOpenTextDocument: AsEvent(WorkSpace.onDidOpenTextDocument),
    onDidCloseTextDocument: AsEvent(WorkSpace.onDidCloseTextDocument),
    onDidChangeTextDocument: AsEvent(WorkSpace.onDidChangeTextDocument),
    // onDidSaveTextDocument, onWillSaveTextDocument, etc. would follow the same pattern
    // --- Methods ---
    getWorkspaceFolder: /* @__PURE__ */ __name((Uri) => {
      return WorkSpace.getWorkspaceFolder(Uri);
    }, "getWorkspaceFolder"),
    openTextDocument: /* @__PURE__ */ __name((UriOrOptions) => {
      return Effect.runPromise(WorkSpace.openTextDocument(UriOrOptions));
    }, "openTextDocument"),
    findFiles: /* @__PURE__ */ __name((Include, Exclude, MaxResults, Token) => {
      return Effect.runPromise(
        WorkSpace.findFiles(Include, Exclude, MaxResults, Token)
      );
    }, "findFiles"),
    getConfiguration: /* @__PURE__ */ __name((Section, Scope) => {
      return WorkSpace.getConfiguration(Section, Scope);
    }, "getConfiguration"),
    applyEdit: /* @__PURE__ */ __name((Edit) => {
      return WorkSpace.applyEdit(Edit);
    }, "applyEdit"),
    registerTextDocumentContentProvider: /* @__PURE__ */ __name((_Scheme, _Provider) => {
      return new Disposable(() => {
      });
    }, "registerTextDocumentContentProvider")
  };
  return Workspace;
}, "CreateWorkSpaceNamespace");
var CreateWorkSpaceNamespace_default = CreateWorkSpaceNamespace;
export {
  CreateWorkSpaceNamespace_default as default
};
//# sourceMappingURL=CreateWorkSpaceNamespace.js.map
