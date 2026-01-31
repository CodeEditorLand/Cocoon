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
import { Effect } from "effect";
import { SecurityPolicy } from "./Security.js";
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
declare const ValidationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ValidationError";
} & Readonly<A>;
/**
 * Tagged error for validation failures
 */
export declare class ValidationError extends ValidationError_base<{
    readonly ProcessId: number;
    readonly ValidationType: string;
    readonly Reason: string;
    readonly Severity: "warning" | "error" | "critical";
}> {
    readonly message: string;
    constructor(Properties: any);
}
declare const BehaviorViolationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "BehaviorViolationError";
} & Readonly<A>;
/**
 * Tagged error for process behavior violations
 */
export declare class BehaviorViolationError extends BehaviorViolationError_base<{
    readonly ProcessId: number;
    readonly ViolationType: string;
    readonly Description: string;
    readonly DetectedAt: number;
}> {
}
interface ValidationMetrics {
    readonly TotalValidations: number;
    readonly FailedValidations: number;
    readonly LastValidationTime: number;
    readonly AverageValidationTime: number;
}
/**
 * Initialize process validation state
 */
export declare const InitializeProcessValidation: Effect.Effect<ProcessValidationState, never, never>;
/**
 * Validate file system access
 */
export declare const ValidateFileSystemAccess: (File: string, Operation: "read" | "write" | "delete") => Effect.Effect<ValidationResult, ValidationError>;
/**
 * Validate network access
 */
export declare const ValidateNetworkAccess: (Endpoint: string, Operation: "connect" | "listen") => Effect.Effect<ValidationResult, ValidationError>;
/**
 * Validate child process spawning
 */
export declare const ValidateChildProcessSpawn: (Command: string, Arguments: readonly string[]) => Effect.Effect<ValidationResult, ValidationError>;
/**
 * Validate process memory usage
 */
export declare const ValidateMemoryUsage: Effect.Effect<ValidationResult, never, never>;
/**
 * Detect suspicious behavior patterns
 * Analyzes accumulated metrics for anomalies
 */
export declare const DetectSuspiciousBehavior: Effect.Effect<{
    AccessRate: number;
    NetworkRate: number;
    ChildProcessCount: number;
    ViolationCount: number;
}, ValidationError, never>;
/**
 * Get validation metrics
 */
export declare const GetValidationMetrics: () => ValidationMetrics;
/**
 * Reset validation metrics
 */
export declare const ResetValidationMetrics: Effect.Effect<void, never, never>;
/**
 * Get process validation state
 */
export declare const GetProcessValidationState: (ProcessId?: number) => ProcessValidationState | undefined;
/**
 * Clear process validation state
 */
export declare const ClearProcessValidationState: (ProcessId?: number) => Effect.Effect<void>;
/**
 * Run comprehensive security validation
 * Performs all validation checks in sequence
 */
export declare const RunSecurityValidation: Effect.Effect<{
    ProcessId: number;
    Timestamp: number;
    BehaviorCheck: {
        AccessRate: number;
        NetworkRate: number;
        ChildProcessCount: number;
        ViolationCount: number;
    };
    Metrics: ValidationMetrics;
}, ValidationError, never>;
export {};
//# sourceMappingURL=Validator.d.ts.map