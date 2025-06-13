var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
class ProcessPatchError extends Error {
  constructor(context, cause) {
    super(`Failed to patch Node.js process: ${context}`);
    this.context = context;
    this.cause = cause;
  }
  static {
    __name(this, "ProcessPatchError");
  }
  _tag = "ProcessPatchError";
}
const SetElectronRunAsNode = Effect.try({
  try: /* @__PURE__ */ __name(() => {
    process.env["ELECTRON_RUN_AS_NODE"] = "1";
  }, "try"),
  catch: /* @__PURE__ */ __name((cause) => new ProcessPatchError("SetElectronRunAsNode", {
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
