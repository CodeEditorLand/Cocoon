var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostType from "../../Type/ExtHostTypes.js";
import { AsExtensionEvent } from "./AsExtensionEvent.js";
import { CreateCommandNamespace } from "./CreateCommandNamespace.js";
import { CreateDebugNamespace } from "./CreateDebugNamespace.js";
import { CreateLanguagesNamespace } from "./CreateLanguagesNamespace.js";
import { CreateTasksNamespace } from "./CreateTasksNamespace.js";
import { CreateWindowNamespace } from "./CreateWindowNamespace.js";
import { CreateWorkSpaceNamespace } from "./CreateWorkSpaceNamespace.js";
function CreateAPIFactory(LogService, ProposedAPIService, DeprecationService, CommandService, WorkSpaceService, WindowService, LanguageFeatureService, DebugService, TaskService, ExtensionService, WebViewPanelService, CustomEditorService, TreeViewService, StatusBarService) {
  return {
    /**
     * Creates a new, sandboxed `vscode` API object for a specific extension.
     * @param Extension The full description of the extension.
     * @returns A frozen `vscode` API object.
     */
    CreateAPI: /* @__PURE__ */ __name((Extension) => {
      const CommandNamespace = CreateCommandNamespace(
        CommandService,
        Extension
      );
      const WorkSpaceNamespace = CreateWorkSpaceNamespace(
        WorkSpaceService,
        DeprecationService,
        Extension
      );
      const WindowNamespace = CreateWindowNamespace(
        WindowService,
        WorkSpaceService,
        StatusBarService,
        WebViewPanelService,
        CustomEditorService,
        TreeViewService,
        (Event) => AsExtensionEvent(Extension.identifier, LogService, Event),
        Extension
      );
      const LanguagesNamespace = CreateLanguagesNamespace(
        LanguageFeatureService,
        Extension
      );
      const DebugNamespace = CreateDebugNamespace(
        DebugService,
        Extension
      );
      const TasksNamespace = CreateTasksNamespace(TaskService, Extension);
      const API = {
        // This version should come from a centralized product service.
        version: "1.85.0",
        commands: CommandNamespace,
        window: WindowNamespace,
        workspace: WorkSpaceNamespace,
        languages: LanguagesNamespace,
        debug: DebugNamespace,
        tasks: TasksNamespace,
        // Other namespaces would be added here.
        extensions: ExtensionService,
        // The extensions API is often top-level
        // --- Static Types and Enums from VS Code ---
        ...ExtHostType
      };
      if (ProposedAPIService.IsEnabled(
        Extension.identifier,
        "someProposedApi"
      )) {
      }
      for (const key in API) {
        if (Object.prototype.hasOwnProperty.call(API, key)) {
          const prop = API[key];
          if (typeof prop === "object" && prop !== null) {
            Object.freeze(prop);
          }
        }
      }
      return Object.freeze(API);
    }, "CreateAPI")
  };
}
__name(CreateAPIFactory, "CreateAPIFactory");
export {
  CreateAPIFactory
};
//# sourceMappingURL=Create.js.map
