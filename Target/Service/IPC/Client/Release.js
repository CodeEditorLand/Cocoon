var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function Release(Client) {
  return Effect.sync(() => {
    Client.close();
  }).pipe(Effect.tap(() => Effect.logInfo("gRPC client connection closed.")));
}
__name(Release, "Release");
export {
  Release
};
//# sourceMappingURL=Release.js.map
