var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import {
  Disposable
} from "vscode";
import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { WebViewPanelImplementation } from "./WebViewPanelImplementation.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const ActivePanels = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  IPCService.RegisterInvokeHandler("$onDidDisposeWebview", ([handle]) => {
    const panel = Ref.get(ActivePanels).pipe(
      Effect.map((m) => m.get(handle)),
      Effect.runSync
    );
    if (panel) {
      panel.dispose();
    }
    return Promise.resolve(void 0);
  });
  IPCService.RegisterInvokeHandler(
    "$onDidReceiveMessage",
    ([handle, message]) => {
      const panel = Ref.get(ActivePanels).pipe(
        Effect.map((m) => m.get(handle)),
        Effect.runSync
      );
      if (panel) {
        panel.webview.fireDidReceiveMessage(message);
      }
      return Promise.resolve(void 0);
    }
  );
  IPCService.RegisterInvokeHandler(
    "$onDidChangeWebviewPanelViewState",
    ([handle, newState]) => {
      const panel = Ref.get(ActivePanels).pipe(
        Effect.map((m) => m.get(handle)),
        Effect.runSync
      );
      if (panel) {
        panel._updateViewState(newState);
      }
      return Promise.resolve(void 0);
    }
  );
  IPCService.RegisterInvokeHandler(
    "$deserializeWebviewPanel",
    ([handle, viewType, title, state, options, contentOptions]) => {
      return Promise.resolve(void 0);
    }
  );
  const ServiceImplementation = {
    CreateWebviewPanel: /* @__PURE__ */ __name((Extension, ViewType, Title, ShowOptions, Options = {}) => Effect.gen(function* (_2) {
      const handle = generateUuid();
      const ViewColumnValue = typeof ShowOptions === "object" ? ShowOptions.viewColumn : ShowOptions;
      const PreserveFocus = typeof ShowOptions === "object" ? !!ShowOptions.preserveFocus : false;
      const ShowOptionsDTO = TypeConverter.WebView.ConvertShowOptionToDTO(
        ViewColumnValue,
        PreserveFocus
      );
      const PanelOptionsDTO = TypeConverter.WebView.ConvertPanelOptionToDTO(Options);
      const ContentOptionsDTO = TypeConverter.WebView.ConvertContentOptionToDTO(
        Extension,
        Options
      );
      yield* _2(
        IPCService.SendRequest("$createWebviewPanel", [
          handle,
          ViewType,
          Title,
          ShowOptionsDTO,
          PanelOptionsDTO,
          ContentOptionsDTO
        ])
      );
      const onDispose = /* @__PURE__ */ __name(() => {
        Ref.update(
          ActivePanels,
          (map) => (map.delete(handle), map)
        ).pipe(Effect.runSync);
      }, "onDispose");
      const Panel = new WebViewPanelImplementation(
        handle,
        IPCService,
        Extension,
        onDispose,
        ViewType,
        Title,
        Options,
        ViewColumnValue
      );
      yield* _2(
        Ref.update(ActivePanels, (map) => map.set(handle, Panel))
      );
      return Panel;
    }), "CreateWebviewPanel"),
    RegisterWebviewPanelSerializer: /* @__PURE__ */ __name((Extension, ViewType, Serializer) => Effect.sync(() => {
      IPCService.SendNotification("$registerWebviewPanelSerializer", [
        ViewType,
        {
          // options for the serializer
        }
      ]);
      return new Disposable(() => {
        IPCService.SendNotification(
          "$unregisterWebviewPanelSerializer",
          [ViewType]
        );
      });
    }), "RegisterWebviewPanelSerializer")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
