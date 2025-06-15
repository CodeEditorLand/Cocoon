var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const Release = /* @__PURE__ */ __name((Client) => {
  return Effect.sync(() => {
    Client.close();
  }).pipe(Effect.tap(() => Effect.logInfo("gRPC client connection closed.")));
}, "Release");
var Release_default = Release;
export {
  Release_default as default
};
//# sourceMappingURL=Release.js.map
