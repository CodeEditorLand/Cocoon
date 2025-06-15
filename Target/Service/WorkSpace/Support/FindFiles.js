var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter/Main.js";
import CancellationService from "../../Cancellation/Service.js";
function FindFiles_default(IPC, include, exclude, maxResults, token) {
  return Effect.gen(function* (_) {
    const Cancellation = yield* _(CancellationService);
    const tokenID = token ? token._id ?? 0 : 0;
    const resultDTOs = yield* _(
      IPC.SendRequest("$findFiles", [
        include,
        exclude,
        maxResults,
        tokenID
      ])
    );
    return resultDTOs.map(TypeConverter.URI.ToAPI);
  });
}
__name(FindFiles_default, "default");
export {
  FindFiles_default as default
};
//# sourceMappingURL=FindFiles.js.map
