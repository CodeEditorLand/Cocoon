var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { Position, Range, Selection } from "./Platform/VSCode/Type.js";
import { CommandService } from "./Command.js";
import { DebugService } from "./Debug.js";
import { ExtensionService } from "./Extension.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { LoggerService } from "./Logger.js";
import { ProposedAPIService } from "./ProposedAPI.js";
import { StatusBarService } from "./StatusBar.js";
import { TaskService } from "./Task.js";
import { TreeViewService } from "./TreeView.js";
import { WebViewPanelService } from "./WebViewPanel.js";
import { WindowService } from "./Window.js";
import { WorkSpaceService } from "./WorkSpace.js";
const CreateSafeEvent = /* @__PURE__ */ __name((ExtensionId, Logger, ActualEvent) => {
  return (Listener, ThisArgument, Disposables) => {
    const SafeListener = /* @__PURE__ */ __name((Event) => {
      try {
        Listener.call(ThisArgument, Event);
      } catch (error) {
        Effect.runFork(
          Logger.Error(
            `[${ExtensionId.value}] FAILED to handle event:`,
            error
          )
        );
      }
    }, "SafeListener");
    const Handle = ActualEvent(SafeListener, void 0, Disposables);
    return Handle;
  };
}, "CreateSafeEvent");
const CreateCommandNamespace = /* @__PURE__ */ __name((Command, _ExtensionDescription) => {
  return {
    registerCommand: /* @__PURE__ */ __name((Id, Handler, ThisArgument) => Command.registerCommand(true, Id, Handler, ThisArgument), "registerCommand"),
    registerTextEditorCommand: /* @__PURE__ */ __name((Id, Handler, ThisArgument) => (
      // @ts-expect-error
      Command.registerTextEditorCommand(Id, Handler, ThisArgument)
    ), "registerTextEditorCommand"),
    executeCommand: /* @__PURE__ */ __name((Id, ...Argument) => Command.executeCommand(Id, ...Argument), "executeCommand"),
    getCommands: /* @__PURE__ */ __name((FilterInternal) => Command.getCommands(FilterInternal), "getCommands")
  };
}, "CreateCommandNamespace");
const CreateWindowNamespace = /* @__PURE__ */ __name((Window, StatusBar, WebViewPanel, TreeView, AsEvent, Extension, WorkSpace) => {
  const RunEffectAndReturnPromise = /* @__PURE__ */ __name((TheEffect) => Effect.runPromise(Effect.mapError(TheEffect, (e) => e)), "RunEffectAndReturnPromise");
  const WindowNamespace = {
    get state() {
      return Window.state;
    },
    get onDidChangeWindowState() {
      return AsEvent(Window.onDidChangeWindowState);
    },
    get activeTextEditor() {
      return WorkSpace.activeTextEditor;
    },
    get visibleTextEditors() {
      return WorkSpace.visibleTextEditors;
    },
    get onDidChangeActiveTextEditor() {
      return AsEvent(WorkSpace.onDidChangeActiveTextEditor);
    },
    get onDidChangeVisibleTextEditors() {
      return AsEvent(WorkSpace.onDidChangeVisibleTextEditors);
    },
    showTextDocument: /* @__PURE__ */ __name((documentOrUri, columnOrOptions, preserveFocus) => RunEffectAndReturnPromise(
      Window.ShowTextDocument(
        documentOrUri,
        columnOrOptions,
        preserveFocus
      )
    ), "showTextDocument"),
    createStatusBarItem: /* @__PURE__ */ __name((...args) => {
      let id, alignment, priority;
      if (typeof args[0] === "string") {
        [id, alignment, priority] = args;
      } else {
        [alignment, priority] = args;
      }
      return Effect.runSync(
        StatusBar.CreateStatusBarItem(
          Extension,
          id,
          alignment,
          priority
        )
      );
    }, "createStatusBarItem"),
    createTreeView: /* @__PURE__ */ __name((ViewId, Options) => Effect.runSync(
      Effect.orDie(
        TreeView.CreateTreeView(ViewId, Options, Extension)
      )
    ), "createTreeView"),
    createWebviewPanel: /* @__PURE__ */ __name((ViewType, Title, ShowOptions, Options) => Effect.runSync(
      Effect.orDie(
        WebViewPanel.CreateWebviewPanel(
          Extension,
          ViewType,
          Title,
          ShowOptions,
          Options
        )
      )
    ), "createWebviewPanel"),
    registerWebviewPanelSerializer: /* @__PURE__ */ __name((ViewType, Serializer) => Effect.runSync(
      WebViewPanel.RegisterWebviewPanelSerializer(
        Extension,
        ViewType,
        Serializer
      )
    ), "registerWebviewPanelSerializer"),
    // Stubs
    activeTerminal: void 0,
    terminals: [],
    activeColorTheme: { kind: 1 },
    onDidChangeActiveTerminal: new Emitter().event,
    onDidOpenTerminal: new Emitter().event,
    onDidCloseTerminal: new Emitter().event,
    onDidChangeTerminalState: new Emitter().event,
    onDidChangeTextEditorSelection: new Emitter().event,
    onDidChangeTextEditorVisibleRanges: new Emitter().event,
    onDidChangeTextEditorOptions: new Emitter().event,
    onDidChangeTextEditorViewColumn: new Emitter().event
  };
  return WindowNamespace;
}, "CreateWindowNamespace");
class APIFactoryService extends Effect.Service()(
  "Service/APIFactory",
  {
    effect: Effect.gen(function* () {
      const Logger = yield* LoggerService;
      const ProposedAPI = yield* ProposedAPIService;
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
      const CreateExtensionsAPI = /* @__PURE__ */ __name((ExtensionServiceInstance) => ({
        getExtension: /* @__PURE__ */ __name((extensionId) => Option.getOrUndefined(
          Effect.runSync(
            ExtensionServiceInstance.GetExtension(
              extensionId
            )
          )
        ), "getExtension"),
        get all() {
          return Effect.runSync(ExtensionServiceInstance.GetAll());
        },
        onDidChange: new Emitter().event
      }), "CreateExtensionsAPI");
      const CreateAPI = /* @__PURE__ */ __name((ExtensionDescription) => {
        const SafeEvent = /* @__PURE__ */ __name((SourceEvent) => CreateSafeEvent(
          ExtensionDescription.identifier,
          Logger,
          SourceEvent
        ), "SafeEvent");
        const API = {
          version: "1.85.0",
          commands: CreateCommandNamespace(
            Command,
            ExtensionDescription
          ),
          window: CreateWindowNamespace(
            Window,
            StatusBar,
            WebViewPanel,
            TreeView,
            SafeEvent,
            ExtensionDescription,
            WorkSpace
          ),
          workspace: WorkSpace,
          languages: LanguageFeature,
          debug: Debug,
          tasks: Task,
          extensions: CreateExtensionsAPI(Extension),
          Position,
          Range,
          Selection
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
      return { CreateAPI };
    })
  }
) {
  static {
    __name(this, "APIFactoryService");
  }
}
export {
  APIFactoryService
};
//# sourceMappingURL=APIFactory.js.map
