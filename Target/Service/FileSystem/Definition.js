var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FileSystemInfoProvider } from "../FileSystemInfo/mod.js";
import { CreateStatEffect } from "./CreateStatEffect.js";
const Definition = Effect.gen(function* (_) {
  const FsInfo = yield* _(FileSystemInfoProvider.Tag);
  const ServiceImplementation = {
    // Each method builds and runs the corresponding Effect.
    stat: /* @__PURE__ */ __name((uri) => Effect.runPromise(CreateStatEffect(uri)), "stat"),
    // ... readFile, writeFile, delete, rename, copy, createDirectory ...
    // ... would all be implemented by calling their respective Effect creators ...
    // These are delegated from the FileSystemInfoProvider
    isWritableFileSystem: FsInfo.isWritableFileSystem,
    onDidChangeFile: FsInfo.onDidChangeFile
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
