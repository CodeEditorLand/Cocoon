var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter.js";
function FetchBundle(IPCService, BundleURI) {
  return IPCService.SendRequest("$fetchBundleContents", [
    TypeConverter.URIConverter.FromAPI(BundleURI)
  ]).pipe(
    Effect.map((content) => content ? JSON.parse(content) : {}),
    // If the bundle doesn't exist or fails to parse, we gracefully treat it as an empty object.
    Effect.catchAll(() => Effect.succeed({}))
  );
}
__name(FetchBundle, "FetchBundle");
export {
  FetchBundle
};
//# sourceMappingURL=FetchBundle.js.map
