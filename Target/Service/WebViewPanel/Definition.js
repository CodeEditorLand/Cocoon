var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import {
  Disposable
} from "vscode";
import { WebView as TypeConverter } from "../../TypeConverter.js";
import IPCService from "../IPC/Service.js";
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const ActivePanels = yield* Ref.make(
    /* @__PURE__ */ new Map()
  );
  IPC.RegisterInvokeHandler(
    "$onDidDisposeWebview",
    ([Handle]) => Effect.gen(function* () {
      const Panel = (yield* Ref.get(ActivePanels)).get(Handle);
      if (Panel) {
        Panel.dispose();
      }
    }).pipe(Effect.runPromise)
  );
  IPC.RegisterInvokeHandler(
    "$onDidReceiveMessage",
    ([Handle, Message]) => Effect.gen(function* () {
      const Panel = (yield* Ref.get(ActivePanels)).get(Handle);
      if (Panel) {
        Panel.webview.fireDidReceiveMessage(Message);
      }
    }).pipe(Effect.runPromise)
  );
  IPC.RegisterInvokeHandler(
    "$onDidChangeWebviewPanelViewState",
    ([Handle, NewState]) => Effect.gen(function* () {
      const Panel = (yield* Ref.get(ActivePanels)).get(Handle);
      if (Panel) {
        Panel._updateViewState(NewState);
      }
    }).pipe(Effect.runPromise)
  );
  IPC.RegisterInvokeHandler(
    "$deserializeWebviewPanel",
    ([_Handle, _ViewType, _Title, _State, _Options, _ContentOptions]) => Effect.succeed(void 0).pipe(Effect.runPromise)
    // Stubbed
  );
  const WebViewPanelImplementationFactory = {
    CreateWebviewPanel: /* @__PURE__ */ __name((Extension, ViewType, Title, ShowOptions, Options = {}) => Effect.gen(function* () {
      const Handle = generateUuid();
      const ViewColumnValue = typeof ShowOptions === "object" ? ShowOptions.viewColumn : ShowOptions;
      const PreserveFocus = typeof ShowOptions === "object" ? !!ShowOptions.preserveFocus : false;
      const ShowOptionsDTO = TypeConverter.ConvertShowOptionToDTO(
        ViewColumnValue,
        PreserveFocus
      );
      const PanelOptionsDTO = TypeConverter.ConvertPanelOptionToDTO(Options);
      const ContentOptionsDTO = TypeConverter.ConvertContentOptionToDTO(Extension, Options);
      yield* IPC.SendRequest("$createWebviewPanel", [
        Handle,
        ViewType,
        Title,
        ShowOptionsDTO,
        PanelOptionsDTO,
        ContentOptionsDTO
      ]);
      const OnDispose = /* @__PURE__ */ __name(() => {
        Effect.runFork(
          Ref.update(
            ActivePanels,
            (Map2) => (Map2.delete(Handle), Map2)
          )
        );
      }, "OnDispose");
      const Panel = new WebViewPanelImplementation(
        Handle,
        IPC,
        Extension,
        OnDispose,
        ViewType,
        Title,
        Options,
        ViewColumnValue
      );
      yield* Ref.update(
        ActivePanels,
        (Map2) => Map2.set(Handle, Panel)
      );
      return Panel;
    }), "CreateWebviewPanel"),
    RegisterWebviewPanelSerializer: /* @__PURE__ */ __name((_Extension, ViewType, _Serializer) => Effect.sync(() => {
      IPC.SendNotification("$registerWebviewPanelSerializer", [
        ViewType,
        {}
      ]);
      return new Disposable(() => {
        IPC.SendNotification("$unregisterWebviewPanelSerializer", [
          ViewType
        ]);
      });
    }), "RegisterWebviewPanelSerializer")
  };
  return WebViewPanelImplementationFactory;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
