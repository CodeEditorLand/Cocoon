var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Archive/PatchProcess/ExitPreventedProblem.ts
var ExitPreventedProblem = class extends Error {
  static {
    __name(this, "ExitPreventedProblem");
  }
  _tag = "ExitPreventedProblem";
  constructor(Message) {
    super(Message ?? "Process exit was prevented");
  }
};
var ExitPreventedProblem_default = ExitPreventedProblem;

// Source/Services/InitData.ts
import { Context, Layer } from "effect";
var InitDataService = class extends Context.Tag("Cocoon/InitData")() {
  static {
    __name(this, "InitDataService");
  }
};
var ResolvedVersion = process.env["ProductVersion"] ?? "1.118.0";
var ResolvedCommit = process.env["ProductCommit"] ?? "dev";
var InitDataLive = Layer.succeed(InitDataService, {
  commit: ResolvedCommit,
  version: ResolvedVersion,
  parentPid: process.pid,
  extensions: [],
  workspace: null,
  environment: {}
});

// Source/PatchProcess/Patcher.ts
import ModuleNS from "node:module";
import { Config, Data, Effect as Effect2 } from "effect";
var Module = ModuleNS;
var ModulePatchProblem = class extends Data.TaggedError("ModulePatchProblem") {
  static {
    __name(this, "ModulePatchProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Failed to patch Node.js module loader: ${this.Context}`;
  }
};
var PatcherService = class extends Effect2.Service()(
  "PatchProcess/PatcherService",
  {
    effect: Effect2.gen(function* () {
      const AllowExit = yield* Config.boolean("AllowExit").pipe(
        Effect2.catchAll(
          (Error2) => Effect2.logWarning(
            "Failed to load Patcher config, using defaults.",
            { Error: Error2 }
          ).pipe(Effect2.as(false))
        )
      );
      const SecurityPolicy2 = yield* Config.string("SecurityPolicy").pipe(
        Effect2.catchTag(
          "MissingConfig",
          () => Effect2.succeed("default")
        ),
        Config.map((Value) => ParseSecurityPolicy(Value))
      );
      return {
        NativeExit: process.exit.bind(process),
        NativeCrash: process.crash,
        AllowExit: /* @__PURE__ */ __name(() => AllowExit, "AllowExit"),
        GetSecurityPolicy: /* @__PURE__ */ __name(() => SecurityPolicy2, "GetSecurityPolicy")
      };
    })
  }
) {
  static {
    __name(this, "PatcherService");
  }
};
var SetElectronRunAsNode = Effect2.sync(() => {
  process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
  Effect2.tap(
    () => Effect2.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable")
  )
);
var SetStackTraceLimit = Effect2.sync(() => {
  Error.stackTraceLimit = 100;
}).pipe(
  Effect2.tap(
    () => Effect2.logTrace("Increased `Error.stackTraceLimit` to 100")
  )
);
var PatchProcessCrash = Effect2.gen(function* () {
  const Service = yield* PatcherService;
  if (Service.NativeCrash) {
    process.crash = () => {
      const PreventionStack = new Error(
        "Stack trace for prevented process.crash()"
      ).stack;
      Effect2.runSync(
        Effect2.logWarning(
          `Call to 'process.crash()' intercepted and PREVENTED by host policy`,
          `Stack: ${PreventionStack ?? "(unavailable)"}`
        )
      );
    };
    yield* Effect2.logTrace("Successfully patched 'process.crash'");
  } else {
    yield* Effect2.logTrace(
      "'process.crash()' not found in environment, skipping patch"
    );
  }
});
var PatchProcessExit = Effect2.gen(function* () {
  const Service = yield* PatcherService;
  process.exit = (Code) => {
    if (Service.AllowExit()) {
      Effect2.runSync(
        Effect2.logInfo(
          `'process.exit(${Code ?? ""})' ALLOWED by host policy`
        )
      );
      return Service.NativeExit(Code);
    }
    const ErrorMessage = `'process.exit(${Code ?? ""})' PREVENTED by host policy`;
    const PreventionError = new ExitPreventedProblem({
      message: ErrorMessage,
      AttemptedCode: Code
    });
    Effect2.runSync(
      Effect2.logWarning("Blocked call to process.exit by host policy")
    );
    throw PreventionError;
  };
  yield* Effect2.logTrace("Successfully patched 'process.exit'");
});
var BlockNativesModule = Effect2.try({
  try: /* @__PURE__ */ __name(() => {
    if (typeof Module._load === "function") {
      const OriginalLoad = Module._load;
      Module._load = function(Request, Parent, IsMain) {
        if (Request === "natives") {
          const ErrorMessage = "Attempt to load deprecated 'natives' module blocked. Not available in Cocoon runtime";
          console.warn(`[Cocoon Patcher] ${ErrorMessage}`);
          throw new Error(ErrorMessage);
        }
        return OriginalLoad.call(this, Request, Parent, IsMain);
      };
    } else {
      console.warn(
        "[Cocoon Patcher] Module._load not found, skipping 'natives' block"
      );
    }
  }, "try"),
  catch: /* @__PURE__ */ __name((Cause) => new ModulePatchProblem({
    Context: "Failed during 'natives' block setup",
    Cause
  }), "catch")
}).pipe(
  Effect2.tap(
    () => Effect2.logTrace("Module._load patched to block 'natives' module")
  )
);
var PipeLogging = Effect2.gen(function* () {
  if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
    return yield* Effect2.logTrace(
      "Console log piping disabled by environment variable"
    );
  }
  yield* Effect2.logTrace(
    "VSCODE_PIPE_LOGGING set but Cocoon pipes console via MountainClient; no patch applied"
  );
});
var HandleException = Effect2.gen(function* () {
  if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
    return yield* Effect2.logTrace(
      "Skipping global exception handler, will be handled by RPC"
    );
  }
  const LogError = /* @__PURE__ */ __name((Type, CaughtError) => {
    const Message = CaughtError instanceof Error ? CaughtError.stack || CaughtError.message : String(CaughtError);
    console.error(`[Patcher] ${Type}: ${Message}`);
  }, "LogError");
  process.on("uncaughtException", (Error2) => {
    LogError("uncaughtException", Error2);
  });
  process.on("unhandledRejection", (Reason) => {
    LogError("unhandledRejection", Reason);
  });
  yield* Effect2.logTrace("Global exception handlers installed");
});
var SetupEnvironment = Effect2.gen(function* () {
  const InitData2 = yield* InitDataService;
  if (InitData2.environment.useHostProxy) {
    yield* Effect2.logInfo(
      "Host proxy enabled. Proxy environment variables inherited"
    );
  }
}).pipe(
  Effect2.tap(() => Effect2.logTrace("Proxy environment variables configured"))
);
var TerminateOnParentExit = Effect2.gen(function* () {
  const ParentPidString = process.env["VSCODE_PID"];
  if (!ParentPidString) {
    return yield* Effect2.logTrace(
      "No VSCODE_PID found, skipping parent exit monitoring"
    );
  }
  const ParentPid = Number.parseInt(ParentPidString, 10);
  if (Number.isNaN(ParentPid)) {
    return yield* Effect2.logWarning(
      `Invalid VSCODE_PID '${ParentPidString}', cannot monitor parent process`
    );
  }
  yield* Effect2.logTrace(`Monitoring parent process ${ParentPid} for exit`);
  const MonitoringLoop = Effect2.gen(function* () {
    while (true) {
      try {
        process.kill(ParentPid, 0);
      } catch (Error2) {
        yield* Effect2.logInfo(
          `Parent process ${ParentPid} no longer running. Exiting gracefully`
        );
        process.exit(0);
      }
      yield* Effect2.sleep("5 seconds");
    }
  }).pipe(Effect2.forkDaemon);
  yield* MonitoringLoop;
});
var EnforceMemoryLimit = Effect2.gen(function* () {
  const Service = yield* PatcherService;
  const Policy = Service.GetSecurityPolicy();
  if (Policy.MaxMemoryMB > 0) {
    void (Policy.MaxMemoryMB * 1024 * 1024);
    yield* Effect2.logDebug(
      `Memory limit configured: ${Policy.MaxMemoryMB}MB`
    );
  } else {
    yield* Effect2.logTrace("No memory limit configured");
  }
});
var RunPatchProcess = Effect2.gen(function* () {
  const AllPatches = [
    PatchProcessCrash,
    PatchProcessExit,
    SetStackTraceLimit,
    SetupEnvironment,
    SetElectronRunAsNode,
    BlockNativesModule,
    PipeLogging,
    HandleException,
    TerminateOnParentExit,
    EnforceMemoryLimit
  ];
  yield* Effect2.all(AllPatches, { discard: true, concurrency: "unbounded" });
}).pipe(
  Effect2.tap(
    () => Effect2.logDebug("All core process patches have been applied")
  ),
  Effect2.catchAll(
    (Error2) => Effect2.logFatal(
      "Critical error during process patching. Environment may be unstable",
      Error2
    )
  ),
  Effect2.provide(PatcherService.Default)
);
function ParseSecurityPolicy(PolicyString) {
  const Parts = PolicyString.split(",");
  const Policy = {
    AllowExit: false,
    MaxMemoryMB: 0,
    AllowNetwork: false,
    AllowChildProcesses: false
  };
  for (const Part of Parts) {
    const [Key, Value] = Part.split("=");
    switch (Key.trim()) {
      case "AllowExit":
        Policy.AllowExit = Value === "true";
        break;
      case "MaxMemoryMB":
        Policy.MaxMemoryMB = Number.parseInt(Value, 10) || 0;
        break;
      case "AllowNetwork":
        Policy.AllowNetwork = Value === "true";
        break;
      case "AllowChildProcesses":
        Policy.AllowChildProcesses = Value === "true";
        break;
    }
  }
  return Policy;
}
__name(ParseSecurityPolicy, "ParseSecurityPolicy");
var ReloadSecurityPolicy = Effect2.gen(function* () {
  yield* Effect2.logInfo("Reloading security policy...");
  const NewPolicyString = yield* Config.string("SecurityPolicy").pipe(
    Effect2.catchTag("MissingConfig", () => Effect2.succeed("default"))
  );
  const NewPolicy = ParseSecurityPolicy(NewPolicyString);
  yield* Effect2.logDebug("Security policy reloaded", { NewPolicy });
  return NewPolicy;
});
export {
  PatcherService,
  ReloadSecurityPolicy,
  RunPatchProcess
};
//# sourceMappingURL=Patcher.js.map
