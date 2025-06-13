var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IPC } from "../Service/IPC.js";
const HandleException = Effect.gen(function* (_) {
  if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
    yield* _(
      Effect.logTrace(
        "Skipping global exception handler setup; will be handled by RPC protocol."
      )
    );
    return;
  }
  const IPCService = yield* _(IPC.Tag);
  const LogError = /* @__PURE__ */ __name((Type, CaughtError) => {
    const Message = CaughtError instanceof Error ? CaughtError.stack || CaughtError.message : String(CaughtError);
    const Payload = {
      type: "__$error",
      severity: "error",
      arguments: `[${Type}] ${Message}`
    };
    return IPCService.SendNotification("$log", [Payload]).pipe(
      Effect.catchAll(
        (error) => (
          // Fallback to console if IPC fails
          Effect.sync(
            () => console.error(
              `[HandleException] Failed to send error to host: ${error}`,
              Payload
            )
          )
        )
      )
    );
  }, "LogError");
  process.on("uncaughtException", (error) => {
    Effect.runFork(LogError("uncaughtException", error));
  });
  process.on("unhandledRejection", (reason) => {
    Effect.runFork(LogError("unhandledRejection", reason));
  });
  yield* _(Effect.logTrace("Global exception handlers installed."));
});
export {
  HandleException
};
//# sourceMappingURL=HandleException.js.map
