var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPCError } from "../Error.js";
const Release = /* @__PURE__ */ __name((Server) => {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => new Promise(
      (Resolve, Reject) => Server.tryShutdown(
        (Error2) => Error2 ? Reject(Error2) : Resolve()
      )
    ), "try"),
    catch: /* @__PURE__ */ __name((Cause) => new IPCError({
      cause: Cause,
      context: "gRPC server shutdown failed"
    }), "catch")
  }).pipe(Effect.tap(() => Effect.logInfo("Cocoon gRPC server shut down.")));
}, "Release");
var Release_default = Release;
export {
  Release_default as default
};
//# sourceMappingURL=Release.js.map
