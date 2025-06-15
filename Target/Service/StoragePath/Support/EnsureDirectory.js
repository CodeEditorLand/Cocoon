var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import FileSystemService from "../../FileSystem/Service.js";
import LogService from "../../Log/Service.js";
const EnsureDirectory = /* @__PURE__ */ __name((DirectoryURI, ScopeName) => {
  return Effect.if(DirectoryURI, {
    onTrue: /* @__PURE__ */ __name((URI) => Effect.gen(function* () {
      const Fs = yield* FileSystemService;
      yield* Effect.tryPromise(() => Fs.createDirectory(URI)).pipe(
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
    }).pipe(
      Effect.tap(
        () => LogService.pipe(
          Effect.flatMap(
            (Log) => Log.Trace(
              `${ScopeName} storage directory ensured at: ${URI.fsPath}`
            )
          )
        )
      )
    ), "onTrue"),
    onFalse: /* @__PURE__ */ __name(() => LogService.pipe(
      Effect.flatMap(
        (Log) => Log.Trace(
          `${ScopeName} storage URI is not defined; skipping creation.`
        )
      )
    ), "onFalse")
  });
}, "EnsureDirectory");
var EnsureDirectory_default = EnsureDirectory;
export {
  EnsureDirectory_default as default
};
//# sourceMappingURL=EnsureDirectory.js.map
