var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FileSystemInformation } from "../FileSystemInformation.js";
import { CreateStatEffect } from "./CreateStatEffect.js";
const Definition = Effect.gen(function* (_) {
  const FsInfo = yield* _(FileSystemInformation.Tag);
  const ServiceImplementation = {
    // Each method builds and runs the corresponding Effect.
    stat: /* @__PURE__ */ __name((uri) => Effect.runPromise(CreateStatEffect(uri)), "stat"),
    readDirectory: /* @__PURE__ */ __name((uri) => Promise.reject(new Error("readDirectory not implemented")), "readDirectory"),
    createDirectory: /* @__PURE__ */ __name((uri) => Promise.reject(new Error("createDirectory not implemented")), "createDirectory"),
    readFile: /* @__PURE__ */ __name((uri) => Promise.reject(new Error("readFile not implemented")), "readFile"),
    writeFile: /* @__PURE__ */ __name((uri, content) => Promise.reject(new Error("writeFile not implemented")), "writeFile"),
    delete: /* @__PURE__ */ __name((uri, options) => Promise.reject(new Error("delete not implemented")), "delete"),
    rename: /* @__PURE__ */ __name((source, target, options) => Promise.reject(new Error("rename not implemented")), "rename"),
    copy: /* @__PURE__ */ __name((source, target, options) => Promise.reject(new Error("copy not implemented")), "copy"),
    isWritableFileSystem: FsInfo.isWritableFileSystem,
    onDidChangeFile: FsInfo.onDidChangeFile
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
