var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostType from "../../Type/ExtHostTypes.js";
import AsExtensionEvent from "./AsExtensionEvent.js";
import CreateCommandNamespace from "./CreateCommandNamespace.js";
import CreateDebugNamespace from "./CreateDebugNamespace.js";
import CreateLanguagesNamespace from "./CreateLanguagesNamespace.js";
import CreateTasksNamespace from "./CreateTasksNamespace.js";
import CreateWindowNamespace from "./CreateWindowNamespace.js";
import CreateWorkSpaceNamespace from "./CreateWorkSpaceNamespace.js";
const CreateAPIFactory = /* @__PURE__ */ __name((Services) => {
  return {
    CreateAPI: /* @__PURE__ */ __name((Extension) => {
      const {
        Log,
        APIDeprecation,
        Command,
        WorkSpace,
        Window,
        LanguageFeature,
        Debug,
        Task,
        Extension: ExtensionService,
        WebViewPanel,
        TreeView,
        StatusBar,
        ProposedAPI
      } = Services;
      const AsEvent = /* @__PURE__ */ __name((event) => AsExtensionEvent(Extension.identifier, Log, event), "AsEvent");
      const CommandNamespace = CreateCommandNamespace(Command, Extension);
      const WorkSpaceNamespace = CreateWorkSpaceNamespace(
        WorkSpace,
        APIDeprecation,
        AsEvent,
        Extension
      );
      const WindowNamespace = CreateWindowNamespace(
        Window,
        WorkSpace,
        StatusBar,
        WebViewPanel,
        TreeView,
        AsEvent,
        Extension
      );
      const LanguagesNamespace = CreateLanguagesNamespace(
        LanguageFeature,
        Extension
      );
      const DebugNamespace = CreateDebugNamespace(
        Debug,
        AsEvent,
        Extension
      );
      const TasksNamespace = CreateTasksNamespace(
        Task,
        AsEvent,
        Extension
      );
      const API = {
        version: "1.85.0",
        commands: CommandNamespace,
        window: WindowNamespace,
        workspace: WorkSpaceNamespace,
        languages: LanguagesNamespace,
        debug: DebugNamespace,
        tasks: TasksNamespace,
        extensions: ExtensionService,
        ...ExtHostType
      };
      if (ProposedAPI.IsEnabled(Extension.identifier, "someProposedApi")) {
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
}, "CreateAPIFactory");
var Create_default = CreateAPIFactory;
export {
  Create_default as default
};
//# sourceMappingURL=Create.js.map
