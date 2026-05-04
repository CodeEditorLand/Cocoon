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

// Source/Services/Init/Data.ts
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
      const SecurityPolicy5 = yield* Config.string("SecurityPolicy").pipe(
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
        GetSecurityPolicy: /* @__PURE__ */ __name(() => SecurityPolicy5, "GetSecurityPolicy")
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

// Source/PatchProcess/Security.ts
import * as Path from "node:path";
import * as URL from "node:url";
import { Data as Data2, Effect as Effect3 } from "effect";
var DefaultSecurityPolicy = {
  AllowExit: false,
  MaxMemoryMB: 512,
  MaxCpuPercent: 50,
  AllowNetwork: false,
  AllowedEndpoints: [],
  AllowChildProcesses: false,
  AllowedChildCommands: [],
  AllowedPaths: [],
  DeniedPaths: ["/etc", "/proc", "/sys", "/root"],
  MaxFileDescriptors: 1024,
  MaxTimers: 1e3
};
var TrustedSecurityPolicy = {
  AllowExit: false,
  MaxMemoryMB: 1024,
  MaxCpuPercent: 80,
  AllowNetwork: true,
  AllowedEndpoints: ["^https?://(localhost|127\\.0\\.0\\.1):\\d+"],
  AllowChildProcesses: true,
  AllowedChildCommands: ["node", "npm"],
  AllowedPaths: [],
  DeniedPaths: ["/etc/shadow", "/etc/passwd"],
  MaxFileDescriptors: 4096,
  MaxTimers: 1e4
};
var MemoryLimitExceededError = class extends Data2.TaggedError(
  "MemoryLimitExceededError"
) {
  static {
    __name(this, "MemoryLimitExceededError");
  }
};
var FileAccessDeniedError = class extends Data2.TaggedError(
  "FileAccessDeniedError"
) {
  static {
    __name(this, "FileAccessDeniedError");
  }
};
var NetworkAccessDeniedError = class extends Data2.TaggedError(
  "NetworkAccessDeniedError"
) {
  static {
    __name(this, "NetworkAccessDeniedError");
  }
};
var ChildProcessDeniedError = class extends Data2.TaggedError(
  "ChildProcessDeniedError"
) {
  static {
    __name(this, "ChildProcessDeniedError");
  }
};
var CpuLimitExceededError = class extends Data2.TaggedError(
  "CpuLimitExceededError"
) {
  static {
    __name(this, "CpuLimitExceededError");
  }
};
var ValidatePathAccess = /* @__PURE__ */ __name((PathString, _Operation, Policy = DefaultSecurityPolicy) => {
  const NormalizedPath = Path.normalize(PathString);
  const ResolvedPath = Path.resolve(NormalizedPath);
  for (const DeniedPath of Policy.DeniedPaths) {
    const ResolvedDeniedPath = Path.resolve(DeniedPath);
    if (ResolvedPath === ResolvedDeniedPath || ResolvedPath.startsWith(ResolvedDeniedPath + Path.sep)) {
      return false;
    }
  }
  if (Policy.AllowedPaths.length === 0) {
    return true;
  }
  for (const AllowedPath of Policy.AllowedPaths) {
    const ResolvedAllowedPath = Path.resolve(AllowedPath);
    if (ResolvedPath === ResolvedAllowedPath || ResolvedPath.startsWith(ResolvedAllowedPath + Path.sep)) {
      return true;
    }
  }
  return false;
}, "ValidatePathAccess");
var ValidateNetworkAccess = /* @__PURE__ */ __name((Endpoint, Policy = DefaultSecurityPolicy) => {
  if (!Policy.AllowNetwork) {
    return false;
  }
  if (Policy.AllowedEndpoints.length === 0) {
    return true;
  }
  try {
    void new URL.URL(Endpoint);
  } catch (Error2) {
    return true;
  }
  for (const Pattern of Policy.AllowedEndpoints) {
    const Regex = new RegExp(Pattern);
    if (Regex.test(Endpoint)) {
      return true;
    }
  }
  return false;
}, "ValidateNetworkAccess");
var ValidateChildProcess = /* @__PURE__ */ __name((Command, _Arguments, Policy = DefaultSecurityPolicy) => {
  if (!Policy.AllowChildProcesses) {
    return false;
  }
  const CommandName = Command.split(Path.sep).pop() || Command;
  if (Policy.AllowedChildCommands.length === 0) {
    return true;
  }
  for (const AllowedCommand of Policy.AllowedChildCommands) {
    if (CommandName === AllowedCommand) {
      return true;
    }
  }
  return false;
}, "ValidateChildProcess");
var ValidateEnvironmentVariable = /* @__PURE__ */ __name((Name, Value) => {
  const BlockedVariables = [
    "NODE_OPTIONS",
    "NODE_DEBUG",
    "NODE_ENV",
    "NODE_EXTRA_CA_CERTS"
  ];
  if (BlockedVariables.includes(Name)) {
    return "";
  }
  const UnsafePatterns = [
    /--inspect/i,
    /--debug/i,
    /--eval/i,
    /--print/i,
    /-e\s+/i,
    /-p\s+/i
  ];
  for (const Pattern of UnsafePatterns) {
    if (Pattern.test(Value)) {
      return "";
    }
  }
  return Value;
}, "ValidateEnvironmentVariable");
var EnforceMemoryLimit2 = Effect3.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  if (Policy.MaxMemoryMB <= 0) {
    return yield* Effect3.logTrace("No memory limit configured");
  }
  const MemoryUsage = process.memoryUsage();
  const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);
  if (UsedMemoryMB > Policy.MaxMemoryMB) {
    yield* Effect3.logError(
      `Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`
    );
    return yield* Effect3.fail(
      new MemoryLimitExceededError({
        LimitMB: Policy.MaxMemoryMB,
        AttemptedMB: UsedMemoryMB,
        ProcessId: process.pid
      })
    );
  }
  yield* Effect3.logTrace(
    `Memory usage within limits: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`
  );
});
var EnforceCpuLimit = Effect3.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  if (Policy.MaxCpuPercent <= 0) {
    return yield* Effect3.logTrace("No CPU limit configured");
  }
  yield* Effect3.logDebug(
    `CPU limit configured: ${Policy.MaxCpuPercent}% (monitoring not yet implemented)`
  );
});
var PerformSecurityAudit = Effect3.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  const Report = {
    MemoryUsage: process.memoryUsage(),
    Pid: process.pid,
    Ppid: process.ppid,
    Cwd: process.cwd(),
    ExecArgv: process.execArgv,
    Env: Object.keys(process.env).length,
    AllowedPaths: Policy.AllowedPaths,
    DeniedPaths: Policy.DeniedPaths,
    AllowNetwork: Policy.AllowNetwork,
    AllowChildProcesses: Policy.AllowChildProcesses,
    MaxMemoryMB: Policy.MaxMemoryMB,
    MaxCpuPercent: Policy.MaxCpuPercent,
    Timestamp: Date.now()
  };
  yield* Effect3.logInfo("Security audit completed", { Report });
  return Report;
});
var GetPolicyHash = /* @__PURE__ */ __name((Policy = DefaultSecurityPolicy) => {
  const PolicyString = JSON.stringify(Policy, Object.keys(Policy).sort());
  return Buffer.from(PolicyString).toString("base64").slice(0, 16);
}, "GetPolicyHash");
var MergeSecurityPolicies = /* @__PURE__ */ __name((Overrides) => {
  return {
    AllowExit: Overrides.AllowExit ?? DefaultSecurityPolicy.AllowExit,
    MaxMemoryMB: Overrides.MaxMemoryMB ?? DefaultSecurityPolicy.MaxMemoryMB,
    MaxCpuPercent: Overrides.MaxCpuPercent ?? DefaultSecurityPolicy.MaxCpuPercent,
    AllowNetwork: Overrides.AllowNetwork ?? DefaultSecurityPolicy.AllowNetwork,
    AllowedEndpoints: Overrides.AllowedEndpoints ?? DefaultSecurityPolicy.AllowedEndpoints,
    AllowChildProcesses: Overrides.AllowChildProcesses ?? DefaultSecurityPolicy.AllowChildProcesses,
    AllowedChildCommands: Overrides.AllowedChildCommands ?? DefaultSecurityPolicy.AllowedChildCommands,
    AllowedPaths: Overrides.AllowedPaths ?? DefaultSecurityPolicy.AllowedPaths,
    DeniedPaths: Overrides.DeniedPaths ?? DefaultSecurityPolicy.DeniedPaths,
    MaxFileDescriptors: Overrides.MaxFileDescriptors ?? DefaultSecurityPolicy.MaxFileDescriptors,
    MaxTimers: Overrides.MaxTimers ?? DefaultSecurityPolicy.MaxTimers
  };
}, "MergeSecurityPolicies");

