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
export {
  ChildProcessDeniedError,
  CpuLimitExceededError,
  DefaultSecurityPolicy,
  EnforceCpuLimit,
  EnforceMemoryLimit,
  FileAccessDeniedError,
  GetPolicyHash,
  MemoryLimitExceededError,
  MergeSecurityPolicies,
  NetworkAccessDeniedError,
  PerformSecurityAudit,
  TrustedSecurityPolicy,
  ValidateChildProcess,
  ValidateEnvironmentVariable,
  ValidateNetworkAccess,
  ValidatePathAccess
};
//# sourceMappingURL=Security.js.map
