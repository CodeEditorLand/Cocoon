var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable, StatusBarAlignment } from "vscode";
import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import StatusBarItemImplementation from "./StatusBarItemImplementation.js";
let EntryIDCounter = 0;
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Command = yield* G(CommandService);
  const ActiveEntriesRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const StatusBarImplementation = {
    CreateStatusBarItem: /* @__PURE__ */ __name((Extension, ID, Alignment, Priority) => Effect.sync(() => {
      const EntryID = `ext-statusbar-${EntryIDCounter++}`;
      const ItemID = ID ?? `${Extension.identifier.value}.${EntryID}`;
      const FinalAlignment = Alignment ?? StatusBarAlignment.Left;
      const OnDispose = /* @__PURE__ */ __name(() => {
        Effect.runSync(
          Ref.update(
            ActiveEntriesRef,
            (Map2) => (Map2.delete(EntryID), Map2)
          )
        );
      }, "OnDispose");
      const Entry = new StatusBarItemImplementation(
        EntryID,
        IPC,
        Command,
        OnDispose,
        ItemID,
        FinalAlignment,
        Priority
      );
      Effect.runSync(
        Ref.update(
          ActiveEntriesRef,
          (Map2) => Map2.set(EntryID, Entry)
        )
      );
      return Entry;
    }), "CreateStatusBarItem"),
    SetStatusBarMessage: /* @__PURE__ */ __name((Text, HideOrPromise) => {
      const HideId = `status.message.${EntryIDCounter++}`;
      const ShowEffect = IPC.SendNotification("$setStatusBarMessage", [
        HideId,
        Text
      ]);
      const HideEffect = IPC.SendNotification(
        "$disposeStatusBarMessage",
        [HideId]
      );
      Effect.runFork(ShowEffect);
      if (typeof HideOrPromise === "number") {
        setTimeout(() => Effect.runFork(HideEffect), HideOrPromise);
      } else if (HideOrPromise) {
        HideOrPromise.then(() => Effect.runFork(HideEffect));
      }
      return new Disposable(() => Effect.runFork(HideEffect));
    }, "SetStatusBarMessage")
  };
  return StatusBarImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
