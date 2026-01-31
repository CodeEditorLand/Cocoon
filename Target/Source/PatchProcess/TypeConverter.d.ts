/**
 * @module TypeConverter
 * @description
 * Converts process types between Cocoon's internal representation and Mountain's DTO format.
 * Provides bidirectional serialization for security policies, process states, and telemetry data.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: Air uses these converters for IPC with Mountain.
 * Process state data is exchanged via these conversion routines for synchronization.
 *
 * **Mountain (Security Policies)**: Mountain uses DTOs for state management.
 * All security policies and process states are converted to/from DTO format here.
 *
 * **Wind (Effect-TS Services)**: Wind services use converters for type-safe data exchange.
 * All IPC messages between elements pass through these converters.
 *
 * **Output (VSCode Reference)**: Based on VSCode's data transfer patterns:
 * - src/vs/workbench/services/extensions/common/extHostExtensionService.ts
 * - src/vs/base/common/types.ts
 *
 * ## Responsibilities
 *
 * 1. Convert SecurityPolicy to/from Mountain DTO
 * 2. Convert ProcessState to/from Mountain DTO
 * 3. Convert SecurityEvent to/from Mountain DTO
 * 4. Convert ValidationMetrics to/from Mountain DTO
 * 5. Handle PascalCase <-> camelCase conversion
 * 6. Provide type-safe serialization
 * 7. Validate DTO integrity
 *
 * ## TODOs
 *
 * - **TBD**: Schema validation for DTOs
 * - **TBD**: Converter caching for performance
 * - **TBD**: Batch conversion support
 * - **TBD**: Incremental conversion for large objects
 * - **TBD**: Converter error recovery
 * - **TBD**: Conversion metrics and monitoring
 * - **TBD**: Custom serializers for complex types
 * - **TBD**: DTO versioning support
 */
import { Effect } from "effect";
import { SecurityPolicy } from "./Security.js";
import { ValidationResult, ProcessValidationState } from "./Validator.js";
/**
 * Mountain DTO for security policy
 * Uses PascalCase naming convention for Rust compatibility
 */
export interface SecurityPolicyDTO {
    readonly AllowExit: boolean;
    readonly MaxMemoryMB: number;
    readonly MaxCpuPercent: number;
    readonly AllowNetwork: boolean;
    readonly AllowedEndpoints: string[];
    readonly AllowChildProcesses: boolean;
    readonly AllowedChildCommands: string[];
    readonly AllowedPaths: string[];
    readonly DeniedPaths: string[];
    readonly MaxFileDescriptors: number;
    readonly MaxTimers: number;
    readonly Version: string;
    readonly Timestamp: number;
}
/**
 * Mountain DTO for process state
 */
export interface ProcessStateDTO {
    readonly Pid: number;
    readonly Ppid: number;
    readonly StartTime: number;
    readonly Uptime: number;
    readonly MemoryUsedMB: number;
    readonly MemoryLimitMB: number;
    readonly CpuUsageUser: number;
    readonly CpuUsageSystem: number;
    readonly Platform: string;
    readonly Arch: string;
    readonly NodeVersion: string;
    readonly WorkingDirectory: string;
    readonly ExecArgv: string[];
    readonly ValidationState: ValidationStateDTO;
    readonly Timestamp: number;
}
/**
 * Mountain DTO for validation state
 */
export interface ValidationStateDTO {
    readonly TotalValidations: number;
    readonly FailedValidations: number;
    readonly LastValidationTime: number;
    readonly AverageValidationTime: number;
    readonly FileAccessCount: number;
    readonly NetworkAccessCount: number;
    readonly ChildProcessCount: number;
    readonly ViolationCount: number;
    readonly SecurityPolicyHash: string;
}
/**
 * Mountain DTO for security event
 */
export interface SecurityEventDTO {
    readonly EventId: string;
    readonly EventType: string;
    readonly Severity: "info" | "warning" | "error" | "critical";
    readonly ProcessId: number;
    readonly Message: string;
    readonly Data: Record<string, unknown>;
    readonly Timestamp: number;
}
/**
 * Mountain DTO for validation result
 */
