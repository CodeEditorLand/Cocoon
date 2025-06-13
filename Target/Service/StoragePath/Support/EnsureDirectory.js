var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FileSystem } from "../../FileSystem.js";
import { Log } from "../../Log.js";
function EnsureDirectory(DirectoryURI, ScopeName) {
  return Effect.if(DirectoryURI, {
    onTrue: /* @__PURE__ */ __name((URI) => Effect.gen(function* (_) {
      const FsService = yield* _(FileSystem.Tag);
      yield* _(
        Effect.tryPromise(() => FsService.createDirectory(URI)),
        Effect.catchAll(
          (Error2) => Log.Error(
            `Failed to ensure ${ScopeName} storage directory exists at ${URI.toString()}`,
            Error2
          )
        )
      );
    }).pipe(
      Effect.tap(
        () => Log.Trace(
          `${ScopeName} storage directory ensured at: ${URI.fsPath}`
        )
      )
    ), "onTrue"),
    onFalse: Effect.logTrace(
      `${ScopeName} storage URI is not defined; skipping creation.`
    )
  });
}
__name(EnsureDirectory, "EnsureDirectory");
export {
  EnsureDirectory
};
//# sourceMappingURL=EnsureDirectory.js.map
