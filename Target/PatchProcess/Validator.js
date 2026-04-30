var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/PatchProcess/Security.ts
import * as Path from "node:path";
import * as URL from "node:url";
import { Data, Effect } from "effect";
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
var MemoryLimitExceededError = class extends Data.TaggedError(
  "MemoryLimitExceededError"
) {
  static {
    __name(this, "MemoryLimitExceededError");
  }
};
var FileAccessDeniedError = class extends Data.TaggedError(
  "FileAccessDeniedError"
) {
  static {
    __name(this, "FileAccessDeniedError");
  }
};
var NetworkAccessDeniedError = class extends Data.TaggedError(
  "NetworkAccessDeniedError"
) {
  static {
    __name(this, "NetworkAccessDeniedError");
  }
};
var ChildProcessDeniedError = class extends Data.TaggedError(
  "ChildProcessDeniedError"
) {
  static {
    __name(this, "ChildProcessDeniedError");
  }
};
var CpuLimitExceededError = class extends Data.TaggedError(
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
var EnforceMemoryLimit = Effect.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  if (Policy.MaxMemoryMB <= 0) {
    return yield* Effect.logTrace("No memory limit configured");
  }
  const MemoryUsage = process.memoryUsage();
  const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);
  if (UsedMemoryMB > Policy.MaxMemoryMB) {
    yield* Effect.logError(
      `Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`
    );
    return yield* Effect.fail(
      new MemoryLimitExceededError({
        LimitMB: Policy.MaxMemoryMB,
        AttemptedMB: UsedMemoryMB,
        ProcessId: process.pid
      })
    );
  }
  yield* Effect.logTrace(
    `Memory usage within limits: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`
  );
});
var EnforceCpuLimit = Effect.gen(function* () {
  const Policy = DefaultSecurityPolicy;
  if (Policy.MaxCpuPercent <= 0) {
    return yield* Effect.logTrace("No CPU limit configured");
  }
  yield* Effect.logDebug(
    `CPU limit configured: ${Policy.MaxCpuPercent}% (monitoring not yet implemented)`
  );
});
var PerformSecurityAudit = Effect.gen(function* () {
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
  yield* Effect.logInfo("Security audit completed", { Report });
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
import { Data as Data2, Effect as Effect2, Queue } from "effect";
var ValidationError = class extends Data2.TaggedError("ValidationError") {
  static {
    __name(this, "ValidationError");
  }
  message;
  constructor(Properties) {
    super(Properties);
    this.message = `Validation failed for process ${Properties.ProcessId}: ${Properties.Reason}`;
  }
};
var BehaviorViolationError = class extends Data2.TaggedError(
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
var InitializeProcessValidation = Effect2.gen(function* () {
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
  yield* Effect2.logInfo("Process validation initialized", {
    ProcessId: Process.pid
  });
  return State;
});
var ValidateFileSystemAccess = /* @__PURE__ */ __name((File, Operation) => Effect2.gen(function* () {
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
    yield* Effect2.logWarning("File system access denied", {
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
var ValidateNetworkAccess2 = /* @__PURE__ */ __name((Endpoint, Operation) => Effect2.gen(function* () {
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
    yield* Effect2.logWarning("Network access denied", {
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
var ValidateChildProcessSpawn = /* @__PURE__ */ __name((Command, Arguments) => Effect2.gen(function* () {
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
    yield* Effect2.logWarning("Child process spawn denied", {
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
var ValidateMemoryUsage = Effect2.gen(function* () {
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
    yield* Effect2.logError("Memory limit exceeded", {
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
var DetectSuspiciousBehavior = Effect2.gen(function* () {
  const State = ProcessValidationStates.get(Process.pid);
  if (!State) {
    return yield* Effect2.fail(
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
    yield* Effect2.logWarning("Suspicious file access rate detected", {
      AccessRate,
      UptimeMinutes,
      ProcessId: Process.pid
    });
  }
  if (UptimeMinutes > 0 && NetworkRate / UptimeMinutes > 10) {
    yield* Effect2.logWarning("Suspicious network activity detected", {
      NetworkRate,
      UptimeMinutes,
      ProcessId: Process.pid
    });
  }
  if (State.ChildProcessCount > 50) {
    yield* Effect2.logWarning("Excessive child process spawning", {
      ChildProcessCount: State.ChildProcessCount,
      ProcessId: Process.pid
    });
  }
  if (State.ViolationCount > 10) {
    yield* Effect2.logError("Multiple security violations detected", {
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
var ResetValidationMetrics = Effect2.sync(() => {
  ValidationMetricsStore.GetInstance().Reset();
  return;
});
var GetProcessValidationState = /* @__PURE__ */ __name((ProcessId = Process.pid) => {
  return ProcessValidationStates.get(ProcessId);
}, "GetProcessValidationState");
var ClearProcessValidationState = /* @__PURE__ */ __name((ProcessId = Process.pid) => {
  return Effect2.sync(() => {
    ProcessValidationStates.delete(ProcessId);
  });
}, "ClearProcessValidationState");
var RunSecurityValidation = Effect2.gen(function* () {
  yield* ValidateMemoryUsage;
  const BehaviorCheck = yield* DetectSuspiciousBehavior;
  const Result = {
    ProcessId: Process.pid,
    Timestamp: Date.now(),
    BehaviorCheck,
    Metrics: GetValidationMetrics()
  };
  yield* Effect2.logInfo(
    "Comprehensive security validation completed",
    Result
  );
  return Result;
});
export {
  BehaviorViolationError,
  ClearProcessValidationState,
  DetectSuspiciousBehavior,
  GetProcessValidationState,
  GetValidationMetrics,
  InitializeProcessValidation,
  ResetValidationMetrics,
  RunSecurityValidation,
  ValidateChildProcessSpawn,
  ValidateFileSystemAccess,
  ValidateMemoryUsage,
  ValidateNetworkAccess2 as ValidateNetworkAccess,
  ValidationAlertQueue,
  ValidationError
};
//# sourceMappingURL=Validator.js.map
