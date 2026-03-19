/**
 * @module Validator
 * @description
 * Validates extension processes before allowing execution and monitors for suspicious activity.
 * Performs threat detection, behavioral analysis, and security compliance checks.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: Air provides native level validation and threat detection.
 * Air's security modules perform OS-level process validation and enforce restrictions.
 *
 * **Mountain (Security Policies)**: Mountain stores validation rules and threat intelligence.
 * Validation patterns and security thresholds are synchronized from Mountain's policy store.
 *
 * **Wind (Effect-TS Services)**: Wind services use Validator to check operations before execution.
 * All Effect-TS operations pass through validation layers for security compliance.
 *
 * **Output (VSCode Reference)**: Based on VSCode's extension host validation:
 * - src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts
 * - src/vs/workbench/services/extensions/common/extensionsValidator.ts
 *
 * ## Responsibilities
 *
 * 1. Validate extension processes before execution
 * 2. Monitor process behavior for suspicious patterns
 * 3. Detect resource abuse or limit violations
 * 4. Validate file system access patterns
 * 5. Detect network abuse or unauthorized connections
 * 6. Analyze child process spawning patterns
 * 7. Generate security alerts for violations
 *
 * ## TODOs
 *
 * - **TBD**: Machine learning based anomaly detection
 * - **TBD**: Behavioral profiling and baseline establishment
 * - **TBD**: Real-time threat integration with external security services
 * - **TBD**: Process signature verification
 * - **TBD**: Code integrity checks
 * - **TBD**: Memory analysis for injected code
 * - **TBD**: Rate limiting for validation checks
 * - **TBD**: Whitelisting mechanism for trusted extensions
 */

import * as FileSystem from "node:fs";
import * as Path from "node:path";
import * as Process from "node:process";

import { Data, Effect, Queue } from "effect";

import {
	DefaultSecurityPolicy,
	SecurityPolicy,
	ValidateChildProcess,
	ValidateNetworkAccess,
	ValidatePathAccess,
} from "./Security.js";

// --- Validation Result Types ---

/**
 * Result of a validation operation
 */
export interface ValidationResult {
	readonly Valid: boolean;
	readonly Reason?: string;
	readonly Severity: "info" | "warning" | "error" | "critical";
	readonly Timestamp: number;
}

/**
 * Process validation state tracking
 */
interface ProcessValidationState {
	readonly ProcessId: number;
	readonly StartTime: number;
	readonly FileAccessCount: Map<string, number>;
	readonly NetworkAccessCount: Map<string, number>;
	readonly ChildProcessCount: number;
	readonly ViolationCount: number;
	readonly SecurityPolicy: SecurityPolicy;
}

// --- Validation Errors ---

/**
 * Tagged error for validation failures
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
	readonly ProcessId: number;
	readonly ValidationType: string;
	readonly Reason: string;
	readonly Severity: "warning" | "error" | "critical";
}> {
	public override readonly message: string;
	constructor(Properties: any) {
		super(Properties);
		this.message = `Validation failed for process ${Properties.ProcessId}: ${Properties.Reason}`;
	}
}

/**
 * Tagged error for process behavior violations
 */
export class BehaviorViolationError extends Data.TaggedError(
	"BehaviorViolationError",
)<{
	readonly ProcessId: number;
	readonly ViolationType: string;
	readonly Description: string;
	readonly DetectedAt: number;
}> {}

// --- Metrics Tracking ---

interface ValidationMetrics {
	readonly TotalValidations: number;
	readonly FailedValidations: number;
	readonly LastValidationTime: number;
	readonly AverageValidationTime: number;
}

class ValidationMetricsStore {
	private static _instance: ValidationMetricsStore;
	private _metrics: ValidationMetrics = {
		TotalValidations: 0,
		FailedValidations: 0,
		LastValidationTime: 0,
		AverageValidationTime: 0,
	};

	public static GetInstance(): ValidationMetricsStore {
		if (!ValidationMetricsStore._instance) {
			ValidationMetricsStore._instance = new ValidationMetricsStore();
		}
		return ValidationMetricsStore._instance;
	}

	public RecordValidation(StartTime: number, Success: boolean): void {
		const EndTime = Date.now();
		const Duration = EndTime - StartTime;

		this._metrics.TotalValidations++;
		this._metrics.LastValidationTime = EndTime;

		if (!Success) {
			this._metrics.FailedValidations++;
		}

		// Update average
		this._metrics.AverageValidationTime =
			(this._metrics.AverageValidationTime *
				(this._metrics.TotalValidations - 1) +
				Duration) /
			this._metrics.TotalValidations;
	}

	public GetMetrics(): ValidationMetrics {
		return { ...this._metrics };
	}

	public Reset(): void {
		this._metrics = {
			TotalValidations: 0,
			FailedValidations: 0,
			LastValidationTime: 0,
			AverageValidationTime: 0,
		};
	}
}

// --- State Management ---

const ProcessValidationStates = new Map<number, ProcessValidationState>();

let ValidationAlertQueue: Queue.Queue<ValidationResult> | null = null;

