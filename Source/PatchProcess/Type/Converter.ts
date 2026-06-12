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

import * as Process from "node:process";

import { SecurityPolicy } from "../Security.js";
import { ProcessValidationState, ValidationResult } from "../Validator.js";

// --- Mountain DTO Types ---

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

// --- Conversion Errors ---

/**
 * Tagged error for conversion failures
 */
export class ConversionError extends Data.TaggedError("ConversionError")<{
	readonly SourceType: string;

	readonly TargetType: string;

	readonly Reason: string;

	readonly Data?: unknown;
}> {
	public override readonly message: string;

	constructor(Properties: any) {
		super(Properties;

		this.message = `Conversion failed from ${Properties.SourceType} to ${Properties.TargetType}: ${Properties.Reason}`;
	}
}

// --- SecurityPolicy Conversion ---

/**
 * Convert SecurityPolicy to SecurityPolicyDTO
 */
export const SecurityPolicyToDTO = (
	Policy: SecurityPolicy,

	Version: string = "1.0.0",
): SecurityPolicyDTO => {
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

		Timestamp: Date.now(),
	};
};

/**
 * Convert SecurityPolicyDTO to SecurityPolicy
 */
export const DTOToSecurityPolicy = (
	DTO: SecurityPolicyDTO,
): Promise<SecurityPolicy> => {
	return {
		// Validate DTO structure
		if (!ValidateSecurityPolicyDTO(DTO) {
			throw new ConversionError({
				SourceType: "SecurityPolicyDTO",
				TargetType: "SecurityPolicy",
				Reason: "Invalid DTO structure",
				Data: DTO,
			};
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
			MaxTimers: DTO.MaxTimers,
		};
	};
};

/**
 * Validate SecurityPolicyDTO structure
 */
const ValidateSecurityPolicyDTO = (DTO: SecurityPolicyDTO): boolean => {
	return (
		typeof DTO.AllowExit === "boolean" &&
		typeof DTO.MaxMemoryMB === "number" &&
		typeof DTO.MaxCpuPercent === "number" &&
		typeof DTO.AllowNetwork === "boolean" &&
		Array.isArray(DTO.AllowedEndpoints) &&
		typeof DTO.AllowChildProcesses === "boolean" &&
		Array.isArray(DTO.AllowedChildCommands) &&
		Array.isArray(DTO.AllowedPaths) &&
		Array.isArray(DTO.DeniedPaths) &&
		typeof DTO.MaxFileDescriptors === "number" &&
		typeof DTO.MaxTimers === "number" &&
		typeof DTO.Version === "string" &&
		typeof DTO.Timestamp === "number"
	;
};

// --- ProcessState Conversion ---

/**
 * Convert current process state to ProcessStateDTO
 */
export const ProcessStateToDTO = (
	ValidationState: ProcessValidationState,
): ProcessStateDTO => {
	const MemoryUsage = Process.memoryUsage(;

	const CpuUsage = Process.cpuUsage(;

	const Uptime = Process.uptime(;

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

		Timestamp: Date.now(),
	};
};

/**
 * Convert ProcessStateDTO to ProcessState (partial)
 * Some fields are read-only and cannot be set
 */
export const DTOToProcessState = (
	DTO: ProcessStateDTO,
): Promise<Partial<ProcessValidationState>> => {
	return {
		if (!ValidateProcessStateDTO(DTO) {
			throw new ConversionError({
				SourceType: "ProcessStateDTO",
				TargetType: "ProcessValidationState",
				Reason: "Invalid DTO structure",
				Data: DTO,
			};
		}

		return {
			ProcessId: DTO.Pid,
			StartTime: DTO.StartTime,
		};
	};
};

/**
 * Validate ProcessStateDTO structure
 */
const ValidateProcessStateDTO = (DTO: ProcessStateDTO): boolean => {
	return (
		typeof DTO.Pid === "number" &&
		typeof DTO.Ppid === "number" &&
		typeof DTO.StartTime === "number" &&
		typeof DTO.Uptime === "number" &&
		typeof DTO.MemoryUsedMB === "number" &&
		typeof DTO.MemoryLimitMB === "number" &&
		typeof DTO.Platform === "string" &&
		typeof DTO.Arch === "string" &&
		typeof DTO.NodeVersion === "string" &&
		Array.isArray(DTO.ExecArgv) &&
		typeof DTO.Timestamp === "number"
	;
};

// --- ValidationState Conversion ---

/**
 * Convert ProcessValidationState to ValidationStateDTO
 */
export const ValidationStateToDTO = (
	State: ProcessValidationState,
): ValidationStateDTO => {
	const FileAccessTotal = (
		Array.from(State.FileAccessCount.values()) as number[]
	).reduce((a, b) => a + b, 0;

	const NetworkAccessTotal = (
		Array.from(State.NetworkAccessCount.values()) as number[]
	).reduce((a, b) => a + b, 0;

	return {
		TotalValidations: FileAccessTotal + NetworkAccessTotal,

		FailedValidations: State.ViolationCount,

		LastValidationTime: Date.now(),

		AverageValidationTime: 0, // FUTURE: Track running average of validation times

		FileAccessCount: FileAccessTotal,

		NetworkAccessCount: NetworkAccessTotal,

		ChildProcessCount: State.ChildProcessCount,

		ViolationCount: State.ViolationCount,

		SecurityPolicyHash: GetSecurityPolicyHash(State.SecurityPolicy),
	};
};

/**
 * Calculate security policy hash
 */
const GetSecurityPolicyHash = (Policy: SecurityPolicy): string => {
	const PolicyString = JSON.stringify(Policy;

	return Buffer.from(PolicyString).toString("base64").slice(0, 16;
};

// --- ValidationResult Conversion ---

/**
 * Convert ValidationResult to ValidationResultDTO
 */
export const ValidationResultToDTO = (
	ProcessId: number,

	ValidationType: string,

	Result: ValidationResult,

	DurationMs: number,
): ValidationResultDTO => {
	return {
		ProcessId,

		ValidationType,

		Success: Result.Valid,

		Reason: Result.Reason,

		Severity: Result.Severity,

		DurationMs,

		Timestamp: Result.Timestamp,
	};
};

/**
 * Convert ValidationResultDTO to ValidationResult
 */
export const DTOToValidationResult = (
	DTO: ValidationResultDTO,
): ValidationResult => {
	return {
		Valid: DTO.Success,

		Reason: DTO.Reason,

		Severity: DTO.Severity,

		Timestamp: DTO.Timestamp,
	};
};

// --- SecurityEvent Conversion ---

/**
 * Create a SecurityEventDTO from event data
 */
export const CreateSecurityEventDTO = (
	EventType: string,

	Severity: "info" | "warning" | "error" | "critical",

	Message: string,

	Data: Record<string, unknown> = {},
): SecurityEventDTO => {
	return {
		EventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,

		EventType,

		Severity,

		ProcessId: Process.pid,

		Message,

		Data,

		Timestamp: Date.now(),
	};
};

// --- Conversion Utilities ---

/**
 * Serialize DTO to JSON string
 */
export const SerializeDTO = (
	DTO:
		| SecurityPolicyDTO
		| ProcessStateDTO
		| SecurityEventDTO
		| ValidationResultDTO,
): Promise<string> => {
	return Effect.try({
		try: () => JSON.stringify(DTO),
		catch: (Error) => {
			throw new ConversionError({
				SourceType: typeof DTO,
				TargetType: "string",
				Reason:
					Error instanceof globalThis.Error
						? Error.message
						: String(Error),
				Data: DTO,
			};
		},
	};
};

/**
 * Deserialize JSON string to DTO
 */
export const DeserializeDTO = <T>(
	JsonString: string,

	ExpectedType: string,
): Promise<T> => {
	return Effect.try({
		try: () => JSON.parse(JsonString) as T,
		catch: (Error) => {
			throw new ConversionError({
				SourceType: "string",
				TargetType: ExpectedType,
				Reason:
					Error instanceof globalThis.Error
						? Error.message
						: String(Error),
				Data: JsonString,
			};
		},
	};
};

/**
 * Convert camelCase to PascalCase
 */
export const CamelCaseToPascalCase = (CamelCase: string): string => {
	return CamelCase.replace(/([a-z])([A-Z])/g, "$1_$2")
		.split("_")
		.map((Part) => Part.charAt(0).toUpperCase() + Part.slice(1))
		.join("";
};

/**
 * Convert PascalCase to camelCase
 */
export const PascalCaseToCamelCase = (PascalCase: string): string => {
	return PascalCase.replace(/([A-Z])/g, (Match, Offset) =>
		Offset > 0 ? Match.toLowerCase() : Match,
	;
};

/**
 * Recursively convert object keys from camelCase to PascalCase
 */
export const ConvertObjectKeysToPascalCase = <T>(Obj: T): T => {
	if (typeof Obj !== "object" || Obj === null) {
		return Obj;
	}

	if (Array.isArray(Obj)) {
		return Obj.map((Item) => ConvertObjectKeysToPascalCase(Item)) as T;
	}

	const Result: Record<string, unknown> = {};

	for (const [Key, Value] of Object.entries(Obj as Record<string, unknown>)) {
		const PascalKey = CamelCaseToPascalCase(Key;

		Result[PascalKey] = ConvertObjectKeysToPascalCase(Value;
	}

	return Result as T;
};

/**
 * Recursively convert object keys from PascalCase to camelCase
 */
export const ConvertObjectKeysToCamelCase = <T>(Obj: T): T => {
	if (typeof Obj !== "object" || Obj === null) {
		return Obj;
	}

	if (Array.isArray(Obj)) {
		return Obj.map((Item) => ConvertObjectKeysToCamelCase(Item)) as T;
	}

	const Result: Record<string, unknown> = {};

	for (const [Key, Value] of Object.entries(Obj as Record<string, unknown>)) {
		const CamelKey = PascalCaseToCamelCase(Key;

		Result[CamelKey] = ConvertObjectKeysToCamelCase(Value;
	}

	return Result as T;
};

// --- Batch Operations ---

/**
 * Batch convert multiple security policies to DTOs
 */
export const BatchSecurityPoliciesToDTO = (
	Policies: SecurityPolicy[],

	Version: string = "1.0.0",
): SecurityPolicyDTO[] => {
	return Policies.map((Policy) => SecurityPolicyToDTO(Policy, Version);
};

/**
 * Batch convert multiple DTOs to security policies
 */
export const BatchDTOsToSecurityPolicies = (
	DTOs: SecurityPolicyDTO[],
): Promise<SecurityPolicy[]> => {
	return Promise.all(
		DTOs.map((DTO) => DTOToSecurityPolicy(DTO)),

		{ concurrency: "unbounded" },
	;
};
