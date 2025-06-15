var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../Service/IPC/Service.js";
const HandleException = Effect.gen(function* () {
  if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
    return yield* Effect.logTrace(
      "Skipping global exception handler setup; will be handled by RPC protocol."
    );
  }
  const IPC = yield* IPCService;
  const LogError = /* @__PURE__ */ __name((Type, CaughtError) => {
    const Message = CaughtError instanceof Error ? CaughtError.stack || CaughtError.message : String(CaughtError);
    const Payload = {
      type: "__$error",
      severity: "error",
      arguments: `[${Type}] ${Message}`
    };
    return IPC.SendNotification("$log", [Payload]).pipe(
      Effect.catchAll(
        (Error2) => (
          // Fallback to console if IPC fails
          Effect.sync(
            () => console.error(
              `[HandleException] Failed to send error to host: ${Error2}`,
              Payload
            )
          )
        )
      )
    );
  }, "LogError");
  process.on("uncaughtException", (Error2) => {
    Effect.runFork(LogError("uncaughtException", Error2));
  });
  process.on("unhandledRejection", (Reason) => {
    Effect.runFork(LogError("unhandledRejection", Reason));
  });
  yield* Effect.logTrace("Global exception handlers installed.");
});
var HandleException_default = HandleException;
export {
  HandleException_default as default
};
//# sourceMappingURL=HandleException.js.map
