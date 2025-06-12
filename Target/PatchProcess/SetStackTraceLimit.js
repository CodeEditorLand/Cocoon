var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ProcessPatchError } from "./Error/mod.js";
const SetStackTraceLimit = Effect.try({
  try: /* @__PURE__ */ __name(() => {
    Error.stackTraceLimit = 100;
  }, "try"),
  catch: /* @__PURE__ */ __name((cause) => new ProcessPatchError({
    context: "SetStackTraceLimit",
    cause
  }), "catch")
}).pipe(Effect.tap(() => Effect.logTrace("Error.stackTraceLimit set to 100.")));
export {
  SetStackTraceLimit
};
//# sourceMappingURL=SetStackTraceLimit.js.map
