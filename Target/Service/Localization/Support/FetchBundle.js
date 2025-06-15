var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter/Main.js";
function FetchBundle_default(IPC, BundleURI) {
  return IPC.SendRequest("$fetchBundleContents", [
    TypeConverter.URI.FromAPI(BundleURI)
  ]).pipe(
    Effect.map((content) => content ? JSON.parse(content) : {}),
    // If the bundle doesn't exist or fails to parse, we gracefully treat it as an empty object.
    Effect.catchAll(() => Effect.succeed({}))
  );
}
__name(FetchBundle_default, "default");
export {
  FetchBundle_default as default
};
//# sourceMappingURL=FetchBundle.js.map