export interface ValidationResultDTO {
    readonly ProcessId: number;
    readonly ValidationType: string;
    readonly Success: boolean;
    readonly Reason?: string;
    readonly Severity: "info" | "warning" | "error" | "critical";
    readonly DurationMs: number;
    readonly Timestamp: number;
}
declare const ConversionError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ConversionError";
} & Readonly<A>;
/**
 * Tagged error for conversion failures
 */
export declare class ConversionError extends ConversionError_base<{
    readonly SourceType: string;
    readonly TargetType: string;
    readonly Reason: string;
    readonly Data?: unknown;
}> {
    readonly message: string;
    constructor(Properties: any);
}
/**
 * Convert SecurityPolicy to SecurityPolicyDTO
 */
export declare const SecurityPolicyToDTO: (Policy: SecurityPolicy, Version?: string) => SecurityPolicyDTO;
/**
 * Convert SecurityPolicyDTO to SecurityPolicy
 */
export declare const DTOToSecurityPolicy: (DTO: SecurityPolicyDTO) => Effect.Effect<SecurityPolicy, ConversionError>;
/**
 * Convert current process state to ProcessStateDTO
 */
export declare const ProcessStateToDTO: (ValidationState: ProcessValidationState) => ProcessStateDTO;
/**
 * Convert ProcessStateDTO to ProcessState (partial)
 * Some fields are read-only and cannot be set
 */
export declare const DTOToProcessState: (DTO: ProcessStateDTO) => Effect.Effect<Partial<ProcessValidationState>, ConversionError>;
/**
 * Convert ProcessValidationState to ValidationStateDTO
 */
export declare const ValidationStateToDTO: (State: ProcessValidationState) => ValidationStateDTO;
/**
 * Convert ValidationResult to ValidationResultDTO
 */
export declare const ValidationResultToDTO: (ProcessId: number, ValidationType: string, Result: ValidationResult, DurationMs: number) => ValidationResultDTO;
/**
 * Convert ValidationResultDTO to ValidationResult
 */
export declare const DTOToValidationResult: (DTO: ValidationResultDTO) => ValidationResult;
/**
 * Create a SecurityEventDTO from event data
 */
export declare const CreateSecurityEventDTO: (EventType: string, Severity: "info" | "warning" | "error" | "critical", Message: string, Data?: Record<string, unknown>) => SecurityEventDTO;
/**
 * Serialize DTO to JSON string
 */
export declare const SerializeDTO: (DTO: SecurityPolicyDTO | ProcessStateDTO | SecurityEventDTO | ValidationResultDTO) => Effect.Effect<string, ConversionError>;
/**
 * Deserialize JSON string to DTO
 */
export declare const DeserializeDTO: <T>(JsonString: string, ExpectedType: string) => Effect.Effect<T, ConversionError>;
/**
 * Convert camelCase to PascalCase
 */
export declare const CamelCaseToPascalCase: (CamelCase: string) => string;
/**
 * Convert PascalCase to camelCase
 */
export declare const PascalCaseToCamelCase: (PascalCase: string) => string;
/**
 * Recursively convert object keys from camelCase to PascalCase
 */
export declare const ConvertObjectKeysToPascalCase: <T>(Obj: T) => T;
/**
 * Recursively convert object keys from PascalCase to camelCase
 */
export declare const ConvertObjectKeysToCamelCase: <T>(Obj: T) => T;
/**
 * Batch convert multiple security policies to DTOs
 */
export declare const BatchSecurityPoliciesToDTO: (Policies: SecurityPolicy[], Version?: string) => SecurityPolicyDTO[];
/**
 * Batch convert multiple DTOs to security policies
 */
export declare const BatchDTOsToSecurityPolicies: (DTOs: SecurityPolicyDTO[]) => Effect.Effect<SecurityPolicy[], ConversionError>;
export {};
//# sourceMappingURL=TypeConverter.d.ts.map