var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../Service/IPC/Service.js";
const HandleExceptionEffect = Effect.gen(function* (G) {
  if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
    return yield* G(
      Effect.logTrace(
        "Skipping global exception handler setup; will be handled by RPC protocol."
      )
    );
  }
  const IPC = yield* G(IPCService);
  const LogError = /* @__PURE__ */ __name((Type, CaughtError) => {
    const Message = CaughtError instanceof Error ? CaughtError.stack || CaughtError.message : String(CaughtError);
    const Payload = {
      type: "__$error",
      severity: "error",
      arguments: `[${Type}] ${Message}`
    };
    return IPC.SendNotification("$log", [Payload]).pipe(
      Effect.catchAll(
        (ErrorValue) => Effect.sync(
          () => console.error(
            `[HandleException] Failed to send error to host: ${ErrorValue}`,
            Payload
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
  yield* G(Effect.logTrace("Global exception handlers installed."));
});
var HandleException_default = HandleExceptionEffect;
export {
  HandleException_default as default
};
//# sourceMappingURL=HandleException.js.map
