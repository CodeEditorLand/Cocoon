var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import * as QuickInputConverter from "../../TypeConverter/QuickInput.js";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* (_) {
  const IPC = yield* _(IPCService);
  const ShowQuickPick = /* @__PURE__ */ __name((Items, Option = {}, Token) => Effect.gen(function* (_2) {
    if (Token?.isCancellationRequested) {
      return yield* _2(Effect.interrupt);
    }
    const ResolvedItems = yield* _2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Promise.resolve(Items), "try"),
        catch: /* @__PURE__ */ __name((e) => e, "catch")
      })
    );
    const IPCOptions = {
      ...Option,
      items: QuickInputConverter.QuickPick.SerializeItems(
        ResolvedItems
      ),
      buttons: QuickInputConverter.QuickPick.SerializeButtons(
        Option.buttons
      )
    };
    const ResultHandles = yield* _2(
      IPC.SendRequest(
        "$showQuickPick",
        [IPCOptions]
      ),
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      )
    );
    if (Option?.canPickMany) {
      if (!Array.isArray(ResultHandles)) {
        return void 0;
      }
      const SelectedIndices = new Set(ResultHandles);
      return ResolvedItems.filter(
        (_3, index) => SelectedIndices.has(index)
      );
    }
    if (typeof ResultHandles === "number" && ResultHandles >= 0) {
      return ResolvedItems[ResultHandles];
    }
    return void 0;
  }), "ShowQuickPick");
  const ShowInputBox = /* @__PURE__ */ __name((Option, Token) => Effect.gen(function* (_2) {
    if (Token?.isCancellationRequested) {
      return yield* _2(Effect.interrupt);
    }
    const IPCOptions = {
      ...Option,
      buttons: QuickInputConverter.QuickPick.SerializeButtons(
        Option?.buttons
      )
    };
    return yield* _2(
      IPC.SendRequest("$showInputBox", [
        IPCOptions
      ]),
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      )
    );
  }), "ShowInputBox");
  const ServiceImplementation = {
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
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
