var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace.ts
var CreateWorkspaceNamespace = /* @__PURE__ */ __name((Context) => ({
  workspaceFolders: [],
  getConfiguration: /* @__PURE__ */ __name(() => ({
    get: /* @__PURE__ */ __name((_Key, DefaultValue) => DefaultValue, "get"),
    update: /* @__PURE__ */ __name(async () => {
    }, "update"),
    has: /* @__PURE__ */ __name(() => false, "has"),
    inspect: /* @__PURE__ */ __name(() => void 0, "inspect")
  }), "getConfiguration"),
  findFiles: /* @__PURE__ */ __name(async () => [], "findFiles"),
  openTextDocument: /* @__PURE__ */ __name(async (Uri) => ({
    getText: /* @__PURE__ */ __name(() => "", "getText"),
    uri: Uri,
    languageId: "plaintext",
    lineCount: 0,
    fileName: ""
  }), "openTextDocument"),
  onDidOpenTextDocument: /* @__PURE__ */ __name((Listener) => {
    Context.WorkspaceEventEmitter.on("didOpenTextDocument", Listener);
    return { dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener("didOpenTextDocument", Listener);
    }, "dispose") };
  }, "onDidOpenTextDocument"),
  onDidCloseTextDocument: /* @__PURE__ */ __name((Listener) => {
    Context.WorkspaceEventEmitter.on("didCloseTextDocument", Listener);
    return { dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener("didCloseTextDocument", Listener);
    }, "dispose") };
  }, "onDidCloseTextDocument"),
  onDidChangeTextDocument: /* @__PURE__ */ __name((Listener) => {
    Context.WorkspaceEventEmitter.on("didChangeTextDocument", Listener);
    return { dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener("didChangeTextDocument", Listener);
    }, "dispose") };
  }, "onDidChangeTextDocument"),
  onDidSaveTextDocument: /* @__PURE__ */ __name((Listener) => {
    Context.WorkspaceEventEmitter.on("didSaveTextDocument", Listener);
    return { dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener("didSaveTextDocument", Listener);
    }, "dispose") };
  }, "onDidSaveTextDocument"),
  onDidChangeConfiguration: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeConfiguration"),
  onDidChangeWorkspaceFolders: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeWorkspaceFolders"),
  fs: {
    stat: /* @__PURE__ */ __name(async () => ({ type: 1, size: 0, ctime: 0, mtime: 0 }), "stat"),
    readFile: /* @__PURE__ */ __name(async () => new Uint8Array(), "readFile"),
    writeFile: /* @__PURE__ */ __name(async () => {
    }, "writeFile"),
    readDirectory: /* @__PURE__ */ __name(async () => [], "readDirectory"),
    createDirectory: /* @__PURE__ */ __name(async () => {
    }, "createDirectory"),
    delete: /* @__PURE__ */ __name(async () => {
    }, "delete"),
    rename: /* @__PURE__ */ __name(async () => {
    }, "rename")
  }
}), "CreateWorkspaceNamespace");
var WorkspaceNamespace_default = CreateWorkspaceNamespace;
export {
  WorkspaceNamespace_default as default
};
//# sourceMappingURL=WorkspaceNamespace.js.map
