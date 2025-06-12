var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcProvider } from "../Service/Ipc/mod.js";
const HandleExceptions = Effect.gen(function* (_) {
  if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
    yield* _(
      Effect.logTrace(
        "Skipping global exception handler setup; will be handled by RPC protocol."
      )
    );
    return;
  }
  const Ipc = yield* _(IpcProvider.Tag);
  const LogErrorEffect = /* @__PURE__ */ __name((Type, ErrorValue) => {
    const Message = ErrorValue instanceof Error ? ErrorValue.stack || ErrorValue.message : String(ErrorValue);
    const LogPayload = {
      type: "__$error",
      severity: "error",
      arguments: `[${Type}] ${Message}`
    };
    return Ipc.SendNotification("$log", [LogPayload]).pipe(
      Effect.catchAll(
        (error) => (
          // Fallback to console if IPC fails
          Effect.sync(
            () => console.error(
              `[HandleExceptions] Failed to send error to host: ${error}`,
              LogPayload
            )
          )
        )
      )
    );
  }, "LogErrorEffect");
  process.on("uncaughtException", (err) => {
    Effect.runFork(LogErrorEffect("uncaughtException", err));
  });
  process.on("unhandledRejection", (reason) => {
    Effect.runFork(LogErrorEffect("unhandledRejection", reason));
  });
  yield* _(Effect.logTrace("Global exception handlers installed."));
});
export {
  HandleExceptions
};
//# sourceMappingURL=HandleExceptions.js.map
