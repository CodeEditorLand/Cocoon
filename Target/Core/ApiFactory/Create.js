var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostType from "../../Type/ExtHostTypes.js";
import { AsExtensionEvent } from "./AsExtensionEvent.js";
import { CreateCommandsNamespace } from "./CreateCommandsNamespace.js";
import { CreateLanguagesNamespace } from "./CreateLanguagesNamespace.js";
import { CreateWindowNamespace } from "./CreateWindowNamespace.js";
import { CreateWorkspaceNamespace } from "./CreateWorkspaceNamespace.js";
const CreateApiFactory = /* @__PURE__ */ __name((LogService, DeprecationService, CommandsService, WorkspaceService, WindowService, LanguageFeaturesService, StatusBarService, WebviewPanelService, CustomEditorService, TreeViewService) => ({
  /**
   * Creates a new, sandboxed `vscode` API object for a specific extension.
   * @param Extension The full description of the extension.
   * @returns A frozen `vscode` API object.
   */
  Create: /* @__PURE__ */ __name((Extension) => {
    const CommandsNamespace = CreateCommandsNamespace(
      CommandsService,
      Extension
    );
    const WorkspaceNamespace = CreateWorkspaceNamespace(
      WorkspaceService,
      DeprecationService,
      Extension
    );
    const WindowNamespace = CreateWindowNamespace(
      WindowService,
      WorkspaceService,
      StatusBarService,
      WebviewPanelService,
      CustomEditorService,
      TreeViewService,
      (Event) => AsExtensionEvent(Extension.identifier, LogService, Event),
      Extension
    );
    const LanguagesNamespace = CreateLanguagesNamespace(
      LanguageFeaturesService,
      Extension
    );
    const Api = {
      // This version should come from a centralized product service.
      version: "1.85.0",
      commands: CommandsNamespace,
      window: WindowNamespace,
      workspace: WorkspaceNamespace,
      languages: LanguagesNamespace,
      // Other namespaces would be added here.
      // debug: DebugNamespace,
      // tasks: TasksNamespace,
      // --- Static Types and Enums from VS Code ---
      ...ExtHostType
    };
    Object.freeze(Api.commands);
    Object.freeze(Api.window);
    Object.freeze(Api.workspace);
    Object.freeze(Api.languages);
    return Object.freeze(Api);
  }, "Create")
}), "CreateApiFactory");
export {
  CreateApiFactory
};
//# sourceMappingURL=Create.js.map
