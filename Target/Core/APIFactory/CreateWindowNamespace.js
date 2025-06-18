var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const CreateWindowNamespace = /* @__PURE__ */ __name((Window, StatusBar, WebViewPanel, TreeView, AsEvent, Extension, WorkSpace) => {
  const WindowNamespace = {
    // --- Properties ---
    get state() {
      return Window.state;
    },
    // Editor state is now managed by WorkSpaceService
    get activeTextEditor() {
      return WorkSpace.activeTextEditor;
    },
    get visibleTextEditors() {
      return WorkSpace.visibleTextEditors;
    },
    get activeTerminal() {
      return void 0;
    },
    get terminals() {
      return [];
    },
    get activeColorTheme() {
      return { kind: 1 };
    },
    // --- Events ---
    onDidChangeWindowState: AsEvent(Window.onDidChangeWindowState),
    // Editor events are now on WorkSpaceService
    onDidChangeActiveTextEditor: AsEvent(
      WorkSpace.onDidChangeActiveTextEditor
    ),
    onDidChangeVisibleTextEditors: AsEvent(
      WorkSpace.onDidChangeVisibleTextEditors
    ),
    // --- Methods from other services (now return Effects) ---
    createStatusBarItem: /* @__PURE__ */ __name((...args) => {
      let id;
      let alignment;
      let prio;
      if (typeof args[0] === "string") {
        id = args[0];
        alignment = args[1];
        prio = args[2];
      } else {
        alignment = args[0];
        prio = args[1];
      }
      return StatusBar.CreateStatusBarItem(
        Extension,
        id,
        alignment,
        prio
      );
    }, "createStatusBarItem"),
    createTreeView: /* @__PURE__ */ __name((viewId, options) => TreeView.CreateTreeView(viewId, options, Extension), "createTreeView"),
    createWebviewPanel: /* @__PURE__ */ __name((viewType, title, showOptions, options) => WebViewPanel.CreateWebviewPanel(
      Extension,
      viewType,
      title,
      showOptions,
      options
    ), "createWebviewPanel"),
    registerWebviewPanelSerializer: /* @__PURE__ */ __name((viewType, serializer) => WebViewPanel.RegisterWebviewPanelSerializer(
      Extension,
      viewType,
      serializer
    ), "registerWebviewPanelSerializer")
  };
  return WindowNamespace;
}, "CreateWindowNamespace");
var CreateWindowNamespace_default = CreateWindowNamespace;
export {
  CreateWindowNamespace_default as default
};
//# sourceMappingURL=CreateWindowNamespace.js.map
