var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import QuickInputConverter from "../../TypeConverter/QuickInput.js";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const ShowQuickPickEffect = /* @__PURE__ */ __name((Items, Option = {}, Token) => Effect.gen(function* (G2) {
    if (Token?.isCancellationRequested) {
      return yield* G2(Effect.interrupt);
    }
    const ResolvedItems = yield* G2(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Promise.resolve(Items), "try"),
        catch: /* @__PURE__ */ __name((e) => e, "catch")
      })
    );
    const IPCOptions = {
      ...Option,
      items: QuickInputConverter.SerializeItems(ResolvedItems),
      buttons: QuickInputConverter.SerializeButtons(
        Option.buttons
      )
    };
    const ResultHandles = yield* G2(
      IPC.SendRequest(
        "$showQuickPick",
        [IPCOptions]
      ).pipe(
        Effect.catchIf(
          isCancellationError,
          () => Effect.succeed(void 0)
        ),
        Effect.mapError((cause) => new Error(String(cause)))
      )
    );
    if (Option?.canPickMany) {
      if (!Array.isArray(ResultHandles)) {
        return void 0;
      }
      const SelectedIndices = new Set(ResultHandles);
      return ResolvedItems.filter(
        (_, index) => SelectedIndices.has(index)
      );
    }
    if (typeof ResultHandles === "number" && ResultHandles >= 0) {
      return ResolvedItems[ResultHandles];
    }
    return void 0;
  }), "ShowQuickPickEffect");
  const ShowInputBoxEffect = /* @__PURE__ */ __name((Option, Token) => Effect.gen(function* (G2) {
    if (Token?.isCancellationRequested) {
      return yield* G2(Effect.interrupt);
    }
    const IPCOptions = {
      ...Option,
      buttons: QuickInputConverter.SerializeButtons(
        Option?.buttons
      )
    };
    return yield* G2(
      IPC.SendRequest("$showInputBox", [
        IPCOptions
      ]).pipe(
        Effect.catchIf(
          isCancellationError,
          () => Effect.succeed(void 0)
        ),
        Effect.mapError((cause) => new Error(String(cause)))
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
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
