var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter.js";
import { Cancellation } from "../../Cancellation/Service.js";
function FindFiles(IPCService, include, exclude, maxResults, token) {
  return Effect.gen(function* (_) {
    const CancellationService = yield* _(Cancellation.Tag);
    const tokenID = token ? Cancellation.getTokenID(token) : 0;
    const resultDTOs = yield* _(
      IPCService.SendRequest("$findFiles", [
        include,
        exclude,
        maxResults,
        tokenID
      ])
    );
    return resultDTOs.map(TypeConverter.URIConverter.ToAPI);
  });
}
__name(FindFiles, "FindFiles");
export {
  FindFiles
};
//# sourceMappingURL=FindFiles.js.map
