var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { FileSystem } from "../../FileSystem/mod.js";
import { Log } from "../../Log.js";
const EnsureDirectory = /* @__PURE__ */ __name((DirectoryUri, ScopeName) => Effect.if(DirectoryUri, {
  onTrue: /* @__PURE__ */ __name((Uri) => Effect.gen(function* (_) {
    const Fs = yield* _(FileSystem.Tag);
    yield* _(
      Effect.tryPromise(() => Fs.createDirectory(Uri)),
      Effect.catchAll(
        (Error2) => Log.Error(
          `Failed to ensure ${ScopeName} storage directory exists at ${Uri.toString()}`,
          Error2
        )
      )
    );
  }).pipe(
    Effect.tap(
      () => Log.Trace(
        `${ScopeName} storage directory ensured at: ${Uri.fsPath}`
      )
    )
  ), "onTrue"),
  onFalse: Effect.unit
}), "EnsureDirectory");
export {
  EnsureDirectory
};
//# sourceMappingURL=EnsureDirectory.js.map
