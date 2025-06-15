var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../IPC/Service.js";
import ParseArgument from "./Support/ParseArgument.js";
const ShowMessageEffect = /* @__PURE__ */ __name((IPC, Severity, Message, Option, Items, Source) => {
  return Effect.gen(function* () {
    const ItemsForIPC = Items.map((item, index) => ({
      title: typeof item === "string" ? item : item.title,
      isCloseAffordance: typeof item === "object" ? !!item.isCloseAffordance : false,
      handle: index
      // The host uses this handle to report the chosen item
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
    const ResultHandle = yield* IPC.SendRequest(
      "$showMessage",
      [Severity, Message, DTO.options, DTO.items, DTO.source]
    );
    if (ResultHandle === void 0 || ResultHandle === null) {
      return void 0;
    }
    if (ResultHandle >= 0 && ResultHandle < Items.length) {
      return Items[ResultHandle];
    }
    return void 0;
  });
}, "ShowMessageEffect");
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const ServiceImplementation = {
    ShowInformationMessage: /* @__PURE__ */ __name((message, ...args) => {
      const { Option, Items, Source } = ParseArgument(args);
      return ShowMessageEffect(
        IPC,
        "Info",
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
        "Warning",
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
        "Error",
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
