var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcError } from "../Error.js";
const Release = /* @__PURE__ */ __name((Server) => Effect.tryPromise({
  try: /* @__PURE__ */ __name(() => new Promise((resolve) => Server.tryShutdown(() => resolve())), "try"),
  catch: /* @__PURE__ */ __name((Cause) => new IpcError({
    cause: Cause,
    context: "gRPC server shutdown failed"
  }), "catch")
}).pipe(Effect.tap(() => Effect.logInfo("Cocoon gRPC server shut down."))), "Release");
export {
  Release
};
//# sourceMappingURL=Release.js.map
