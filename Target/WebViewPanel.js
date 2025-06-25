var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import {
  Disposable
} from "vscode";
import { ConvertContentOptionToDTO } from "./TypeConverter/WebView/ConvertContentOptionToDTO.js";
import { ConvertPanelOptionToDTO } from "./TypeConverter/WebView/ConvertPanelOptionToDTO.js";
import { ConvertShowOptionToDTO } from "./TypeConverter/WebView/ConvertShowOptionToDTO.js";
import { IPCService } from "./IPC.js";
import { WebViewPanelImplementation } from "./WebViewPanel/WebViewPanelImplementation.js";
class WebViewPanelService extends Effect.Service()(
  "Service/WebViewPanel",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const ActivePanelsRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const OnDidDisposeWebview = /* @__PURE__ */ __name((Handle) => Effect.gen(function* () {
        const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
        if (Panel) Panel.dispose();
      }), "OnDidDisposeWebview");
      const OnDidReceiveMessage = /* @__PURE__ */ __name((Handle, Message) => Effect.gen(function* () {
        const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
        Panel?.fireDidReceiveMessage(Message);
      }), "OnDidReceiveMessage");
      const OnDidChangeViewState = /* @__PURE__ */ __name((Handle, NewState) => Effect.gen(function* () {
        const Panel = (yield* Ref.get(ActivePanelsRef)).get(Handle);
        Panel?.updateViewState(NewState);
      }), "OnDidChangeViewState");
      IPC.RegisterInvokeHandler(
        "$onDidDisposeWebview",
        ([Handle]) => Effect.runPromise(OnDidDisposeWebview(Handle))
      );
      IPC.RegisterInvokeHandler(
        "$onDidReceiveMessage",
        ([Handle, Message]) => Effect.runPromise(OnDidReceiveMessage(Handle, Message))
      );
      IPC.RegisterInvokeHandler(
        "$onDidChangeWebviewPanelViewState",
        ([Handle, NewState]) => Effect.runPromise(OnDidChangeViewState(Handle, NewState))
      );
      IPC.RegisterInvokeHandler(
        "$deserializeWebviewPanel",
        () => Effect.runPromise(Effect.succeed(void 0))
      );
      return {
        CreateWebviewPanel: /* @__PURE__ */ __name((Extension, ViewType, Title, ShowOptions, Options = {}) => Effect.gen(function* () {
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
          yield* IPC.SendRequest("$createWebviewPanel", [
            Handle,
            ViewType,
            Title,
            ShowOptionsDTO,
            PanelOptionsDTO,
            ContentOptionsDTO
          ]);
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
          yield* Ref.update(
            ActivePanelsRef,
            (Map2) => Map2.set(Handle, Panel)
          );
          return Panel;
        }), "CreateWebviewPanel"),
        RegisterWebviewPanelSerializer: /* @__PURE__ */ __name((_Extension, ViewType, _Serializer) => Effect.sync(() => {
          IPC.SendNotification(
            "$registerWebviewPanelSerializer",
            [ViewType, {}]
          );
          return new Disposable(() => {
            IPC.SendNotification(
              "$unregisterWebviewPanelSerializer",
              [ViewType]
            );
          });
        }), "RegisterWebviewPanelSerializer")
      };
    })
  }
) {
  static {
    __name(this, "WebViewPanelService");
  }
}
export {
  WebViewPanelService
};
//# sourceMappingURL=WebViewPanel.js.map
