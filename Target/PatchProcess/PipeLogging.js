var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import IPCService from "../Service/IPC/Service.js";
const SafeToString = /* @__PURE__ */ __name((Arguments) => {
  const Slices = [];
  for (let i = 0; i < Arguments.length; i++) {
    const Argument = Arguments[i];
    if (typeof Argument === "object") {
      try {
        Slices.push(JSON.stringify(Argument));
      } catch (e) {
        Slices.push(`[Unserializable Object: ${e}]`);
      }
    } else {
      Slices.push(String(Argument));
    }
  }
  return Slices.join(" ");
}, "SafeToString");
const PipeLogging = Effect.gen(function* () {
  if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
    return yield* Effect.logTrace(
      "Console log piping is disabled by environment variable."
    );
  }
  const IPC = yield* IPCService;
  const ForwardConsoleCall = /* @__PURE__ */ __name((Severity, Arguments) => {
    const Payload = {
      type: "__$console",
      severity: Severity,
      arguments: SafeToString(Arguments)
    };
    return IPC.SendNotification("$log", [Payload]);
  }, "ForwardConsoleCall");
  const OriginalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  console.log = (...args) => {
    OriginalConsole.log.apply(console, args);
    Effect.runFork(ForwardConsoleCall("log", args));
  };
  console.warn = (...args) => {
    OriginalConsole.warn.apply(console, args);
    Effect.runFork(ForwardConsoleCall("warn", args));
  };
  console.error = (...args) => {
    OriginalConsole.error.apply(console, args);
    Effect.runFork(ForwardConsoleCall("error", args));
  };
  yield* Effect.logTrace(
    "Global console object patched to pipe logs to host."
  );
});
var PipeLogging_default = PipeLogging;
export {
  PipeLogging_default as default
};
//# sourceMappingURL=PipeLogging.js.map