// --- Validation Functions ---

/**
 * Initialize process validation state
 */
export const InitializeProcessValidation = Effect.gen(function* () {
	const State: ProcessValidationState = {
		ProcessId: Process.pid,
		StartTime: Date.now(),
		FileAccessCount: new Map(),
		NetworkAccessCount: new Map(),
		ChildProcessCount: 0,
		ViolationCount: 0,
		SecurityPolicy: DefaultSecurityPolicy,
	};

	ProcessValidationStates.set(Process.pid, State);

	ValidationAlertQueue = yield* Queue.unbounded<ValidationResult>();

	yield* Effect.logInfo("Process validation initialized", {
		ProcessId: Process.pid,
	});

	return State;
});

/**
 * Validate file system access
 */
export const ValidateFileSystemAccess = (
	File: string,
	Operation: "read" | "write" | "delete",
): Effect.Effect<ValidationResult, ValidationError> =>
	Effect.gen(function* () {
		const StartTime = Date.now();
		const Metrics = ValidationMetricsStore.GetInstance();

		const State = ProcessValidationStates.get(Process.pid);
		if (!State) {
			const Result: ValidationResult = {
				Valid: false,
				Reason: "Process validation state not initialized",
				Severity: "error",
				Timestamp: Date.now(),
			};
			Metrics.RecordValidation(StartTime, false);
			return Result;
		}

		// Check against security policy
		const PathValid = ValidatePathAccess(
			File,
			Operation,
			State.SecurityPolicy,
		);

		if (!PathValid) {
			State.ViolationCount++;

			const Count = (State.FileAccessCount.get(File) || 0) + 1;
			State.FileAccessCount.set(File, Count);

			const Result: ValidationResult = {
				Valid: false,
				Reason: `File access denied: ${Operation} on ${File}`,
				Severity: "error",
				Timestamp: Date.now(),
			};

			Metrics.RecordValidation(StartTime, false);

			yield* Effect.logWarning("File system access denied", {
				File,
				Operation,
				ProcessId: Process.pid,
			});

			return Result;
		}

		const Result: ValidationResult = {
			Valid: true,
			Severity: "info",
			Timestamp: Date.now(),
		};

		Metrics.RecordValidation(StartTime, true);
		return Result;
	});

/**
 * Validate network access
 */
export const ValidateNetworkAccess = (
	Endpoint: string,
	Operation: "connect" | "listen",
): Effect.Effect<ValidationResult, ValidationError> =>
	Effect.gen(function* () {
		const StartTime = Date.now();
		const Metrics = ValidationMetricsStore.GetInstance();

		const State = ProcessValidationStates.get(Process.pid);
		if (!State) {
			const Result: ValidationResult = {
				Valid: false,
				Reason: "Process validation state not initialized",
				Severity: "error",
				Timestamp: Date.now(),
			};
			Metrics.RecordValidation(StartTime, false);
			return Result;
		}

		const NetworkValid = ValidateNetworkAccess(
			Endpoint,
			State.SecurityPolicy,
		);

		if (!NetworkValid) {
			State.ViolationCount++;

			const Count = (State.NetworkAccessCount.get(Endpoint) || 0) + 1;
			State.NetworkAccessCount.set(Endpoint, Count);

			const Result: ValidationResult = {
				Valid: false,
				Reason: `Network access denied: ${Operation} to ${Endpoint}`,
				Severity: "error",
				Timestamp: Date.now(),
			};

			Metrics.RecordValidation(StartTime, false);

			yield* Effect.logWarning("Network access denied", {
				Endpoint,
				Operation,
				ProcessId: Process.pid,
			});

			return Result;
		}

		const Result: ValidationResult = {
			Valid: true,
			Severity: "info",
			Timestamp: Date.now(),
		};

		Metrics.RecordValidation(StartTime, true);
		return Result;
	});

/**
 * Validate child process spawning
 */
export const ValidateChildProcessSpawn = (
	Command: string,
	Arguments: readonly string[],
): Effect.Effect<ValidationResult, ValidationError> =>
	Effect.gen(function* () {
		const StartTime = Date.now();
		const Metrics = ValidationMetricsStore.GetInstance();

		const State = ProcessValidationStates.get(Process.pid);
		if (!State) {
			const Result: ValidationResult = {
				Valid: false,
				Reason: "Process validation state not initialized",
				Severity: "error",
				Timestamp: Date.now(),
			};
			Metrics.RecordValidation(StartTime, false);
			return Result;
		}

		const SpawnValid = ValidateChildProcess(
			Command,
			Arguments,
			State.SecurityPolicy,
		);

		if (!SpawnValid) {
			State.ViolationCount++;
			State.ChildProcessCount++;

			const Result: ValidationResult = {
				Valid: false,
				Reason: `Child process spawning denied: ${Command}`,
				Severity: "error",
				Timestamp: Date.now(),
			};

			Metrics.RecordValidation(StartTime, false);

			yield* Effect.logWarning("Child process spawn denied", {
				Command,
				Arguments,
				ProcessId: Process.pid,
			});

			return Result;
		}

		State.ChildProcessCount++;

		const Result: ValidationResult = {
			Valid: true,
			Severity: "info",
			Timestamp: Date.now(),
		};

		Metrics.RecordValidation(StartTime, true);
		return Result;
	});

