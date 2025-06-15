var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const ReadText = IPC.SendRequest("$clipboardReadText", []).pipe(
    Effect.map((Result) => Result ?? ""),
    // Ensure we always return a string
    Effect.catchAll(() => Effect.succeed(""))
    // On failure, return an empty string
  );
  const WriteText = /* @__PURE__ */ __name((Text) => IPC.SendNotification("$clipboardWriteText", [Text]).pipe(
    Effect.catchAll(() => Effect.void)
    // Ignore errors for fire-and-forget
  ), "WriteText");
  const ClipboardImplementation = {
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
  return ClipboardImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
