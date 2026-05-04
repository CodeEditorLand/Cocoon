var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/PatchProcess/Type/Converter.ts
import * as Process from "node:process";
import { Data, Effect } from "effect";
var ConversionError = class extends Data.TaggedError("ConversionError") {
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
  return Effect.sync(() => {
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
  const MemoryUsage = Process.memoryUsage();
  const CpuUsage = Process.cpuUsage();
  const Uptime = Process.uptime();
  return {
    Pid: Process.pid,
    Ppid: Process.ppid,
    StartTime: ValidationState.StartTime,
    Uptime,
    MemoryUsedMB: MemoryUsage.heapUsed / (1024 * 1024),
    MemoryLimitMB: ValidationState.SecurityPolicy.MaxMemoryMB,
    CpuUsageUser: CpuUsage.user,
    CpuUsageSystem: CpuUsage.system,
    Platform: Process.platform,
    Arch: Process.arch,
    NodeVersion: Process.version,
    WorkingDirectory: Process.cwd(),
    ExecArgv: Process.execArgv,
    ValidationState: ValidationStateToDTO(ValidationState),
    Timestamp: Date.now()
  };
}, "ProcessStateToDTO");
var DTOToProcessState = /* @__PURE__ */ __name((DTO) => {
  return Effect.sync(() => {
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
var CreateSecurityEventDTO = /* @__PURE__ */ __name((EventType, Severity, Message, Data2 = {}) => {
  return {
    EventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    EventType,
    Severity,
    ProcessId: Process.pid,
    Message,
    Data: Data2,
    Timestamp: Date.now()
  };
}, "CreateSecurityEventDTO");
var SerializeDTO = /* @__PURE__ */ __name((DTO) => {
  return Effect.try({
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
  return Effect.try({
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
  return Effect.all(
    DTOs.map((DTO) => DTOToSecurityPolicy(DTO)),
    { concurrency: "unbounded" }
  );
}, "BatchDTOsToSecurityPolicies");
export {
  BatchDTOsToSecurityPolicies,
  BatchSecurityPoliciesToDTO,
  CamelCaseToPascalCase,
  ConversionError,
  ConvertObjectKeysToCamelCase,
  ConvertObjectKeysToPascalCase,
  CreateSecurityEventDTO,
  DTOToProcessState,
  DTOToSecurityPolicy,
  DTOToValidationResult,
  DeserializeDTO,
  PascalCaseToCamelCase,
  ProcessStateToDTO,
  SecurityPolicyToDTO,
  SerializeDTO,
  ValidationResultToDTO,
  ValidationStateToDTO
};
//# sourceMappingURL=Converter.js.map
