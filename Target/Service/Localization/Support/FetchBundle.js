var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import URIConverter from "../../../TypeConverter/Main/URI.js";
var FetchBundle_default = /* @__PURE__ */ __name((IPC, BundleURI) => IPC.SendRequest("$fetchBundleContents", [
  URIConverter.FromAPI(BundleURI)
]).pipe(
  Effect.map((content) => content ? JSON.parse(content) : {}),
  // If the bundle doesn't exist or fails to parse, we gracefully treat it as an empty object.
  Effect.catchAll(() => Effect.succeed({}))
), "default");
export {
  FetchBundle_default as default
};
//# sourceMappingURL=FetchBundle.js.map
