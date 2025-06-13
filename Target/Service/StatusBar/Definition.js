var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable, StatusBarAlignment } from "vscode";
import { IPC } from "../IPC.js";
import { StatusBarItemImplementation } from "./StatusBarItemImplementation.js";
let EntryIDCounter = 0;
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const ActiveEntries = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  IPCService.RegisterInvokeHandler(
    "$provideStatusbarTooltip",
    ([entryID]) => Effect.gen(function* (_2) {
      return null;
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    CreateStatusBarItem: /* @__PURE__ */ __name((Extension, ID, Alignment, Priority) => Effect.sync(() => {
      const EntryID = `ext-statusbar-${EntryIDCounter++}`;
      const ItemID = ID ?? `${Extension.identifier.value}.${EntryID}`;
      const FinalAlignment = Alignment ?? StatusBarAlignment.Left;
      const OnDispose = /* @__PURE__ */ __name(() => {
        Ref.update(
          ActiveEntries,
          (map) => (map.delete(EntryID), map)
        ).pipe(Effect.runSync);
      }, "OnDispose");
      const Entry = new StatusBarItemImplementation(
        EntryID,
        IPCService,
        OnDispose,
        ItemID,
        FinalAlignment,
        Priority
      );
      Ref.update(
        ActiveEntries,
        (map) => map.set(EntryID, Entry)
      ).pipe(Effect.runSync);
      return Entry;
    }), "CreateStatusBarItem"),
    SetStatusBarMessage: /* @__PURE__ */ __name((text, hideOrPromise) => {
      const hideId = `status.message.${EntryIDCounter++}`;
      const ShowEffect = IPCService.SendNotification(
        "$setStatusBarMessage",
        [hideId, text]
      );
      const HideEffect = IPCService.SendNotification(
        "$disposeStatusBarMessage",
        [hideId]
      );
      Effect.runFork(ShowEffect);
      if (typeof hideOrPromise === "number") {
        setTimeout(() => Effect.runFork(HideEffect), hideOrPromise);
      } else if (hideOrPromise) {
        hideOrPromise.then(() => Effect.runFork(HideEffect));
      }
      return new Disposable(() => Effect.runFork(HideEffect));
    }, "SetStatusBarMessage")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
