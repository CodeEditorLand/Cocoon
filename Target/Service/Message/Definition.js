var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcProvider } from "../Ipc/mod.js";
import { ParseArgument } from "./Support/ParseArgument.js";
const ShowMessageEffect = /* @__PURE__ */ __name((Severity, Message, Options, Items, Source) => Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ItemsForIpc = Items.map((item, index) => ({
    Title: typeof item === "string" ? item : item.title,
    Handle: index,
    IsCloseAffordance: typeof item === "object" ? !!item.isCloseAffordance : false
  }));
  const Result = yield* _(
    Ipc.SendRequest("ui_showMessage", {
      Severity,
      Message,
      Options: { Modal: Options.modal, Detail: Options.detail },
      Items: ItemsForIpc,
      Source
    })
  );
  if (Result === void 0 || Result === null) return void 0;
  if (typeof Result === "number" && Result >= 0 && Result < Items.length) {
    return Items[Result];
  }
  if (typeof Result === "string") {
    return Items.find(
      (item) => (typeof item === "string" ? item : item.title) === Result
    ) ?? Result;
  }
  return void 0;
}), "ShowMessageEffect");
const Definition = Effect.succeed({
  ShowInformationMessage: /* @__PURE__ */ __name((message, ...args) => {
    const { Options, Items, Source } = ParseArgument(args);
    return ShowMessageEffect("Info", message, Options, Items, Source);
  }, "ShowInformationMessage"),
  ShowWarningMessage: /* @__PURE__ */ __name((message, ...args) => {
    const { Options, Items, Source } = ParseArgument(args);
    return ShowMessageEffect("Warning", message, Options, Items, Source);
  }, "ShowWarningMessage"),
  ShowErrorMessage: /* @__PURE__ */ __name((message, ...args) => {
    const { Options, Items, Source } = ParseArgument(args);
    return ShowMessageEffect("Error", message, Options, Items, Source);
  }, "ShowErrorMessage")
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
