var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcProvider } from "../Ipc/mod.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ReadTextEffect = Ipc.SendRequest(
    "env_clipboardReadText",
    {}
  ).pipe(
    Effect.map((result) => result || ""),
    // Ensure we always return a string
    Effect.catchAll(() => Effect.succeed(""))
    // On failure, return an empty string
  );
  const WriteTextEffect = /* @__PURE__ */ __name((Text) => Ipc.SendNotification("env_clipboardWriteText", { Text }).pipe(
    Effect.catchAll(() => Effect.unit)
    // Ignore errors for fire-and-forget
  ), "WriteTextEffect");
  const ServiceImplementation = {
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
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
