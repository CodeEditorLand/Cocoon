var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function CreateWindowNamespace(WindowService, WorkSpaceService, StatusBarService, WebViewPanelService, CustomEditorService, TreeViewService, AsEvent, Extension) {
  return {
    // --- Properties ---
    get state() {
      return WindowService.state;
    },
    get activeTextEditor() {
      return WorkSpaceService.activeTextEditor;
    },
    get visibleTextEditors() {
      return WorkSpaceService.visibleTextEditors;
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
    onDidChangeWindowState: AsEvent(WindowService.onDidChangeWindowState),
    onDidChangeActiveTextEditor: AsEvent(
      WorkSpaceService.onDidChangeActiveTextEditor
    ),
    onDidChangeVisibleTextEditors: AsEvent(
      WorkSpaceService.onDidChangeVisibleTextEditors
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
        StatusBarService.CreateStatusBarItem(
          Extension,
          id,
          alignment,
          prio
        )
      );
    }, "createStatusBarItem"),
    createTreeView: /* @__PURE__ */ __name((viewId, options) => Effect.runSync(
      TreeViewService.CreateTreeView(viewId, options, Extension)
    ), "createTreeView"),
    createWebviewPanel: /* @__PURE__ */ __name((viewType, title, showOptions, options) => Effect.runSync(
      WebViewPanelService.CreateWebViewPanel(
        Extension,
        viewType,
        title,
        showOptions,
        options
      )
    ), "createWebviewPanel"),
    registerWebviewPanelSerializer: /* @__PURE__ */ __name((viewType, serializer) => Effect.runSync(
      WebViewPanelService.RegisterWebviewPanelSerializer(
        Extension,
        viewType,
        serializer
      )
    ), "registerWebviewPanelSerializer")
    // ... other methods like showQuickPick, showInformationMessage are delegated ...
    // These are typically added to the final object in the APIFactory itself
    // or accessed via the corresponding service.
  };
}
__name(CreateWindowNamespace, "CreateWindowNamespace");
export {
  CreateWindowNamespace
};
//# sourceMappingURL=CreateWindowNamespace.js.map