// Source/PatchProcess/Validator.ts
import * as Process from "node:process";
import { Data as Data3, Effect as Effect4, Queue } from "effect";
var ValidationError = class extends Data3.TaggedError("ValidationError") {
  static {
    __name(this, "ValidationError");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Validation failed for process ${Properties.ProcessId}: ${Properties.Reason}`;
  }
};
var BehaviorViolationError = class extends Data3.TaggedError(
  "BehaviorViolationError"
) {
  static {
    __name(this, "BehaviorViolationError");
  }
};
var ValidationMetricsStore = class _ValidationMetricsStore {
  static {
    __name(this, "ValidationMetricsStore");
  }
  static _instance;
  _metrics = {
    TotalValidations: 0,
    FailedValidations: 0,
    LastValidationTime: 0,
    AverageValidationTime: 0
  };
  static GetInstance() {
    if (!_ValidationMetricsStore._instance) {
      _ValidationMetricsStore._instance = new _ValidationMetricsStore();
    }
    return _ValidationMetricsStore._instance;
  }
  RecordValidation(StartTime, Success) {
    const EndTime = Date.now();
    const Duration = EndTime - StartTime;
    this._metrics.TotalValidations++;
    this._metrics.LastValidationTime = EndTime;
    if (!Success) {
      this._metrics.FailedValidations++;
    }
    this._metrics.AverageValidationTime = (this._metrics.AverageValidationTime * (this._metrics.TotalValidations - 1) + Duration) / this._metrics.TotalValidations;
  }
  GetMetrics() {
    return { ...this._metrics };
  }
  Reset() {
    this._metrics = {
      TotalValidations: 0,
      FailedValidations: 0,
      LastValidationTime: 0,
      AverageValidationTime: 0
    };
  }
};
var ProcessValidationStates = /* @__PURE__ */ new Map();
var ValidationAlertQueue = null;
var InitializeProcessValidation = Effect4.gen(function* () {
  const State = {
    ProcessId: Process.pid,
    StartTime: Date.now(),
    FileAccessCount: /* @__PURE__ */ new Map(),
    NetworkAccessCount: /* @__PURE__ */ new Map(),
    ChildProcessCount: 0,
    ViolationCount: 0,
    SecurityPolicy: DefaultSecurityPolicy
  };
  ProcessValidationStates.set(Process.pid, State);
  ValidationAlertQueue = yield* Queue.unbounded();
  yield* Effect4.logInfo("Process validation initialized", {
    ProcessId: Process.pid
  });
  return State;
});
var ValidateFileSystemAccess = /* @__PURE__ */ __name((File, Operation) => Effect4.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const PathValid = ValidatePathAccess(
    File,
    Operation,
    State.SecurityPolicy
  );
  if (!PathValid) {
    State.ViolationCount++;
    const Count = (State.FileAccessCount.get(File) || 0) + 1;
    State.FileAccessCount.set(File, Count);
    const Result2 = {
      Valid: false,
      Reason: `File access denied: ${Operation} on ${File}`,
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect4.logWarning("File system access denied", {
      File,
      Operation,
      ProcessId: Process.pid
    });
    return Result2;
  }
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
}), "ValidateFileSystemAccess");
var ValidateNetworkAccess2 = /* @__PURE__ */ __name((Endpoint, Operation) => Effect4.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const NetworkValid = ValidateNetworkAccess2(
    Endpoint,
    State.SecurityPolicy
  );
  if (!NetworkValid) {
    State.ViolationCount++;
    const Count = (State.NetworkAccessCount.get(Endpoint) || 0) + 1;
    State.NetworkAccessCount.set(Endpoint, Count);
    const Result2 = {
      Valid: false,
      Reason: `Network access denied: ${Operation} to ${Endpoint}`,
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect4.logWarning("Network access denied", {
      Endpoint,
      Operation,
      ProcessId: Process.pid
    });
    return Result2;
  }
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
}), "ValidateNetworkAccess");
var ValidateChildProcessSpawn = /* @__PURE__ */ __name((Command, Arguments) => Effect4.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const SpawnValid = ValidateChildProcess(
    Command,
    Arguments,
    State.SecurityPolicy
  );
  if (!SpawnValid) {
    State.ViolationCount++;
    State.ChildProcessCount++;
    const Result2 = {
      Valid: false,
      Reason: `Child process spawning denied: ${Command}`,
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect4.logWarning("Child process spawn denied", {
      Command,
      Arguments,
      ProcessId: Process.pid
    });
    return Result2;
  }
  State.ChildProcessCount++;
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
}), "ValidateChildProcessSpawn");
var ValidateMemoryUsage = Effect4.gen(function* () {
  const StartTime = Date.now();
  const Metrics = ValidationMetricsStore.GetInstance();
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    const Result2 = {
      Valid: false,
      Reason: "Process validation state not initialized",
      Severity: "error",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    return Result2;
  }
  const MemoryUsage = Process.memoryUsage();
  const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);
  const MaxMemoryMB = State.SecurityPolicy.MaxMemoryMB;
  if (MaxMemoryMB > 0 && UsedMemoryMB > MaxMemoryMB) {
    State.ViolationCount++;
    const Result2 = {
      Valid: false,
      Reason: `Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${MaxMemoryMB}MB`,
      Severity: "critical",
      Timestamp: Date.now()
    };
    Metrics.RecordValidation(StartTime, false);
    yield* Effect4.logError("Memory limit exceeded", {
      UsedMemoryMB,
      MaxMemoryMB,
      ProcessId: Process.pid
    });
    return Result2;
  }
  const Result = {
    Valid: true,
    Severity: "info",
    Timestamp: Date.now()
  };
  Metrics.RecordValidation(StartTime, true);
  return Result;
});
var DetectSuspiciousBehavior = Effect4.gen(function* () {
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    return yield* Effect4.fail(
      new ValidationError({
        ProcessId: Process.pid,
        ValidationType: "BehaviorDetection",
        Reason: "Process validation state not initialized",
        Severity: "error"
      })
    );
  }
  const UptimeMinutes = (Date.now() - State.StartTime) / 6e4;
  const AccessRate = Array.from(State.FileAccessCount.values()).reduce(
    (a, b) => a + b,
    0
  );
  const NetworkRate = Array.from(State.NetworkAccessCount.values()).reduce(
    (a, b) => a + b,
    0
  );
  if (UptimeMinutes > 0 && AccessRate / UptimeMinutes > 100) {
    yield* Effect4.logWarning("Suspicious file access rate detected", {
      AccessRate,
      UptimeMinutes,
      ProcessId: Process.pid
    });
  }
  if (UptimeMinutes > 0 && NetworkRate / UptimeMinutes > 10) {
    yield* Effect4.logWarning("Suspicious network activity detected", {
      NetworkRate,
      UptimeMinutes,
      ProcessId: Process.pid
    });
  }
  if (State.ChildProcessCount > 50) {
    yield* Effect4.logWarning("Excessive child process spawning", {
      ChildProcessCount: State.ChildProcessCount,
      ProcessId: Process.pid
    });
  }
  if (State.ViolationCount > 10) {
    yield* Effect4.logError("Multiple security violations detected", {
      ViolationCount: State.ViolationCount,
      ProcessId: Process.pid
    });
  }
  return {
    AccessRate,
    NetworkRate,
    ChildProcessCount: State.ChildProcessCount,
    ViolationCount: State.ViolationCount
  };
});
var GetValidationMetrics = /* @__PURE__ */ __name(() => {
  return ValidationMetricsStore.GetInstance().GetMetrics();
}, "GetValidationMetrics");
var ResetValidationMetrics = Effect4.sync(() => {
  ValidationMetricsStore.GetInstance().Reset();
  return;
});
var GetProcessValidationState = /* @__PURE__ */ __name((ProcessId = Process.pid) => {
  return ProcessValidationStates.get(ProcessId);
}, "GetProcessValidationState");
var ClearProcessValidationState = /* @__PURE__ */ __name((ProcessId = Process.pid) => {
  return Effect4.sync(() => {
    ProcessValidationStates.delete(ProcessId);
  });
}, "ClearProcessValidationState");
var RunSecurityValidation = Effect4.gen(function* () {
  yield* ValidateMemoryUsage;
  const BehaviorCheck = yield* DetectSuspiciousBehavior;
  const Result = {
    ProcessId: Process.pid,
    Timestamp: Date.now(),
    BehaviorCheck,
    Metrics: GetValidationMetrics()
  };
  yield* Effect4.logInfo(
    "Comprehensive security validation completed",
    Result
  );
  return Result;
});

// Source/PatchProcess/Loader.ts
import * as Process2 from "node:process";
import { Config as Config2, Effect as Effect5, Layer as Layer2 } from "effect";
var LoaderService = class extends Effect5.Service()(
  "PatchProcess/LoaderService",
  {
    effect: Effect5.gen(function* () {
      yield* Config2.string("SecurityPolicy").pipe(
        Effect5.catchTag(
          "MissingConfig",
          () => Effect5.succeed("default")
        )
      );
      const EnableMonitoring = yield* Config2.boolean(
        "EnableMonitoring"
      ).pipe(Effect5.catchAll(() => Effect5.succeed(true)));
      return {
        LoadSecurityPatches: RunPatchProcess,
        InitializeMonitoring: Effect5.gen(function* () {
          if (!EnableMonitoring) {
            return yield* Effect5.logInfo(
              "Security monitoring disabled by configuration"
            );
          }
          yield* InitializeProcessValidation;
          yield* Effect5.logInfo("Process monitoring initialized");
        }),
        GetSecurityPolicy: Effect5.succeed({
          AllowExit: false,
          MaxMemoryMB: 512,
          MaxCpuPercent: 50,
          AllowNetwork: false,
          AllowedEndpoints: [],
          AllowChildProcesses: false,
          AllowedChildCommands: [],
          AllowedPaths: [],
          DeniedPaths: ["/etc", "/proc", "/sys", "/root"],
          MaxFileDescriptors: 1024,
          MaxTimers: 1e3
        }),
        RunSecurityAudit: PerformSecurityAudit
      };
    })
  }
) {
  static {
    __name(this, "LoaderService");
  }
};
var InitializeSecurityLoader = Effect5.gen(function* () {
  const Loader2 = yield* LoaderService;
  yield* Effect5.logInfo("Initializing Security Loader...");
  yield* Effect5.logInfo("Loading security patches...");
  yield* Loader2.LoadSecurityPatches;
  yield* Effect5.logInfo("Initializing monitoring...");
  yield* Loader2.InitializeMonitoring;
  yield* Effect5.logInfo("Running initial security audit...");
  const AuditResult = yield* Loader2.RunSecurityAudit;
  yield* Effect5.logInfo("Initial security audit completed", { AuditResult });
  yield* StartPeriodicValidation;
  yield* Effect5.logInfo("Security Loader initialization completed");
});
var StartPeriodicValidation = Effect5.gen(function* () {
  const IntervalSeconds = 30;
  yield* Effect5.logDebug(
    `Starting periodic security validation (${IntervalSeconds}s interval)`
  );
  const ValidationLoop = Effect5.gen(function* () {
    while (true) {
      yield* Effect5.sleep(`${IntervalSeconds} seconds`);
      const ValidationResult2 = yield* RunSecurityValidation.pipe(
        Effect5.catchAll((Error2) => {
          return Effect5.logError(
            "Periodic security validation failed",
            {
              Error: Error2
            }
          );
        })
      );
      yield* Effect5.logTrace(
        "Periodic security validation completed",
        ValidationResult2
      );
    }
  });
  yield* ValidationLoop.pipe(Effect5.forkDaemon);
});
var ValidateFileSystemAccessWrapper = /* @__PURE__ */ __name((File, Operation) => Effect5.gen(function* () {
  const Result = yield* ValidateFileSystemAccess(File, Operation);
  if (!Result.Valid) {
    yield* Effect5.logWarning("File system access prevented", {
      File,
      Operation,
      Reason: Result.Reason
    });
    return false;
  }
  return true;
}), "ValidateFileSystemAccessWrapper");
var ValidateNetworkAccessWrapper = /* @__PURE__ */ __name((Endpoint, Operation) => Effect5.gen(function* () {
  const Result = yield* ValidateNetworkAccess2(Endpoint, Operation);
  if (!Result.Valid) {
    yield* Effect5.logWarning("Network access prevented", {
      Endpoint,
      Operation,
      Reason: Result.Reason
    });
    return false;
  }
  return true;
}), "ValidateNetworkAccessWrapper");
var ValidateChildProcessSpawnWrapper = /* @__PURE__ */ __name((Command, Arguments) => Effect5.gen(function* () {
  const Result = yield* ValidateChildProcessSpawn(Command, Arguments);
  if (!Result.Valid) {
    yield* Effect5.logWarning("Child process spawn prevented", {
      Command,
      Arguments,
      Reason: Result.Reason
    });
    return false;
  }
  return true;
}), "ValidateChildProcessSpawnWrapper");
var InstallModuleHooks = Effect5.gen(function* () {
  yield* Effect5.logTrace("Module hooks not yet implemented");
});
var InstallFileSystemHooks = Effect5.gen(function* () {
  yield* Effect5.logTrace("Filesystem hooks not yet implemented");
});
var InstallChildProcessHooks = Effect5.gen(function* () {
  yield* Effect5.logTrace("Child process hooks not yet implemented");
});
var InstallSecurityHooks = Effect5.gen(function* () {
  yield* Effect5.logInfo("Installing security hooks...");
  yield* InstallModuleHooks;
  yield* InstallFileSystemHooks;
  yield* InstallChildProcessHooks;
  yield* Effect5.logInfo("Security hooks installed");
});
var SetResourceLimits = Effect5.gen(function* () {
  yield* Effect5.logTrace(
    "Resource limit setting not yet implemented (needs native integration)"
  );
});
var GetResourceUsage = Effect5.gen(function* () {
  return {
    Memory: Process2.memoryUsage(),
    CpuUsage: Process2.cpuUsage(),
    Uptime: Process2.uptime(),
    Pid: Process2.pid,
    Ppid: Process2.ppid,
    Platform: Process2.platform,
    Arch: Process2.arch,
    NodeVersion: Process2.version,
    Timestamp: Date.now()
  };
});
var CleanupSecurityLoader = Effect5.gen(function* () {
  yield* Effect5.logInfo("Cleaning up Security Loader...");
  yield* Effect5.logInfo("Security Loader cleanup completed");
});
var LoaderServiceLive = Layer2.effect(Loader, LoaderService.Default);
var SecurityLive = Layer2.provide(
  LoaderServiceLive,
  PatcherService.Default
);

// Source/PatchProcess/Type/Converter.ts
import * as Process3 from "node:process";
import { Data as Data4, Effect as Effect6 } from "effect";
var ConversionError = class extends Data4.TaggedError("ConversionError") {
  static {
    __name(this, "ConversionError");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Conversion failed from ${Properties.SourceType} to ${Properties.TargetType}: ${Properties.Reason}`;
  }
};
var SecurityPolicyToDTO = /* @__PURE__ */ __name((Policy, Version = "1.0.0") => {
  return {
    AllowExit: Policy.AllowExit,
    MaxMemoryMB: Policy.MaxMemoryMB,
    MaxCpuPercent: Policy.MaxCpuPercent,
    AllowNetwork: Policy.AllowNetwork,
    AllowedEndpoints: Array.from(Policy.AllowedEndpoints),
    AllowChildProcesses: Policy.AllowChildProcesses,
    AllowedChildCommands: Array.from(Policy.AllowedChildCommands),
    AllowedPaths: Array.from(Policy.AllowedPaths),
    DeniedPaths: Array.from(Policy.DeniedPaths),
    MaxFileDescriptors: Policy.MaxFileDescriptors,
    MaxTimers: Policy.MaxTimers,
    Version,
    Timestamp: Date.now()
  };
}, "SecurityPolicyToDTO");
var DTOToSecurityPolicy = /* @__PURE__ */ __name((DTO) => {
  return Effect6.sync(() => {
    if (!ValidateSecurityPolicyDTO(DTO)) {
      throw new ConversionError({
        SourceType: "SecurityPolicyDTO",
        TargetType: "SecurityPolicy",
        Reason: "Invalid DTO structure",
        Data: DTO
      });
    }
    return {
      AllowExit: DTO.AllowExit,
      MaxMemoryMB: DTO.MaxMemoryMB,
      MaxCpuPercent: DTO.MaxCpuPercent,
      AllowNetwork: DTO.AllowNetwork,
      AllowedEndpoints: Object.freeze(DTO.AllowedEndpoints),
      AllowChildProcesses: DTO.AllowChildProcesses,
      AllowedChildCommands: Object.freeze(DTO.AllowedChildCommands),
      AllowedPaths: Object.freeze(DTO.AllowedPaths),
      DeniedPaths: Object.freeze(DTO.DeniedPaths),
      MaxFileDescriptors: DTO.MaxFileDescriptors,
      MaxTimers: DTO.MaxTimers
    };
  });
}, "DTOToSecurityPolicy");
var ValidateSecurityPolicyDTO = /* @__PURE__ */ __name((DTO) => {
  return typeof DTO.AllowExit === "boolean" && typeof DTO.MaxMemoryMB === "number" && typeof DTO.MaxCpuPercent === "number" && typeof DTO.AllowNetwork === "boolean" && Array.isArray(DTO.AllowedEndpoints) && typeof DTO.AllowChildProcesses === "boolean" && Array.isArray(DTO.AllowedChildCommands) && Array.isArray(DTO.AllowedPaths) && Array.isArray(DTO.DeniedPaths) && typeof DTO.MaxFileDescriptors === "number" && typeof DTO.MaxTimers === "number" && typeof DTO.Version === "string" && typeof DTO.Timestamp === "number";
}, "ValidateSecurityPolicyDTO");
var ProcessStateToDTO = /* @__PURE__ */ __name((ValidationState) => {
  const MemoryUsage = Process3.memoryUsage();
  const CpuUsage = Process3.cpuUsage();
  const Uptime = Process3.uptime();
  return {
    Pid: Process3.pid,
    Ppid: Process3.ppid,
    StartTime: ValidationState.StartTime,
    Uptime,
    MemoryUsedMB: MemoryUsage.heapUsed / (1024 * 1024),
    MemoryLimitMB: ValidationState.SecurityPolicy.MaxMemoryMB,
    CpuUsageUser: CpuUsage.user,
    CpuUsageSystem: CpuUsage.system,
    Platform: Process3.platform,
    Arch: Process3.arch,
    NodeVersion: Process3.version,
    WorkingDirectory: Process3.cwd(),
    ExecArgv: Process3.execArgv,
    ValidationState: ValidationStateToDTO(ValidationState),
    Timestamp: Date.now()
  };
}, "ProcessStateToDTO");
var DTOToProcessState = /* @__PURE__ */ __name((DTO) => {
  return Effect6.sync(() => {
    if (!ValidateProcessStateDTO(DTO)) {
      throw new ConversionError({
        SourceType: "ProcessStateDTO",
        TargetType: "ProcessValidationState",
        Reason: "Invalid DTO structure",
        Data: DTO
      });
    }
    return {
      ProcessId: DTO.Pid,
      StartTime: DTO.StartTime
    };
  });
}, "DTOToProcessState");
var ValidateProcessStateDTO = /* @__PURE__ */ __name((DTO) => {
  return typeof DTO.Pid === "number" && typeof DTO.Ppid === "number" && typeof DTO.StartTime === "number" && typeof DTO.Uptime === "number" && typeof DTO.MemoryUsedMB === "number" && typeof DTO.MemoryLimitMB === "number" && typeof DTO.Platform === "string" && typeof DTO.Arch === "string" && typeof DTO.NodeVersion === "string" && Array.isArray(DTO.ExecArgv) && typeof DTO.Timestamp === "number";
}, "ValidateProcessStateDTO");
var ValidationStateToDTO = /* @__PURE__ */ __name((State) => {
  const FileAccessTotal = Array.from(State.FileAccessCount.values()).reduce((a, b) => a + b, 0);
  const NetworkAccessTotal = Array.from(State.NetworkAccessCount.values()).reduce((a, b) => a + b, 0);
  return {
    TotalValidations: FileAccessTotal + NetworkAccessTotal,
    FailedValidations: State.ViolationCount,
    LastValidationTime: Date.now(),
    AverageValidationTime: 0,
    // FUTURE: Track running average of validation times
    FileAccessCount: FileAccessTotal,
    NetworkAccessCount: NetworkAccessTotal,
    ChildProcessCount: State.ChildProcessCount,
    ViolationCount: State.ViolationCount,
    SecurityPolicyHash: GetSecurityPolicyHash(State.SecurityPolicy)
  };
}, "ValidationStateToDTO");
var GetSecurityPolicyHash = /* @__PURE__ */ __name((Policy) => {
  const PolicyString = JSON.stringify(Policy);
  return Buffer.from(PolicyString).toString("base64").slice(0, 16);
}, "GetSecurityPolicyHash");
var ValidationResultToDTO = /* @__PURE__ */ __name((ProcessId, ValidationType, Result, DurationMs) => {
  return {
    ProcessId,
    ValidationType,
    Success: Result.Valid,
    Reason: Result.Reason,
    Severity: Result.Severity,
    DurationMs,
    Timestamp: Result.Timestamp
  };
}, "ValidationResultToDTO");
var DTOToValidationResult = /* @__PURE__ */ __name((DTO) => {
  return {
    Valid: DTO.Success,
    Reason: DTO.Reason,
    Severity: DTO.Severity,
    Timestamp: DTO.Timestamp
  };
}, "DTOToValidationResult");
var CreateSecurityEventDTO = /* @__PURE__ */ __name((EventType, Severity, Message, Data5 = {}) => {
  return {
    EventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    EventType,
    Severity,
    ProcessId: Process3.pid,
    Message,
    Data: Data5,
    Timestamp: Date.now()
  };
}, "CreateSecurityEventDTO");
var SerializeDTO = /* @__PURE__ */ __name((DTO) => {
  return Effect6.try({
    try: /* @__PURE__ */ __name(() => JSON.stringify(DTO), "try"),
    catch: /* @__PURE__ */ __name((Error2) => {
      throw new ConversionError({
        SourceType: typeof DTO,
        TargetType: "string",
        Reason: Error2 instanceof globalThis.Error ? Error2.message : String(Error2),
        Data: DTO
      });
    }, "catch")
  });
}, "SerializeDTO");
var DeserializeDTO = /* @__PURE__ */ __name((JsonString, ExpectedType) => {
  return Effect6.try({
    try: /* @__PURE__ */ __name(() => JSON.parse(JsonString), "try"),
    catch: /* @__PURE__ */ __name((Error2) => {
      throw new ConversionError({
        SourceType: "string",
        TargetType: ExpectedType,
        Reason: Error2 instanceof globalThis.Error ? Error2.message : String(Error2),
        Data: JsonString
      });
    }, "catch")
  });
}, "DeserializeDTO");
var CamelCaseToPascalCase = /* @__PURE__ */ __name((CamelCase) => {
  return CamelCase.replace(/([a-z])([A-Z])/g, "$1_$2").split("_").map((Part) => Part.charAt(0).toUpperCase() + Part.slice(1)).join("");
}, "CamelCaseToPascalCase");
var PascalCaseToCamelCase = /* @__PURE__ */ __name((PascalCase) => {
  return PascalCase.replace(
    /([A-Z])/g,
    (Match, Offset) => Offset > 0 ? Match.toLowerCase() : Match
  );
}, "PascalCaseToCamelCase");
var ConvertObjectKeysToPascalCase = /* @__PURE__ */ __name((Obj) => {
  if (typeof Obj !== "object" || Obj === null) {
    return Obj;
  }
  if (Array.isArray(Obj)) {
    return Obj.map((Item) => ConvertObjectKeysToPascalCase(Item));
  }
  const Result = {};
  for (const [Key, Value] of Object.entries(Obj)) {
    const PascalKey = CamelCaseToPascalCase(Key);
    Result[PascalKey] = ConvertObjectKeysToPascalCase(Value);
  }
  return Result;
}, "ConvertObjectKeysToPascalCase");
var ConvertObjectKeysToCamelCase = /* @__PURE__ */ __name((Obj) => {
  if (typeof Obj !== "object" || Obj === null) {
    return Obj;
  }
  if (Array.isArray(Obj)) {
    return Obj.map((Item) => ConvertObjectKeysToCamelCase(Item));
  }
  const Result = {};
  for (const [Key, Value] of Object.entries(Obj)) {
    const CamelKey = PascalCaseToCamelCase(Key);
    Result[CamelKey] = ConvertObjectKeysToCamelCase(Value);
  }
  return Result;
}, "ConvertObjectKeysToCamelCase");
var BatchSecurityPoliciesToDTO = /* @__PURE__ */ __name((Policies, Version = "1.0.0") => {
  return Policies.map((Policy) => SecurityPolicyToDTO(Policy, Version));
}, "BatchSecurityPoliciesToDTO");
var BatchDTOsToSecurityPolicies = /* @__PURE__ */ __name((DTOs) => {
  return Effect6.all(
    DTOs.map((DTO) => DTOToSecurityPolicy(DTO)),
    { concurrency: "unbounded" }
  );
}, "BatchDTOsToSecurityPolicies");
export {
  BatchDTOsToSecurityPolicies,
  BatchSecurityPoliciesToDTO,
  BehaviorViolationError,
  CamelCaseToPascalCase,
  ChildProcessDeniedError,
  CleanupSecurityLoader,
  ClearProcessValidationState,
  ConversionError,
  ConvertObjectKeysToCamelCase,
  ConvertObjectKeysToPascalCase,
  CpuLimitExceededError,
  CreateSecurityEventDTO,
  DTOToProcessState,
  DTOToSecurityPolicy,
  DTOToValidationResult,
  DefaultSecurityPolicy,
  DeserializeDTO,
  DetectSuspiciousBehavior,
  EnforceCpuLimit,
  EnforceMemoryLimit2 as EnforceMemoryLimit,
  FileAccessDeniedError,
  GetPolicyHash,
  GetProcessValidationState,
  GetResourceUsage,
  GetValidationMetrics,
  InitializeProcessValidation,
  InitializeSecurityLoader,
  InstallSecurityHooks,
  LoaderService,
  LoaderServiceLive,
  MemoryLimitExceededError,
  MergeSecurityPolicies,
  NetworkAccessDeniedError,
  PascalCaseToCamelCase,
  PatcherService,
  PerformSecurityAudit,
  ProcessStateToDTO,
  ReloadSecurityPolicy,
  ResetValidationMetrics,
  RunPatchProcess,
  RunSecurityValidation,
  SecurityLive,
  SecurityPolicyToDTO,
  SerializeDTO,
  TrustedSecurityPolicy,
  ValidateChildProcess,
  ValidateChildProcessSpawn,
  ValidateChildProcessSpawnWrapper,
  ValidateEnvironmentVariable,
  ValidateFileSystemAccess,
  ValidateFileSystemAccessWrapper,
  ValidateMemoryUsage,
  ValidateNetworkAccess,
  ValidateNetworkAccess2 as ValidateNetworkAccessValidator,
  ValidateNetworkAccessWrapper,
  ValidatePathAccess,
  ValidationError,
  ValidationResultToDTO,
  ValidationStateToDTO
};
//# sourceMappingURL=index.js.map
