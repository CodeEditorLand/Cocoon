var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
import { FileSystemError as VscFileSystemError } from "vscode";
class FileSystemError extends Data.TaggedError("FileSystemError") {
  static {
    __name(this, "FileSystemError");
  }
}
function MapToVSCodeError(error) {
  const cause = error.cause;
  const uri = error.uri;
  if (cause?.code === "EntryNotFound" || cause?.message?.includes("not found")) {
    return VscFileSystemError.FileNotFound(uri);
  }
  if (cause?.code === "EntryExists" || cause?.message?.includes("exists")) {
    return VscFileSystemError.FileExists(uri);
  }
  if (cause?.code === "NoPermissions") {
    return VscFileSystemError.NoPermissions(uri);
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return new VscFileSystemError(
    `${error.operation} failed for ${uri?.toString() ?? "unknown resource"}: ${message}`
  );
}
__name(MapToVSCodeError, "MapToVSCodeError");
export {
  FileSystemError,
  MapToVSCodeError
};
//# sourceMappingURL=Error.js.map
