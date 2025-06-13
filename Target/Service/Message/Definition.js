var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPC } from "../IPC.js";
import { ParseArgument } from "./Support/ParseArgument.js";
function ShowMessageEffect(Severity, Message, Option, Items, Source) {
  return Effect.gen(function* (_) {
    const IPCService = yield* _(IPC.Tag);
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
      source: Source ? { identifier: Source.id, name: Source.displayName } : void 0
    };
    const ResultHandle = yield* _(
      IPCService.SendRequest("$showMessage", [
        Severity,
        Message,
        DTO.options,
        DTO.items,
        DTO.source
      ])
    );
    if (ResultHandle === void 0 || ResultHandle === null) {
      return void 0;
    }
    if (ResultHandle >= 0 && ResultHandle < Items.length) {
      return Items[ResultHandle];
    }
    return void 0;
  });
}
__name(ShowMessageEffect, "ShowMessageEffect");
const Definition = Effect.succeed({
  ShowInformationMessage: /* @__PURE__ */ __name((message, ...args) => {
    const { Option, Items, Source } = ParseArgument(args);
    return ShowMessageEffect("Info", message, Option, Items, Source);
  }, "ShowInformationMessage"),
  ShowWarningMessage: /* @__PURE__ */ __name((message, ...args) => {
    const { Option, Items, Source } = ParseArgument(args);
    return ShowMessageEffect("Warning", message, Option, Items, Source);
  }, "ShowWarningMessage"),
  ShowErrorMessage: /* @__PURE__ */ __name((message, ...args) => {
    const { Option, Items, Source } = ParseArgument(args);
    return ShowMessageEffect("Error", message, Option, Items, Source);
  }, "ShowErrorMessage")
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
