var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
import { FileSystemError as VscFileSystemError } from "vscode";
class FileSystemError extends Data.TaggedError("FileSystemError") {
  static {
    __name(this, "FileSystemError");
  }
}
const MapToVSCodeError = /* @__PURE__ */ __name((Error2) => {
  const Cause = Error2.cause;
  const URI = Error2.uri;
  if (Cause?.code === "EntryNotFound" || Cause?.message?.includes("not found")) {
    return VscFileSystemError.FileNotFound(URI);
  }
  if (Cause?.code === "EntryExists" || Cause?.message?.includes("exists")) {
    return VscFileSystemError.FileExists(URI);
  }
  if (Cause?.code === "NoPermissions") {
    return VscFileSystemError.NoPermissions(URI);
  }
  const Message = Cause instanceof globalThis.Error ? Cause.message : String(Cause);
  return new VscFileSystemError(
    `${Error2.operation} failed for ${URI?.toString() ?? "unknown resource"}: ${Message}`
  );
}, "MapToVSCodeError");
export {
  FileSystemError,
  MapToVSCodeError
};
//# sourceMappingURL=FileSystemError.js.map
