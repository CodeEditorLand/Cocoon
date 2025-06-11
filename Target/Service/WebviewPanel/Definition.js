var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { IpcProvider } from "../Ipc/mod.js";
import { WebviewPanelImpl } from "./WebviewPanelImpl.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ActivePanels = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  Ipc.RegisterInvokeHandler("$onDidDisposeWebview", ([handle]) => {
  });
  Ipc.RegisterInvokeHandler("$onDidReceiveMessage", ([handle, message]) => {
  });
  const ServiceImplementation = {
    CreateWebviewPanel: /* @__PURE__ */ __name((Extension, ViewType, Title, ShowOptions, Options = {}) => Effect.gen(function* (_2) {
      const ViewColumnValue = typeof ShowOptions === "object" ? ShowOptions.viewColumn : ShowOptions;
      const PreserveFocus = typeof ShowOptions === "object" ? !!ShowOptions.preserveFocus : false;
      const SerializedShowOptions = TypeConverter.Webview.ConvertShowOptionsToDto(
        ViewColumnValue,
        PreserveFocus
      );
      const SerializedPanelOptions = TypeConverter.Webview.ConvertPanelOptionsToDto(Options);
      const SerializedContentOptions = TypeConverter.Webview.ConvertContentOptionsToDto(
        Extension,
        Options
      );
      const Handle = yield* _2(
        Ipc.SendRequest("$createWebviewPanel", [
          TypeConverter.Webview.ConvertExtensionDataToDto(
            Extension
          ),
          ViewType,
          Title,
          SerializedShowOptions,
          SerializedPanelOptions,
          SerializedContentOptions,
          true
        ])
      );
      const onDispose = /* @__PURE__ */ __name(() => {
        Ref.update(
          ActivePanels,
          (map) => (map.delete(Handle), map)
        ).pipe(Effect.runSync);
      }, "onDispose");
      const Panel = new WebviewPanelImpl(
        Handle,
        Ipc,
        Extension,
        onDispose,
        Title,
        Options,
        ViewColumnValue
      );
      yield* _2(
        Ref.update(ActivePanels, (map) => map.set(Handle, Panel))
      );
      return Panel;
    }), "CreateWebviewPanel")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