/**
 * Validate process memory usage
 */
export const ValidateMemoryUsage = Effect.gen(function* () {
	const StartTime = Date.now();
	const Metrics = ValidationMetricsStore.GetInstance();

	const State = ProcessValidationStates.get(Process.pid);
	if (!State) {
		const Result: ValidationResult = {
			Valid: false,
			Reason: "Process validation state not initialized",
			Severity: "error",
			Timestamp: Date.now(),
		};
		Metrics.RecordValidation(StartTime, false);
		return Result;
	}

	const MemoryUsage = Process.memoryUsage();
	const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);
	const MaxMemoryMB = State.SecurityPolicy.MaxMemoryMB;

	if (MaxMemoryMB > 0 && UsedMemoryMB > MaxMemoryMB) {
		State.ViolationCount++;

		const Result: ValidationResult = {
			Valid: false,
			Reason: `Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${MaxMemoryMB}MB`,
			Severity: "critical",
			Timestamp: Date.now(),
		};

		Metrics.RecordValidation(StartTime, false);

		yield* Effect.logError("Memory limit exceeded", {
			UsedMemoryMB,
			MaxMemoryMB,
			ProcessId: Process.pid,
		});

		return Result;
	}

	const Result: ValidationResult = {
		Valid: true,
		Severity: "info",
		Timestamp: Date.now(),
	};

	Metrics.RecordValidation(StartTime, true);
	return Result;
});

/**
 * Detect suspicious behavior patterns
 * Analyzes accumulated metrics for anomalies
 */
export const DetectSuspiciousBehavior = Effect.gen(function* () {
	const State = ProcessValidationStates.get(Process.pid);
	if (!State) {
		return yield* Effect.fail(
			new ValidationError({
				ProcessId: Process.pid,
				ValidationType: "BehaviorDetection",
				Reason: "Process validation state not initialized",
				Severity: "error",
			}),
		);
	}

	const UptimeMinutes = (Date.now() - State.StartTime) / 60000;
	const AccessRate = Array.from(State.FileAccessCount.values()).reduce(
		(a, b) => a + b,
		0,
	);
	const NetworkRate = Array.from(State.NetworkAccessCount.values()).reduce(
		(a, b) => a + b,
		0,
	);

	// Detect rapid file access (possible scanning)
	if (UptimeMinutes > 0 && AccessRate / UptimeMinutes > 100) {
		yield* Effect.logWarning("Suspicious file access rate detected", {
			AccessRate,
			UptimeMinutes,
			ProcessId: Process.pid,
		});
	}

	// Detect many network connections (possible exfiltration)
	if (UptimeMinutes > 0 && NetworkRate / UptimeMinutes > 10) {
		yield* Effect.logWarning("Suspicious network activity detected", {
			NetworkRate,
			UptimeMinutes,
			ProcessId: Process.pid,
		});
	}

	// Detect excessive child processes
	if (State.ChildProcessCount > 50) {
		yield* Effect.logWarning("Excessive child process spawning", {
			ChildProcessCount: State.ChildProcessCount,
			ProcessId: Process.pid,
		});
	}

	// Detect many security violations
	if (State.ViolationCount > 10) {
		yield* Effect.logError("Multiple security violations detected", {
			ViolationCount: State.ViolationCount,
			ProcessId: Process.pid,
		});
	}

	return {
		AccessRate,
		NetworkRate,
		ChildProcessCount: State.ChildProcessCount,
		ViolationCount: State.ViolationCount,
	};
});

/**
 * Get validation metrics
 */
export const GetValidationMetrics = (): ValidationMetrics => {
	return ValidationMetricsStore.GetInstance().GetMetrics();
};

/**
 * Reset validation metrics
 */
export const ResetValidationMetrics = Effect.sync(() => {
	ValidationMetricsStore.GetInstance().Reset();
	return;
});

/**
 * Get process validation state
 */
export const GetProcessValidationState = (
	ProcessId: number = Process.pid,
): ProcessValidationState | undefined => {
	return ProcessValidationStates.get(ProcessId);
};

/**
 * Clear process validation state
 */
export const ClearProcessValidationState = (
	ProcessId: number = Process.pid,
): Effect.Effect<void> => {
	return Effect.sync(() => {
		ProcessValidationStates.delete(ProcessId);
	});
};

/**
 * Run comprehensive security validation
 * Performs all validation checks in sequence
 */
export const RunSecurityValidation = Effect.gen(function* () {
	yield* ValidateMemoryUsage;

	const BehaviorCheck = yield* DetectSuspiciousBehavior;

	const Result = {
		ProcessId: Process.pid,
		Timestamp: Date.now(),
		BehaviorCheck,
		Metrics: GetValidationMetrics(),
	};

	yield* Effect.logInfo(
		"Comprehensive security validation completed",
		Result,
	);

	return Result;
});
