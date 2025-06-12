var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import * as QuickInputConverter from "../../TypeConverter/QuickInput.js";
import { IpcProvider } from "../Ipc/mod.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ShowQuickPickEffect = /* @__PURE__ */ __name((Items, Options = {}, Token) => Effect.gen(function* (_2) {
    if (Token?.isCancellationRequested)
      return yield* _2(Effect.interrupt);
    const ResolvedItems = yield* _2(
      Effect.promise(() => Promise.resolve(Items))
    );
    const IpcOptions = {
      ...Options,
      items: QuickInputConverter.QuickPick.SerializeItems(
        ResolvedItems
      ),
      buttons: QuickInputConverter.QuickPick.SerializeButtons(
        Options.buttons
      )
    };
    const ResultHandles = yield* _2(
      Ipc.SendRequest(
        "ui_showQuickPick",
        IpcOptions
      ),
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      )
    );
    if (Options?.canPickMany) {
      if (!Array.isArray(ResultHandles)) return void 0;
      const SelectedIndices = new Set(ResultHandles);
      return ResolvedItems.filter(
        (_3, index) => SelectedIndices.has(index)
      );
    }
    if (typeof ResultHandles === "number" && ResultHandles >= 0) {
      return ResolvedItems[ResultHandles];
    }
    return void 0;
  }), "ShowQuickPickEffect");
  const ShowInputBoxEffect = /* @__PURE__ */ __name((Options, Token) => Effect.gen(function* (_2) {
    if (Token?.isCancellationRequested)
      return yield* _2(Effect.interrupt);
    const IpcOptions = {
      ...Options,
      buttons: QuickInputConverter.QuickPick.SerializeButtons(
        Options?.buttons
      )
    };
    return yield* _2(
      Ipc.SendRequest(
        "ui_showInputBox",
        IpcOptions
      ),
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      )
    );
  }), "ShowInputBoxEffect");
  const ServiceImplementation = {
    ShowQuickPick: ShowQuickPickEffect,
    ShowInputBox: ShowInputBoxEffect,
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
  Definition
};
//# sourceMappingURL=Definition.js.map
