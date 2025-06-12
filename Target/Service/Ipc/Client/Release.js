var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const Release = /* @__PURE__ */ __name((Client) => Effect.sync(() => {
  Client.close();
}).pipe(Effect.tap(() => Effect.logInfo("gRPC client connection closed."))), "Release");
export {
  Release
};
//# sourceMappingURL=Release.js.map
