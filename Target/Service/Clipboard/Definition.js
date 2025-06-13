var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPC } from "../IPC.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const ReadText = IPCService.SendRequest(
    "$clipboardReadText",
    []
  ).pipe(
    Effect.map((result) => result ?? ""),
    // Ensure we always return a string
    Effect.catchAll(() => Effect.succeed(""))
    // On failure, return an empty string
  );
  const WriteText = /* @__PURE__ */ __name((Text) => IPCService.SendNotification("$clipboardWriteText", [Text]).pipe(
    Effect.catchAll(() => Effect.unit)
    // Ignore errors for fire-and-forget
  ), "WriteText");
  const ServiceImplementation = {
    /**
     * Reads text from the clipboard. This builds and runs the ReadText Effect,
     * returning a Promise to conform to the vscode API.
     */
    readText: /* @__PURE__ */ __name(() => Effect.runPromise(ReadText), "readText"),
    /**
     * Writes text to the clipboard. This builds and runs the WriteText Effect,
     * returning a Promise to conform to the vscode API.
     */
    writeText: /* @__PURE__ */ __name((Text) => Effect.runPromise(WriteText(Text)), "writeText")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
