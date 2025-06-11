var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Effect } from "effect";
class ModulePatchError extends Error {
  constructor(context, cause) {
    super(`Failed to patch Node.js module loader: ${context}`);
    this.context = context;
    this.cause = cause;
  }
  static {
    __name(this, "ModulePatchError");
  }
  _tag = "ModulePatchError";
}
const BlockNativesModule = Effect.try({
  try: /* @__PURE__ */ __name(() => {
    if (typeof Module._load === "function") {
      const OriginalLoad = Module._load;
      Module._load = function(Request, Parent, IsMain) {
        if (Request === "natives") {
          const ErrorMessage = "Attempt to load deprecated 'natives' module blocked. This module is not available in the Cocoon runtime.";
          console.warn(`[Cocoon PatchProcess] ${ErrorMessage}`);
          throw new Error(ErrorMessage);
        }
        return OriginalLoad.call(this, Request, Parent, IsMain);
      };
    } else {
      throw new Error(
        "Module._load not found or is not a function. Cannot apply 'natives' block patch."
      );
    }
  }, "try"),
  catch: /* @__PURE__ */ __name((cause) => new ModulePatchError("Failed during 'natives' block setup.", { cause }), "catch")
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Module._load patched to block 'natives' module.")
  )
);
export {
  BlockNativesModule
};
//# sourceMappingURL=BlockNativesModule.js.map
