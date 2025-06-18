var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { Position, Range, Selection } from "vscode";
import APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import CommandService from "../../Service/Command/Service.js";
import DebugService from "../../Service/Debug/Service.js";
import DocumentService from "../../Service/Document/Service.js";
import ExtensionService from "../../Service/Extension/Service.js";
import LanguageFeatureService from "../../Service/LanguageFeature/Service.js";
import LogService from "../../Service/Log/Service.js";
import ProposedAPIService from "../../Service/ProposedAPI/Service.js";
import StatusBarService from "../../Service/StatusBar/Service.js";
import TaskService from "../../Service/Task/Service.js";
import TreeViewService from "../../Service/TreeView/Service.js";
import WebViewPanelService from "../../Service/WebViewPanel/Service.js";
import WindowService from "../../Service/Window/Service.js";
import WorkSpaceService from "../../Service/WorkSpace/Service.js";
import AsExtensionEvent from "./AsExtensionEvent.js";
import CreateCommandNamespace from "./CreateCommandNamespace.js";
import CreateDebugNamespace from "./CreateDebugNamespace.js";
import CreateLanguagesNamespace from "./CreateLanguagesNamespace.js";
import CreateTasksNamespace from "./CreateTasksNamespace.js";
import CreateWindowNamespace from "./CreateWindowNamespace.js";
import CreateWorkSpaceNamespace from "./CreateWorkSpaceNamespace.js";
const CreateExtensionsAPI = /* @__PURE__ */ __name((_extensionService) => ({
  getExtension: /* @__PURE__ */ __name((_extensionId) => void 0, "getExtension"),
  get all() {
    return [];
  },
  get allAcrossExtensionHosts() {
    return [];
  },
  onDidChange: new Emitter().event
}), "CreateExtensionsAPI");
const CreateAPIFactoryEffect = Effect.gen(function* (G) {
  const Log = yield* G(LogService);
  const ProposedAPI = yield* G(ProposedAPIService);
  const APIDeprecation = yield* G(APIDeprecationService);
  const Command = yield* G(CommandService);
  const WorkSpace = yield* G(WorkSpaceService);
  const Document = yield* G(DocumentService);
  const Window = yield* G(WindowService);
  const LanguageFeature = yield* G(LanguageFeatureService);
  const Debug = yield* G(DebugService);
  const Task = yield* G(TaskService);
  const Extension = yield* G(ExtensionService);
  const WebViewPanel = yield* G(WebViewPanelService);
  const TreeView = yield* G(TreeViewService);
  const StatusBar = yield* G(StatusBarService);
  const CreateAPI = /* @__PURE__ */ __name((ExtensionDescription) => {
    const AsEvent = /* @__PURE__ */ __name((event) => AsExtensionEvent(ExtensionDescription.identifier, Log, event), "AsEvent");
    const CommandNamespace = CreateCommandNamespace(
      Command,
      ExtensionDescription
    );
    const WorkSpaceNamespace = CreateWorkSpaceNamespace(
      WorkSpace,
      Document,
      APIDeprecation,
      AsEvent,
      ExtensionDescription
    );
    const WindowNamespace = CreateWindowNamespace(
      Window,
      StatusBar,
      WebViewPanel,
      TreeView,
      AsEvent,
      ExtensionDescription,
      WorkSpace
      // Pass WorkSpace for editor properties
    );
    const LanguagesNamespace = CreateLanguagesNamespace(
      LanguageFeature,
      ExtensionDescription
    );
    const TasksNamespace = CreateTasksNamespace(
      Task,
      AsEvent,
      ExtensionDescription
    );
    const DebugNamespace = CreateDebugNamespace(
      Debug,
      AsEvent,
      ExtensionDescription
    );
    const ExtensionsNamespace = CreateExtensionsAPI(Extension);
    const API = {
      version: "1.85.0",
      commands: CommandNamespace,
      window: WindowNamespace,
      workspace: WorkSpaceNamespace,
      languages: LanguagesNamespace,
      debug: DebugNamespace,
      tasks: TasksNamespace,
      extensions: ExtensionsNamespace,
      Position,
      Range,
      Selection
    };
    if (ProposedAPI.IsEnabled(
      ExtensionDescription.identifier,
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
  }, "CreateAPI");
  return { CreateAPI };
});
var Definition_default = CreateAPIFactoryEffect;
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
