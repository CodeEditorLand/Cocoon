var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Runtime } from "effect";
import { ApplicationClipboardProblem } from "./Clipboard/ApplicationClipboardProblem.js";
import { ReadText, WriteText } from "./Integration/Tauri/Clipboard/Wrapper.js";
const RunIntegrationEffect = /* @__PURE__ */ __name((IntegrationEffect) => {
  const MappedEffect = Effect.mapError(
    IntegrationEffect,
    (Cause) => new ApplicationClipboardProblem({ Cause })
  );
  return Runtime.runPromise(Runtime.defaultRuntime, MappedEffect);
}, "RunIntegrationEffect");
class ClipboardService extends Effect.Service()(
  "vscode/ClipboardService",
  {
    sync: /* @__PURE__ */ __name(() => ({
      writeText: /* @__PURE__ */ __name((text) => {
        return RunIntegrationEffect(WriteText(text));
      }, "writeText"),
      readText: /* @__PURE__ */ __name(() => {
        return RunIntegrationEffect(ReadText());
      }, "readText")
    }), "sync")
  }
) {
  static {
    __name(this, "ClipboardService");
  }
}
export {
  ClipboardService
};
//# sourceMappingURL=Clipboard.js.map
