var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ProcessPatchError } from "./Error/mod.js";
const SetElectronRunAsNode = Effect.try({
  try: /* @__PURE__ */ __name(() => {
    process.env["ELECTRON_RUN_AS_NODE"] = "1";
  }, "try"),
  catch: /* @__PURE__ */ __name((cause) => new ProcessPatchError({
    context: "SetElectronRunAsNode",
    cause
  }), "catch")
}).pipe(
  Effect.tap(
    () => Effect.logTrace(
      "Set environment variable 'ELECTRON_RUN_AS_NODE' to '1'."
    )
  )
);
export {
  SetElectronRunAsNode
};
//# sourceMappingURL=SetElectronRunAsNode.js.map
