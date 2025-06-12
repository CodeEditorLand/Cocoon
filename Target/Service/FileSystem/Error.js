var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
import { FileSystemError as VscodeFileSystemError } from "vscode";
class FileSystemError extends Data.TaggedError("FileSystemError") {
  static {
    __name(this, "FileSystemError");
  }
}
const MapToVscodeError = /* @__PURE__ */ __name((error) => {
  const cause = error.cause;
  const uri = error.uri;
  if (cause?.code === "ENOENT" || cause?.message?.includes("not found")) {
    return VscodeFileSystemError.FileNotFound(uri);
  }
  if (cause?.code === "EEXIST" || cause?.message?.includes("exists")) {
    return VscodeFileSystemError.FileExists(uri);
  }
  if (cause?.code === "EPERM" || cause?.code === "EACCES") {
    return VscodeFileSystemError.NoPermissions(uri);
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return new VscodeFileSystemError(
    `${error.operation} failed for ${uri?.toString() ?? "unknown resource"}: ${message}`
  );
}, "MapToVscodeError");
export {
  FileSystemError,
  MapToVscodeError
};
//# sourceMappingURL=Error.js.map
