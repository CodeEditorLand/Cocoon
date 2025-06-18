var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import URIConverter from "../../../TypeConverter/Main/URI.js";
var FindFiles_default = /* @__PURE__ */ __name((IPC, include, exclude, maxResults, token) => Effect.gen(function* () {
  const TokenID = token ? 1 : 0;
  const ResultDTOs = yield* IPC.SendRequest("$findFiles", [
    include,
    exclude,
    maxResults,
    TokenID
  ]);
  return ResultDTOs.map(URIConverter.ToAPI);
}), "default");
export {
  FindFiles_default as default
};
//# sourceMappingURL=FindFiles.js.map
