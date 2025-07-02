var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Effect } from "effect";
import { IntegrationClipboardProblem } from "./Problem.js";
const WriteText = /* @__PURE__ */ __name((text) => Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => writeText(text), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IntegrationClipboardProblem({ Cause }), "catch")
}), "WriteText");
const ReadText = Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => readText(), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IntegrationClipboardProblem({ Cause }), "catch")
});
export {
  ReadText,
  WriteText
};
//# sourceMappingURL=Wrapper.js.map
