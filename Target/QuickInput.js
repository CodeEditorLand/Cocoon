var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import { IPCService } from "./IPC.js";
import {
  SerializeButtons,
  SerializeItems
} from "./TypeConverter/QuickInput.js";
class QuickInputService extends Effect.Service()(
  "Service/QuickInput",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const ShowQuickPick = /* @__PURE__ */ __name((Items, Option = {}, Token) => Effect.gen(function* () {
        if (Token?.isCancellationRequested) {
          return yield* Effect.interrupt;
        }
        const ResolvedItems = yield* Effect.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(Items), "try"),
          catch: /* @__PURE__ */ __name((e) => e, "catch")
        });
        const IPCOptions = {
          ...Option,
          items: SerializeItems(ResolvedItems),
          buttons: SerializeButtons(Option.buttons)
        };
        const ResultHandles = yield* IPC.SendRequest("$showQuickPick", [IPCOptions]).pipe(
          Effect.catchIf(
            isCancellationError,
            () => Effect.succeed(void 0)
          ),
          Effect.mapError((cause) => new Error(String(cause)))
        );
        if (Option?.canPickMany) {
          if (!Array.isArray(ResultHandles)) return void 0;
          const SelectedIndices = new Set(
            ResultHandles
          );
          return ResolvedItems.filter(
            (_, index) => SelectedIndices.has(index)
          );
        }
        if (typeof ResultHandles === "number" && ResultHandles >= 0) {
          return ResolvedItems[ResultHandles];
        }
        return void 0;
      }), "ShowQuickPick");
      const ShowInputBox = /* @__PURE__ */ __name((Option, Token) => Effect.gen(function* () {
        if (Token?.isCancellationRequested) {
          return yield* Effect.interrupt;
        }
        const IPCOptions = {
          ...Option,
          buttons: SerializeButtons(Option?.buttons)
        };
        return yield* IPC.SendRequest(
          "$showInputBox",
          [IPCOptions]
        ).pipe(
          Effect.catchIf(
            isCancellationError,
            () => Effect.succeed(void 0)
          ),
          Effect.mapError((cause) => new Error(String(cause)))
        );
      }), "ShowInputBox");
      return {
        ShowQuickPick,
        ShowInputBox,
        CreateQuickPick: /* @__PURE__ */ __name(() => {
          throw new Error(
            "Controller-based QuickPick is not implemented in Cocoon."
          );
        }, "CreateQuickPick"),
        CreateInputBox: /* @__PURE__ */ __name(() => {
          throw new Error(
            "Controller-based InputBox is not implemented in Cocoon."
          );
        }, "CreateInputBox")
      };
    })
  }
) {
  static {
    __name(this, "QuickInputService");
  }
}
export {
  QuickInputService
};
//# sourceMappingURL=QuickInput.js.map
