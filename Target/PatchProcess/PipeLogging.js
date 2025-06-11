var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IpcProvider } from "../Service/Ipc/mod.js";
const SafeToString = /* @__PURE__ */ __name((Args) => {
  const Slices = [];
  for (let i = 0; i < Args.length; i++) {
    const Arg = Args[i];
    if (typeof Arg === "object") {
      try {
        Slices.push(JSON.stringify(Arg));
      } catch (e) {
        Slices.push(`[Unserializable Object: ${e}]`);
      }
    } else {
      Slices.push(String(Arg));
    }
  }
  return Slices.join(" ");
}, "SafeToString");
const PipeLoggingToParent = Effect.gen(function* (_) {
  if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
    yield* _(
      Effect.logTrace(
        "Console log piping is disabled by environment variable."
      )
    );
    return;
  }
  const Ipc = yield* _(IpcProvider.Tag);
  const ForwardConsoleCallEffect = /* @__PURE__ */ __name((Severity, Args) => {
    const Payload = {
      type: "__$console",
      severity: Severity,
      arguments: SafeToString(Args)
    };
    return Ipc.SendNotification("$log", [Payload]);
  }, "ForwardConsoleCallEffect");
  const OriginalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  console.log = (...args) => {
    OriginalConsole.log.apply(console, args);
    Effect.runFork(ForwardConsoleCallEffect("log", args));
  };
  console.warn = (...args) => {
    OriginalConsole.warn.apply(console, args);
    Effect.runFork(ForwardConsoleCallEffect("warn", args));
  };
  console.error = (...args) => {
    OriginalConsole.error.apply(console, args);
    Effect.runFork(ForwardConsoleCallEffect("error", args));
  };
  yield* _(
    Effect.logTrace("Global console object patched to pipe logs to host.")
  );
});
export {
  PipeLoggingToParent
};
//# sourceMappingURL=PipeLogging.js.map
