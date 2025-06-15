var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const CreateWindowNamespace = /* @__PURE__ */ __name((Window, WorkSpace, StatusBar, WebViewPanel, TreeView, AsEvent, Extension) => {
  return {
    // --- Properties ---
    get state() {
      return Window.state;
    },
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
    onDidChangeActiveTextEditor: AsEvent(
      WorkSpace.onDidChangeActiveTextEditor
    ),
    onDidChangeVisibleTextEditors: AsEvent(
      WorkSpace.onDidChangeVisibleTextEditors
    ),
    // ... other events would be wrapped here ...
    // --- Methods from other services ---
    createStatusBarItem: /* @__PURE__ */ __name((alignmentOrId, priorityOrAlignment, priority) => {
      let id;
      let alignment;
      let prio;
      if (typeof alignmentOrId === "string") {
        id = alignmentOrId;
        alignment = priorityOrAlignment;
        prio = priority;
      } else {
        alignment = alignmentOrId;
        prio = priorityOrAlignment;
      }
      return Effect.runSync(
        StatusBar.CreateStatusBarItem(Extension, id, alignment, prio)
      );
    }, "createStatusBarItem"),
    createTreeView: /* @__PURE__ */ __name((viewId, options) => Effect.runSync(TreeView.CreateTreeView(viewId, options, Extension)), "createTreeView"),
    createWebviewPanel: /* @__PURE__ */ __name((viewType, title, showOptions, options) => Effect.runSync(
      WebViewPanel.CreateWebviewPanel(
        Extension,
        viewType,
        title,
        showOptions,
        options
      )
    ), "createWebviewPanel"),
    registerWebviewPanelSerializer: /* @__PURE__ */ __name((viewType, serializer) => Effect.runSync(
      WebViewPanel.RegisterWebviewPanelSerializer(
        Extension,
        viewType,
        serializer
      )
    ), "registerWebviewPanelSerializer")
    // ... other methods like showQuickPick, showInformationMessage are delegated ...
    // These are typically added to the final object in the APIFactory itself
    // or accessed via the corresponding service.
  };
}, "CreateWindowNamespace");
var CreateWindowNamespace_default = CreateWindowNamespace;
export {
  CreateWindowNamespace_default as default
};
//# sourceMappingURL=CreateWindowNamespace.js.map
