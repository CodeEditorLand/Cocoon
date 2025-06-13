var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPCError } from "../Error.js";
function Release(Server) {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => new Promise(
      (resolve, reject) => Server.tryShutdown(
        (error) => error ? reject(error) : resolve()
      )
    ), "try"),
    catch: /* @__PURE__ */ __name((Cause) => new IPCError({
      cause: Cause,
      context: "gRPC server shutdown failed"
    }), "catch")
  }).pipe(Effect.tap(() => Effect.logInfo("Cocoon gRPC server shut down.")));
}
__name(Release, "Release");
export {
  Release
};
//# sourceMappingURL=Release.js.map
