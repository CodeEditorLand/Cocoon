var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Config, Effect, Layer, LogLevel } from "effect";
import Service from "./Service.js";
const Live = Layer.effect(
  Service,
  Effect.gen(function* (G) {
    const allowExit = yield* G(Config.boolean("AllowExit"));
    return {
      NativeExit: process.exit.bind(process),
      NativeCrash: typeof process.crash === "function" ? process.crash.bind(process) : void 0,
      AllowExit: /* @__PURE__ */ __name(() => allowExit, "AllowExit")
    };
  }).pipe(
    Effect.catchAll(
      (error) => Effect.log("Failed to load ProcessPatch config, using defaults.", {
        error,
        logLevel: LogLevel.Warning
      }).pipe(
        Effect.as({
          NativeExit: process.exit.bind(process),
          NativeCrash: typeof process.crash === "function" ? process.crash.bind(process) : void 0,
          AllowExit: /* @__PURE__ */ __name(() => false, "AllowExit")
          // Default to not allowing exit on error.
        })
      )
    )
  )
);
var Live_default = Live;
export {
  Live_default as default
};
//# sourceMappingURL=Live.js.map
