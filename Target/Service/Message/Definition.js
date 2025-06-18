var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../IPC/Service.js";
import ParseArgument from "./Support/ParseArgument.js";
const ShowMessageEffect = /* @__PURE__ */ __name((IPC, Severity, Message, Option, Items, Source) => {
  return Effect.gen(function* (G) {
    const ItemsForIPC = Items.map((item, index) => ({
      title: typeof item === "string" ? item : item.title,
      isCloseAffordance: typeof item === "object" ? !!item.isCloseAffordance : false,
      handle: index
    }));
    const DTO = {
      severity: Severity,
      message: Message,
      options: { modal: Option.modal, detail: Option.detail },
      items: ItemsForIPC,
      source: Source ? {
        identifier: typeof Source.id === "string" ? Source.id : Source.id.value,
        name: Source.displayName
      } : void 0
    };
    const ResultHandle = yield* G(
      IPC.SendRequest("$showMessage", [
        DTO.severity,
        DTO.message,
        DTO.options,
        DTO.items,
        DTO.source
      ]).pipe(Effect.mapError((cause) => new Error(String(cause))))
    );
    if (ResultHandle === void 0 || ResultHandle === null) {
      return void 0;
    }
    if (ResultHandle >= 0 && ResultHandle < Items.length) {
      const resultItem = Items[ResultHandle];
      if (typeof resultItem !== "string") {
        return resultItem;
      }
    }
    return void 0;
  });
}, "ShowMessageEffect");
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const ServiceImplementation = {
    ShowInformationMessage: /* @__PURE__ */ __name((message, ...args) => {
      const { Option, Items, Source } = ParseArgument(args);
      return ShowMessageEffect(
        IPC,
        1,
        // Severity.Info
        message,
        Option,
        Items,
        Source
      );
    }, "ShowInformationMessage"),
    ShowWarningMessage: /* @__PURE__ */ __name((message, ...args) => {
      const { Option, Items, Source } = ParseArgument(args);
      return ShowMessageEffect(
        IPC,
        2,
        // Severity.Warning
        message,
        Option,
        Items,
        Source
      );
    }, "ShowWarningMessage"),
    ShowErrorMessage: /* @__PURE__ */ __name((message, ...args) => {
      const { Option, Items, Source } = ParseArgument(args);
      return ShowMessageEffect(
        IPC,
        3,
        // Severity.Error
        message,
        Option,
        Items,
        Source
      );
    }, "ShowErrorMessage")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
