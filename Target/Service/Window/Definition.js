var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const WindowStateRef = yield* _(
    Ref.make({ focused: true, active: true, visible: true })
  );
  const OnDidChangeWindowState = CreateEventStream();
  Ipc.RegisterInvokeHandler("$acceptWindowStateChanged", ([state]) => {
    return Ref.set(WindowStateRef, state).pipe(
      Effect.flatMap(() => OnDidChangeWindowState.Fire(state)),
      Effect.runPromise
    );
  });
  const ServiceImplementation = {
    get state() {
      return Ref.get(WindowStateRef).pipe(Effect.runSync);
    },
    onDidChangeWindowState: OnDidChangeWindowState.Stream,
    // Properties like activeTextEditor would be managed by a separate TextEditor service.
    // This is a simplified stub.
    get activeTextEditor() {
      return void 0;
    },
    get visibleTextEditors() {
      return [];
    },
    onDidChangeActiveTextEditor: CreateEventStream().Stream,
    onDidChangeVisibleTextEditors: CreateEventStream().Stream,
    ShowTextDocument: /* @__PURE__ */ __name((doc, opts, preserve) => {
      return Effect.fail(
        new Error("'showTextDocument' not fully implemented.")
      );
    }, "ShowTextDocument")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
