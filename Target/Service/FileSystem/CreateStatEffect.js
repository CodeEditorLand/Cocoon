var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FileType } from "vscode";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { IpcProvider } from "../Ipc/mod.js";
import { FileSystemError, MapToVscodeError } from "./Error.js";
const CreateStatEffect = /* @__PURE__ */ __name((Uri) => Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const UriDto = TypeConverter.Uri.fromApi(Uri);
  const RawStat = yield* _(
    Ipc.SendRequest("workspacefs_stat", [UriDto])
  );
  return {
    type: RawStat.type ?? FileType.Unknown,
    ctime: RawStat.ctime,
    mtime: RawStat.mtime,
    size: RawStat.size,
    permissions: RawStat.permissions
  };
}).pipe(
  Effect.mapError(
    (cause) => new FileSystemError({ cause, operation: "Stat", uri: Uri })
  ),
  Effect.catchTag(
    "FileSystemError",
    (e) => Effect.fail(MapToVscodeError(e))
  )
), "CreateStatEffect");
export {
  CreateStatEffect
};
//# sourceMappingURL=CreateStatEffect.js.map
