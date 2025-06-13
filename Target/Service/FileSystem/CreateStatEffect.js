var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
import { FileSystemError, MapToVSCodeError } from "./Error.js";
function CreateStatEffect(URI) {
  return Effect.gen(function* (_) {
    const IPCService = yield* _(IPC.Tag);
    const UriDTO = TypeConverter.URIConverter.FromAPI(URI);
    const RawStat = yield* _(
      IPCService.SendRequest("$stat", [UriDTO])
    );
    return {
      type: RawStat.type,
      ctime: RawStat.ctime,
      mtime: RawStat.mtime,
      size: RawStat.size,
      permissions: RawStat.permissions
    };
  }).pipe(
    Effect.mapError(
      (cause) => new FileSystemError({ cause, operation: "Stat", uri: URI })
    ),
    Effect.catchTag(
      "FileSystemError",
      (e) => Effect.fail(MapToVSCodeError(e))
    )
  );
}
__name(CreateStatEffect, "CreateStatEffect");
export {
  CreateStatEffect
};
//# sourceMappingURL=CreateStatEffect.js.map
