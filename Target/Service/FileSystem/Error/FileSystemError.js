var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
import { FileSystemError as VscFileSystemError } from "vscode";
const MapToVSCodeError = /* @__PURE__ */ __name((Error2) => {
  const Cause = Error2.cause;
  const URI = Error2.uri;
  const CauseCode = Cause && typeof Cause === "object" && "code" in Cause ? String(Cause.code) : "";
  const CauseMessage = Cause && typeof Cause === "object" && "message" in Cause ? String(Cause.message) : String(Cause);
  if (CauseCode === "EntryNotFound" || CauseMessage.includes("not found")) {
    return VscFileSystemError.FileNotFound(URI);
  }
  if (CauseCode === "EntryExists" || CauseMessage.includes("exists")) {
    return VscFileSystemError.FileExists(URI);
  }
  if (CauseCode === "NoPermissions") {
    return VscFileSystemError.NoPermissions(URI);
  }
  return new VscFileSystemError(
    `${Error2.operation} failed for ${URI?.toString() ?? "unknown resource"}: ${CauseMessage}`
  );
}, "MapToVSCodeError");
class FileSystemError_default extends Data.TaggedError("FileSystemError") {
  static {
    __name(this, "default");
  }
}
export {
  MapToVSCodeError,
  FileSystemError_default as default
};
//# sourceMappingURL=FileSystemError.js.map
