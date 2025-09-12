var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPCService } from "./IPC.js";
const ParseArgument = /* @__PURE__ */ __name((Arguments) => {
  let Option = {};
  let Items = [];
  let CurrentIndex = 0;
  if (Arguments.length > CurrentIndex && typeof Arguments[CurrentIndex] === "object" && Arguments[CurrentIndex] !== null && !Arguments[CurrentIndex].title && !Arguments[CurrentIndex].id) {
    Option = Arguments[CurrentIndex++];
  }
  Items = Arguments.slice(CurrentIndex).filter(
    (item) => typeof item === "string" || typeof item === "object" && item !== null && typeof item.title === "string"
  );
  return { Option, Items };
}, "ParseArgument");
const CreateShowMessageEffect = /* @__PURE__ */ __name((IPC, Severity, Message, Option, Items, Source) => {
  return Effect.gen(function* () {
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
    const ResultHandle = yield* IPC.SendRequest(
      "$showMessage",
      [DTO.severity, DTO.message, DTO.options, DTO.items, DTO.source]
    ).pipe(Effect.mapError((cause) => new Error(String(cause))));
    if (ResultHandle === void 0 || ResultHandle === null)
      return void 0;
    if (ResultHandle >= 0 && ResultHandle < Items.length) {
      const ResultItem = Items[ResultHandle];
      if (typeof ResultItem !== "string") return ResultItem;
    }
    return void 0;
  });
}, "CreateShowMessageEffect");
class MessageService extends Effect.Service()(
  "Service/Message",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      return {
        ShowInformationMessage: /* @__PURE__ */ __name((message, ...args) => {
          const { Option, Items } = ParseArgument(args);
          return CreateShowMessageEffect(
            IPC,
            1,
            message,
            Option,
            Items,
            void 0
            // Source is not used
          );
        }, "ShowInformationMessage"),
        ShowWarningMessage: /* @__PURE__ */ __name((message, ...args) => {
          const { Option, Items } = ParseArgument(args);
          return CreateShowMessageEffect(
            IPC,
            2,
            message,
            Option,
            Items,
            void 0
            // Source is not used
          );
        }, "ShowWarningMessage"),
        ShowErrorMessage: /* @__PURE__ */ __name((message, ...args) => {
          const { Option, Items } = ParseArgument(args);
          return CreateShowMessageEffect(
            IPC,
            3,
            message,
            Option,
            Items,
            void 0
            // Source is not used
          );
        }, "ShowErrorMessage")
      };
    })
  }
) {
  static {
    __name(this, "MessageService");
  }
}
export {
  MessageService
};
//# sourceMappingURL=Message.js.map
