var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  FileSystemError as VSCodeFileSystemError
} from "vscode";
import { FileSystemInformationService } from "./FileSystemInformation.js";
import { IPCService } from "./IPC.js";
class FileSystemService extends Effect.Service()(
  "Service/FileSystem",
  {
    effect: Effect.gen(function* () {
      const FileSystemInformation = yield* FileSystemInformationService;
      const IPC = yield* IPCService;
      const Stat = /* @__PURE__ */ __name((uri) => Effect.gen(function* () {
        const UriDTO = uri.toJSON();
        const StatDTO = yield* IPC.SendRequest("$stat", [
          UriDTO
        ]);
        return {
          type: StatDTO.type,
          ctime: StatDTO.ctime,
          mtime: StatDTO.mtime,
          size: StatDTO.size,
          permissions: StatDTO.permissions
        };
      }).pipe(Effect.mapError((cause) => new Error(String(cause)))), "Stat");
      const ServiceImplementation = {
        stat: /* @__PURE__ */ __name((uri) => Effect.runPromise(Stat(uri)), "stat"),
        readDirectory: /* @__PURE__ */ __name((uri) => Promise.reject(
          new VSCodeFileSystemError(
            `readDirectory not implemented for ${uri}`
          )
        ), "readDirectory"),
        createDirectory: /* @__PURE__ */ __name((uri) => Promise.reject(
          new VSCodeFileSystemError(
            `createDirectory not implemented for ${uri}`
          )
        ), "createDirectory"),
        readFile: /* @__PURE__ */ __name((uri) => Promise.reject(
          new VSCodeFileSystemError(
            `readFile not implemented for ${uri}`
          )
        ), "readFile"),
        writeFile: /* @__PURE__ */ __name((uri, _Content) => Promise.reject(
          new VSCodeFileSystemError(
            `writeFile not implemented for ${uri}`
          )
        ), "writeFile"),
        delete: /* @__PURE__ */ __name((uri, _Options) => Promise.reject(
          new VSCodeFileSystemError(
            `delete not implemented for ${uri}`
          )
        ), "delete"),
        rename: /* @__PURE__ */ __name((source, _Target, _Options) => Promise.reject(
          new VSCodeFileSystemError(
            `rename not implemented for ${source}`
          )
        ), "rename"),
        copy: /* @__PURE__ */ __name((source, _Target, _Options) => Promise.reject(
          new VSCodeFileSystemError(
            `copy not implemented for ${source}`
          )
        ), "copy"),
        isWritableFileSystem: /* @__PURE__ */ __name((scheme) => FileSystemInformation.IsWritableFileSystem(scheme), "isWritableFileSystem"),
        onDidChangeFile: FileSystemInformation.onDidChangeFile
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "FileSystemService");
  }
}
export {
  FileSystemService
};
//# sourceMappingURL=FileSystem.js.map
