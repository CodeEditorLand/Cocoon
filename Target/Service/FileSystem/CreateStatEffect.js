var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { URI as URIConverter } from "../../TypeConverter/Main.js";
import IPCService from "../IPC/Service.js";
import { FileSystemError, MapToVSCodeError } from "./Error.js";
const CreateStatEffect = /* @__PURE__ */ __name((URI) => {
  return Effect.gen(function* () {
    const IPC = yield* IPCService;
    const UriDTO = URIConverter.FromAPI(URI);
    const RawStat = yield* IPC.SendRequest("$stat", [UriDTO]);
    return {
      type: RawStat.type,
      ctime: RawStat.ctime,
      mtime: RawStat.mtime,
      size: RawStat.size,
      permissions: RawStat.permissions
    };
  }).pipe(
    Effect.mapError(
      (Cause) => new FileSystemError({
        cause: Cause,
        operation: "Stat",
        uri: URI
      })
    ),
    Effect.catchTag(
      "FileSystemError",
      (Error2) => Effect.fail(MapToVSCodeError(Error2))
    )
  );
}, "CreateStatEffect");
var CreateStatEffect_default = CreateStatEffect;
export {
  CreateStatEffect_default as default
};
//# sourceMappingURL=CreateStatEffect.js.map
