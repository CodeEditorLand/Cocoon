var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Disposable } from "vscode";
const CreateWorkSpaceNamespace = /* @__PURE__ */ __name((WorkSpace, Document, Deprecation, AsEvent, Extension) => {
  const WorkspaceNamespace = {
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
    // The `textDocuments` property correctly belongs to the Document service.
    get textDocuments() {
      return Document.TextDocuments;
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
    // Document events correctly come from the Document service.
    onDidOpenTextDocument: AsEvent(Document.onDidOpenTextDocument),
    onDidCloseTextDocument: AsEvent(Document.onDidCloseTextDocument),
    onDidChangeTextDocument: AsEvent(Document.onDidChangeTextDocument),
    // --- Methods (now return Effects) ---
    getWorkspaceFolder: /* @__PURE__ */ __name((Uri) => {
      return WorkSpace.getWorkspaceFolder(Uri);
    }, "getWorkspaceFolder"),
    openTextDocument: /* @__PURE__ */ __name((UriOrOptions) => WorkSpace.openTextDocument(UriOrOptions), "openTextDocument"),
    findFiles: /* @__PURE__ */ __name((Include, Exclude, MaxResults, Token) => WorkSpace.findFiles(Include, Exclude, MaxResults, Token), "findFiles"),
    getConfiguration: /* @__PURE__ */ __name((Section, Scope) => WorkSpace.getConfiguration(Section, Scope), "getConfiguration"),
    applyEdit: /* @__PURE__ */ __name((Edit) => WorkSpace.applyEdit(Edit), "applyEdit"),
    registerTextDocumentContentProvider: /* @__PURE__ */ __name((_Scheme, _Provider) => {
      return new Disposable(() => {
      });
    }, "registerTextDocumentContentProvider")
  };
  return WorkspaceNamespace;
}, "CreateWorkSpaceNamespace");
var CreateWorkSpaceNamespace_default = CreateWorkSpaceNamespace;
export {
  CreateWorkSpaceNamespace_default as default
};
//# sourceMappingURL=CreateWorkSpaceNamespace.js.map
