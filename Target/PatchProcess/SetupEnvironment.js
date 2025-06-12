var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ProcessPatchError } from "./Error/mod.js";
const SetVscodeCwd = Effect.if(
  Effect.sync(() => typeof process.env["VSCODE_CWD"] !== "string"),
  {
    onTrue: Effect.sync(() => {
      process.env["VSCODE_CWD"] = process.cwd();
    }).pipe(
      Effect.tap(
        () => Effect.logTrace(
          "VSCODE_CWD environment variable set to current process cwd."
        )
      )
    ),
    onFalse: Effect.logTrace(
      "VSCODE_CWD environment variable already set, skipping."
    )
  }
);
const ChangeWorkingDirectoryOnWindows = Effect.if(
  process.platform === "win32" && !!process.env["MOUNTAIN_APP_ROOT"],
  {
    onTrue: Effect.try({
      try: /* @__PURE__ */ __name(() => {
        const AppRoot = process.env["MOUNTAIN_APP_ROOT"];
        process.chdir(AppRoot);
        return AppRoot;
      }, "try"),
      catch: /* @__PURE__ */ __name((cause) => new ProcessPatchError({
        context: "ChangeWorkingDirectory",
        cause
      }), "catch")
    }).pipe(
      Effect.flatMap(
        (AppRoot) => Effect.logDebug(
          `Changed current working directory to '${AppRoot}' on Windows.`
        )
      )
    ),
    onFalse: Effect.unit
  }
);
const SetupEnvironment = Effect.all(
  [SetVscodeCwd, ChangeWorkingDirectoryOnWindows],
  { discard: true }
);
export {
  SetupEnvironment
};
//# sourceMappingURL=SetupEnvironment.js.map
