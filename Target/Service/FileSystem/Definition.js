var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  FileSystemError as VscFileSystemError
} from "vscode";
import URIConverter from "../../TypeConverter/Main/URI.js";
import FileSystemInformationService from "../FileSystemInformation/Service.js";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const FsInfo = yield* G(FileSystemInformationService);
  const IPC = yield* G(IPCService);
  const StatEffect = /* @__PURE__ */ __name((uri) => Effect.gen(function* (G2) {
    const UriDTO = URIConverter.FromAPI(uri);
    const StatDTO = yield* G2(IPC.SendRequest("$stat", [UriDTO]));
    const FileStat = {
      type: StatDTO.type,
      ctime: StatDTO.ctime,
      mtime: StatDTO.mtime,
      size: StatDTO.size,
      permissions: StatDTO.permissions
    };
    return FileStat;
  }).pipe(Effect.mapError((cause) => new Error(String(cause)))), "StatEffect");
  const ServiceImplementation = {
    stat: /* @__PURE__ */ __name((uri) => Effect.runPromise(StatEffect(uri)), "stat"),
    readDirectory: /* @__PURE__ */ __name((uri) => Promise.reject(
      new VscFileSystemError(
        `readDirectory not implemented for ${uri}`
      )
    ), "readDirectory"),
    createDirectory: /* @__PURE__ */ __name((uri) => Promise.reject(
      new VscFileSystemError(
        `createDirectory not implemented for ${uri}`
      )
    ), "createDirectory"),
    readFile: /* @__PURE__ */ __name((uri) => Promise.reject(
      new VscFileSystemError(`readFile not implemented for ${uri}`)
    ), "readFile"),
    writeFile: /* @__PURE__ */ __name((uri, _Content) => Promise.reject(
      new VscFileSystemError(`writeFile not implemented for ${uri}`)
    ), "writeFile"),
    delete: /* @__PURE__ */ __name((uri, _Options) => Promise.reject(
      new VscFileSystemError(`delete not implemented for ${uri}`)
    ), "delete"),
    rename: /* @__PURE__ */ __name((source, _Target, _Options) => Promise.reject(
      new VscFileSystemError(`rename not implemented for ${source}`)
    ), "rename"),
    copy: /* @__PURE__ */ __name((source, _Target, _Options) => Promise.reject(
      new VscFileSystemError(`copy not implemented for ${source}`)
    ), "copy"),
    isWritableFileSystem: /* @__PURE__ */ __name((scheme) => {
      return FsInfo.isWritableFileSystem(scheme);
    }, "isWritableFileSystem"),
    onDidChangeFile: FsInfo.onDidChangeFile
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
