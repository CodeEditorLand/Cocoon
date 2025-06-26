var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Module from "node:module";
import { Config, Effect } from "effect";
import { Data } from "effect";
import { IPCService } from "./IPC.js";
import { InitDataService } from "./InitData.js";
import { ExitPreventedProblem } from "./PatchProcess/ExitPreventedProblem.js";
class PatchProcessService extends Effect.Service()(
  "Service/PatchProcess",
  {
    effect: Effect.gen(function* () {
      const AllowExit = yield* Config.boolean("AllowExit").pipe(
        Effect.catchAll(
          (Error2) => Effect.log(
            "Failed to load PatchProcess config, using defaults.",
            { Error: Error2, LogLevel: "Warning" }
          ).pipe(
            Effect.as(false)
            // Default to not allowing exit on error.
          )
        )
      );
      return {
        NativeExit: process.exit.bind(process),
        // FIX: Added NativeCrash to the service implementation.
        NativeCrash: process.crash,
        AllowExit: /* @__PURE__ */ __name(() => AllowExit, "AllowExit")
      };
    })
  }
) {
  static {
    __name(this, "PatchProcessService");
  }
}
const SetElectronRunAsNode = Effect.sync(() => {
  process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable.")
  )
);
const SetStackTraceLimit = Effect.sync(() => {
  Error.stackTraceLimit = 100;
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Increased `Error.stackTraceLimit` to 100.")
  )
);
const PatchProcessCrash = Effect.gen(function* () {
  const Service = yield* PatchProcessService;
  if (Service.NativeCrash) {
    process.crash = () => {
      const PreventionStack = new Error(
        "Stack trace for prevented process.crash()"
      ).stack;
      Effect.runSync(
        Effect.logWarning(
          `A call to 'process.crash()' was intercepted and PREVENTED by host policy.`,
          `Call stack for prevented crash:
${PreventionStack ?? "(Stack trace unavailable)"}`
        )
      );
    };
    yield* Effect.logTrace("Successfully patched 'process.crash'.");
  } else {
    yield* Effect.logTrace(
      "'process.crash()' not found in this environment, skipping patch."
    );
  }
});
const PatchProcessExit = Effect.gen(function* () {
  const Service = yield* PatchProcessService;
  process.exit = (Code) => {
    if (Service.AllowExit()) {
      Effect.runSync(
        Effect.logInfo(
          `'process.exit(${Code ?? ""})' was called and ALLOWED by host policy. Terminating.`
        )
      );
      return Service.NativeExit(Code);
    }
    const ErrorMessage = `'process.exit(${Code ?? ""})' was called but PREVENTED by host policy.`;
    const PreventionError = new ExitPreventedProblem({
      message: ErrorMessage,
      AttemptedCode: Code
    });
    Effect.runSync(
      Effect.logWarning(
        "Blocked call to process.exit by host policy.",
        PreventionError
      )
    );
    throw PreventionError;
  };
  yield* Effect.logTrace("Successfully patched 'process.exit'.");
});
class ModulePatchProblem extends Data.TaggedError("ModulePatchProblem") {
  static {
    __name(this, "ModulePatchProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to patch Node.js module loader: ${this.Context}`;
  }
}
const BlockNativesModule = Effect.try({
  try: /* @__PURE__ */ __name(() => {
    if (typeof Module._load === "function") {
      const OriginalLoad = Module._load;
      Module._load = function(Request, Parent, IsMain) {
        if (Request === "natives") {
          const ErrorMessage = "Attempt to load deprecated 'natives' module blocked. This module is not available in the Cocoon runtime.";
          console.warn(`[Cocoon PatchProcess] ${ErrorMessage}`);
          throw new Error(ErrorMessage);
        }
        return OriginalLoad.call(this, Request, Parent, IsMain);
      };
    } else {
      console.warn(
        "[Cocoon PatchProcess] Module._load not found. Skipping 'natives' block patch."
      );
    }
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new ModulePatchProblem({
    Context: "Failed during 'natives' block setup.",
    Cause
  }), "catch")
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Module._load patched to block 'natives' module.")
  )
);
const SafeToString = /* @__PURE__ */ __name((Arguments) => {
  const Slices = [];
  for (let i = 0; i < Arguments.length; i++) {
    const Argument = Arguments[i];
    Slices.push(
      typeof Argument === "object" ? JSON.stringify(Argument, null, 2) : String(Argument)
    );
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
        (ErrorValue) => Effect.sync(
          () => console.error(
            `[HandleException] FATAL: Failed to send error to host: ${ErrorValue}`,
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
  yield* Effect.logTrace("Global exception handlers installed.");
});
const SetupEnvironment = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  if (InitData.environment.useHostProxy) {
    yield* Effect.logInfo(
      "Host proxy is enabled. Assuming proxy environment variables are inherited."
    );
  }
}).pipe(
  Effect.tap(
    () => Effect.logTrace("Proxy environment variables configured.")
  )
);
const TerminateOnParentExit = Effect.gen(function* () {
  const ParentPidString = process.env["VSCODE_PID"];
  if (!ParentPidString) {
    return yield* Effect.logTrace(
      "No `VSCODE_PID` found, skipping parent exit monitoring."
    );
  }
  const ParentPid = Number.parseInt(ParentPidString, 10);
  if (Number.isNaN(ParentPid)) {
    return yield* Effect.logWarning(
      `Invalid VSCODE_PID '${ParentPidString}', cannot monitor parent process.`
    );
  }
  yield* Effect.logTrace(`Monitoring parent process ${ParentPid} for exit.`);
  const MonitoringLoop = Effect.gen(function* () {
    while (true) {
      try {
        process.kill(ParentPid, 0);
      } catch (Error2) {
        yield* Effect.logInfo(
          `Parent process ${ParentPid} is no longer running. Exiting Cocoon gracefully.`
        );
        process.exit(0);
      }
      yield* Effect.sleep("5 seconds");
    }
  }).pipe(Effect.forkDaemon);
  yield* MonitoringLoop;
});
const RunPatchProcess = Effect.gen(function* () {
  const AllPatches = [
    PatchProcessCrash,
    PatchProcessExit,
    SetStackTraceLimit,
    SetupEnvironment,
    SetElectronRunAsNode,
    BlockNativesModule,
    PipeLogging,
    HandleException,
    TerminateOnParentExit
  ];
  yield* Effect.all(AllPatches, { discard: true, concurrency: "unbounded" });
}).pipe(
  Effect.tap(
    () => Effect.logDebug("All core process patches have been applied.")
  ),
  Effect.catchAll(
    (Error2) => Effect.logFatal(
      "A critical error occurred during the bootstrap process patching. The environment may be unstable.",
      Error2
    )
  ),
  Effect.provide(PatchProcessService.Default)
);
export {
  PatchProcessService,
  RunPatchProcess
};
//# sourceMappingURL=PatchProcess.js.map
