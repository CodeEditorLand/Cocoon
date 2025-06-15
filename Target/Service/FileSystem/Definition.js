var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FileSystemError as VscFileSystemError } from "vscode";
import FileSystemInformationService from "../FileSystemInformation/Service.js";
import CreateStatEffect from "./CreateStatEffect.js";
var Definition_default = Effect.gen(function* () {
  const FsInfo = yield* FileSystemInformationService;
  const FileSystemImplementation = {
    stat: /* @__PURE__ */ __name((Uri) => Effect.runPromise(CreateStatEffect(Uri)), "stat"),
    readDirectory: /* @__PURE__ */ __name((Uri) => Promise.reject(
      new VscFileSystemError(
        `readDirectory not implemented for ${Uri}`
      )
    ), "readDirectory"),
    createDirectory: /* @__PURE__ */ __name((Uri) => Promise.reject(
      new VscFileSystemError(
        `createDirectory not implemented for ${Uri}`
      )
    ), "createDirectory"),
    readFile: /* @__PURE__ */ __name((Uri) => Promise.reject(
      new VscFileSystemError(`readFile not implemented for ${Uri}`)
    ), "readFile"),
    writeFile: /* @__PURE__ */ __name((_Uri, _Content, _Options) => Promise.reject(
      new VscFileSystemError(`writeFile not implemented for ${_Uri}`)
    ), "writeFile"),
    delete: /* @__PURE__ */ __name((Uri, _Options) => Promise.reject(
      new VscFileSystemError(`delete not implemented for ${Uri}`)
    ), "delete"),
    rename: /* @__PURE__ */ __name((Source, _Target, _Options) => Promise.reject(
      new VscFileSystemError(`rename not implemented for ${Source}`)
    ), "rename"),
    copy: /* @__PURE__ */ __name((Source, _Target, _Options) => Promise.reject(
      new VscFileSystemError(`copy not implemented for ${Source}`)
    ), "copy"),
    isWritableFileSystem: FsInfo.isWritableFileSystem,
    onDidChangeFile: FsInfo.onDidChangeFile
  };
  return FileSystemImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
