var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import { Disposable } from "vscode";
import ConvertContentOptionToDTO from "../../TypeConverter/WebView/ConvertContentOptionToDTO.js";
import ConvertPanelOptionToDTO from "../../TypeConverter/WebView/ConvertPanelOptionToDTO.js";
import ConvertShowOptionToDTO from "../../TypeConverter/WebView/ConvertShowOptionToDTO.js";
import IPCService from "../IPC/Service.js";
import WebViewPanelImplementation from "./WebViewPanelImplementation.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const ActivePanelsRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const OnDidDisposeWebviewEffect = /* @__PURE__ */ __name((Handle) => Effect.gen(function* (G2) {
    const Panel = (yield* G2(Ref.get(ActivePanelsRef))).get(Handle);
    if (Panel) {
      Panel.dispose();
    }
  }), "OnDidDisposeWebviewEffect");
  const OnDidReceiveMessageEffect = /* @__PURE__ */ __name((Handle, Message) => Effect.gen(function* (G2) {
    const Panel = (yield* G2(Ref.get(ActivePanelsRef))).get(Handle);
    Panel?.fireDidReceiveMessage(Message);
  }), "OnDidReceiveMessageEffect");
  const OnDidChangeViewStateEffect = /* @__PURE__ */ __name((Handle, NewState) => Effect.gen(function* (G2) {
    const Panel = (yield* G2(Ref.get(ActivePanelsRef))).get(Handle);
    Panel?.updateViewState(NewState);
  }), "OnDidChangeViewStateEffect");
  yield* G(
    Effect.sync(() => {
      IPC.RegisterInvokeHandler(
        "$onDidDisposeWebview",
        ([Handle]) => Effect.runPromise(OnDidDisposeWebviewEffect(Handle))
      );
      IPC.RegisterInvokeHandler(
        "$onDidReceiveMessage",
        ([Handle, Message]) => Effect.runPromise(
          OnDidReceiveMessageEffect(Handle, Message)
        )
      );
      IPC.RegisterInvokeHandler(
        "$onDidChangeWebviewPanelViewState",
        ([Handle, NewState]) => Effect.runPromise(
          OnDidChangeViewStateEffect(Handle, NewState)
        )
      );
      IPC.RegisterInvokeHandler(
        "$deserializeWebviewPanel",
        () => Effect.runPromise(Effect.succeed(void 0))
        // Stubbed
      );
    })
  );
  const WebViewPanelFactory = {
    CreateWebviewPanel: /* @__PURE__ */ __name((Extension, ViewType, Title, ShowOptions, Options = {}) => Effect.gen(function* (G2) {
      const Handle = generateUuid();
      const ViewColumnValue = typeof ShowOptions === "object" ? ShowOptions.viewColumn : ShowOptions;
      const PreserveFocus = typeof ShowOptions === "object" ? !!ShowOptions.preserveFocus : false;
      const ShowOptionsDTO = ConvertShowOptionToDTO(
        ViewColumnValue,
        PreserveFocus
      );
      const PanelOptionsDTO = ConvertPanelOptionToDTO(Options);
      const ContentOptionsDTO = ConvertContentOptionToDTO(
        Extension,
        Options
      );
      yield* G2(
        IPC.SendRequest("$createWebviewPanel", [
          Handle,
          ViewType,
          Title,
          ShowOptionsDTO,
          PanelOptionsDTO,
          ContentOptionsDTO
        ])
      );
      const OnDispose = /* @__PURE__ */ __name(() => Effect.runFork(
        Ref.update(
          ActivePanelsRef,
          (Map2) => (Map2.delete(Handle), Map2)
        )
      ), "OnDispose");
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
      yield* G2(
        Ref.update(
          ActivePanelsRef,
          (Map2) => Map2.set(Handle, Panel)
        )
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
  return WebViewPanelFactory;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
