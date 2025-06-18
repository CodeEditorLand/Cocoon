var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const ReadTextEffect = IPC.SendRequest(
    "$clipboardReadText",
    []
  ).pipe(
    Effect.map((Result) => Result ?? ""),
    // Ensure we always return a string
    Effect.catchAll(() => Effect.succeed(""))
    // On failure, return an empty string
  );
  const WriteTextEffect = /* @__PURE__ */ __name((Text) => IPC.SendNotification("$clipboardWriteText", [Text]).pipe(
    Effect.catchAll(() => Effect.void)
    // Ignore errors for fire-and-forget
  ), "WriteTextEffect");
  const ClipboardImplementation = {
    /**
     * Reads text from the clipboard. This builds and runs the ReadTextEffect,
     * returning a Promise to conform to the vscode API.
     */
    readText: /* @__PURE__ */ __name(() => Effect.runPromise(ReadTextEffect), "readText"),
    /**
     * Writes text to the clipboard. This builds and runs the WriteTextEffect,
     * returning a Promise to conform to the vscode API.
     */
    writeText: /* @__PURE__ */ __name((Text) => Effect.runPromise(WriteTextEffect(Text)), "writeText")
  };
  return ClipboardImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
