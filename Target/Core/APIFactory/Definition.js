var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import CommandService from "../../Service/Command/Service.js";
import DebugService from "../../Service/Debug/Service.js";
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
import * as ExtHostTypes from "../../Type/ExtHostTypes.js";
import AsExtensionEvent from "./AsExtensionEvent.js";
import CreateCommandNamespace from "./CreateCommandNamespace.js";
import CreateDebugNamespace from "./CreateDebugNamespace.js";
import CreateLanguagesNamespace from "./CreateLanguagesNamespace.js";
import CreateTasksNamespace from "./CreateTasksNamespace.js";
import CreateWindowNamespace from "./CreateWindowNamespace.js";
import CreateWorkSpaceNamespace from "./CreateWorkSpaceNamespace.js";
var Definition_default = Effect.gen(function* () {
  const Log = yield* LogService;
  const ProposedAPI = yield* ProposedAPIService;
  const APIDeprecation = yield* APIDeprecationService;
  const Command = yield* CommandService;
  const WorkSpace = yield* WorkSpaceService;
  const Window = yield* WindowService;
  const LanguageFeature = yield* LanguageFeatureService;
  const Debug = yield* DebugService;
  const Task = yield* TaskService;
  const Extension = yield* ExtensionService;
  const WebViewPanel = yield* WebViewPanelService;
  const TreeView = yield* TreeViewService;
  const StatusBar = yield* StatusBarService;
  const CreateAPI = /* @__PURE__ */ __name((ExtensionDescription) => {
    const AsEvent = /* @__PURE__ */ __name((Event) => AsExtensionEvent(ExtensionDescription.identifier, Log, Event), "AsEvent");
    const CommandNamespace = CreateCommandNamespace(
      Command,
      ExtensionDescription
    );
    const WorkSpaceNamespace = CreateWorkSpaceNamespace(
      WorkSpace,
      APIDeprecation,
      AsEvent,
      ExtensionDescription
    );
    const WindowNamespace = CreateWindowNamespace(
      Window,
      WorkSpace,
      StatusBar,
      WebViewPanel,
      TreeView,
      AsEvent,
      ExtensionDescription
    );
    const LanguagesNamespace = CreateLanguagesNamespace(
      LanguageFeature,
      ExtensionDescription
    );
    const DebugNamespace = CreateDebugNamespace(
      Debug,
      AsEvent,
      ExtensionDescription
    );
    const TasksNamespace = CreateTasksNamespace(
      Task,
      AsEvent,
      ExtensionDescription
    );
    const API = {
      version: "1.85.0",
      commands: CommandNamespace,
      window: WindowNamespace,
      workspace: WorkSpaceNamespace,
      languages: LanguagesNamespace,
      debug: DebugNamespace,
      tasks: TasksNamespace,
      extensions: Extension,
      ...ExtHostTypes
    };
    if (ProposedAPI.IsEnabled(
      ExtensionDescription.identifier,
      "someProposedApi"
    )) {
    }
    for (const Key in API) {
      if (Object.prototype.hasOwnProperty.call(API, Key)) {
        const Property = API[Key];
        if (typeof Property === "object" && Property !== null) {
          Object.freeze(Property);
        }
      }
    }
    return Object.freeze(API);
  }, "CreateAPI");
  const APIFactoryImplementation = {
    CreateAPI
  };
  return APIFactoryImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
