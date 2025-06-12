var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable, StatusBarAlignment } from "vscode";
import { IpcProvider } from "../Ipc/mod.js";
import { StatusBarItemImpl } from "./StatusBarItemImpl.js";
let EntryIdCounter = 0;
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ActiveEntries = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  Ipc.RegisterInvokeHandler(
    "$provideStatusbarTooltip",
    ([entryId]) => Effect.gen(function* (_2) {
      return null;
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    CreateStatusBarItem: /* @__PURE__ */ __name((Extension, Id, Alignment, Priority) => Effect.sync(() => {
      const EntryId = `ext-statusbar-${EntryIdCounter++}`;
      const ItemId = Id ?? `${Extension.identifier.value}.${EntryId}`;
      const FinalAlignment = Alignment ?? StatusBarAlignment.Left;
      const OnDispose = /* @__PURE__ */ __name(() => {
        Ref.update(
          ActiveEntries,
          (map) => (map.delete(EntryId), map)
        ).pipe(Effect.runSync);
      }, "OnDispose");
      const Entry = new StatusBarItemImpl(
        EntryId,
        Ipc,
        OnDispose,
        ItemId,
        FinalAlignment,
        Priority
      );
      Ref.update(
        ActiveEntries,
        (map) => map.set(EntryId, Entry)
      ).pipe(Effect.runSync);
      return Entry;
    }), "CreateStatusBarItem"),
    SetStatusBarMessage: /* @__PURE__ */ __name((text, hideOrPromise) => {
      const ShowEffect = Ipc.SendNotification("$setStatusBarMessage", [
        text
      ]);
      const HideEffect = Ipc.SendNotification(
        "$disposeStatusBarMessage",
        []
      );
      Effect.runFork(ShowEffect);
      return new Disposable(() => Effect.runFork(HideEffect));
    }, "SetStatusBarMessage")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
