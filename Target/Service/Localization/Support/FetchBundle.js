var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter/mod.js";
const FetchBundleEffect = /* @__PURE__ */ __name((IpcService, BundleUri) => IpcService.SendRequest("$fetchBundleContents", [
  TypeConverter.Uri.fromApi(BundleUri)
]).pipe(
  Effect.map((content) => content ? JSON.parse(content) : {}),
  // If the bundle doesn't exist or fails to parse, we treat it as an empty object.
  Effect.catchAll(() => Effect.succeed({}))
), "FetchBundleEffect");
export {
  FetchBundleEffect
};
//# sourceMappingURL=FetchBundle.js.map
