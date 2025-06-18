var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import FileSystemService from "../../FileSystem/Service.js";
import LogService from "../../Log/Service.js";
const EnsureDirectory = /* @__PURE__ */ __name((DirectoryURI, ScopeName) => {
  return Effect.if(DirectoryURI !== void 0, {
    // If the URI is defined, ensure the directory exists.
    onTrue: /* @__PURE__ */ __name(() => Effect.gen(function* () {
      const URI = DirectoryURI;
      const Fs = yield* FileSystemService;
      yield* Effect.tryPromise(() => Fs.createDirectory(URI)).pipe(
        // If creation fails, log the error.
        Effect.catchAll(
          (Error2) => LogService.pipe(
            Effect.flatMap(
              (Log) => Log.Error(
                `Failed to ensure ${ScopeName} storage directory exists at ${URI.toString()}`,
                Error2
              )
            )
          )
        )
      );
      yield* LogService.pipe(
        Effect.flatMap(
          (Log) => Log.Trace(
            `${ScopeName} storage directory ensured at: ${URI.fsPath}`
          )
        )
      );
      return true;
    }), "onTrue"),
    // If the URI is not defined, log a trace message and return false.
    onFalse: /* @__PURE__ */ __name(() => LogService.pipe(
      Effect.flatMap(
        (Log) => Log.Trace(
          `${ScopeName} storage URI is not defined; skipping creation.`
        )
      ),
      Effect.as(false)
    ), "onFalse")
  });
}, "EnsureDirectory");
var EnsureDirectory_default = EnsureDirectory;
export {
  EnsureDirectory_default as default
};
//# sourceMappingURL=EnsureDirectory.js.map
