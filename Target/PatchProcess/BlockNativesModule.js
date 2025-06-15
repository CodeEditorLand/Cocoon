var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Data, Effect } from "effect";
class ModulePatchError extends Data.TaggedError("ModulePatchError") {
  static {
    __name(this, "ModulePatchError");
  }
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to patch Node.js module loader: ${this.context}`;
  }
  message;
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
      console.warn(
        "[Cocoon PatchProcess] Module._load not found. Skipping 'natives' block patch."
      );
    }
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new ModulePatchError({
    context: "Failed during 'natives' block setup.",
    Cause
  }), "catch")
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Module._load patched to block 'natives' module.")
  )
);
var BlockNativesModule_default = BlockNativesModule;
export {
  BlockNativesModule_default as default
};
//# sourceMappingURL=BlockNativesModule.js.map
