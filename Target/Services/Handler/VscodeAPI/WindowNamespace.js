var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/WindowNamespace.ts
var CreateWindowNamespace = /* @__PURE__ */ __name((Context) => ({
  showInformationMessage: /* @__PURE__ */ __name(async (Message, ...Items) => {
    Context.SendToMountain("window.showMessage", { message: Message, level: "info", items: Items }).catch(() => {
    });
    return void 0;
  }, "showInformationMessage"),
  showErrorMessage: /* @__PURE__ */ __name(async (Message, ...Items) => {
    Context.SendToMountain("window.showMessage", { message: Message, level: "error", items: Items }).catch(() => {
    });
    return void 0;
  }, "showErrorMessage"),
  showWarningMessage: /* @__PURE__ */ __name(async (Message, ...Items) => {
    Context.SendToMountain("window.showMessage", { message: Message, level: "warn", items: Items }).catch(() => {
    });
    return void 0;
  }, "showWarningMessage"),
  createTerminal: /* @__PURE__ */ __name(() => ({ sendText: /* @__PURE__ */ __name(async () => {
  }, "sendText"), show: /* @__PURE__ */ __name(() => {
  }, "show"), hide: /* @__PURE__ */ __name(() => {
  }, "hide"), dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "createTerminal"),
  createStatusBarItem: /* @__PURE__ */ __name(() => ({ show: /* @__PURE__ */ __name(() => {
  }, "show"), hide: /* @__PURE__ */ __name(() => {
  }, "hide"), dispose: /* @__PURE__ */ __name(() => {
  }, "dispose"), text: "", tooltip: "" }), "createStatusBarItem"),
  createOutputChannel: /* @__PURE__ */ __name(() => ({ append: /* @__PURE__ */ __name(() => {
  }, "append"), appendLine: /* @__PURE__ */ __name(() => {
  }, "appendLine"), clear: /* @__PURE__ */ __name(() => {
  }, "clear"), show: /* @__PURE__ */ __name(() => {
  }, "show"), hide: /* @__PURE__ */ __name(() => {
  }, "hide"), dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "createOutputChannel"),
  withProgress: /* @__PURE__ */ __name(async (_Option, Task) => Task({ report: /* @__PURE__ */ __name(() => {
  }, "report") }), "withProgress"),
  onDidChangeActiveTextEditor: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeActiveTextEditor"),
  onDidChangeVisibleTextEditors: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeVisibleTextEditors"),
  onDidChangeTextEditorSelection: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeTextEditorSelection"),
  onDidChangeTextEditorVisibleRanges: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "onDidChangeTextEditorVisibleRanges"),
  activeTextEditor: void 0,
  visibleTextEditors: []
}), "CreateWindowNamespace");
var WindowNamespace_default = CreateWindowNamespace;
export {
  WindowNamespace_default as default
};
//# sourceMappingURL=WindowNamespace.js.map
