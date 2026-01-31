/**
 * @module Security
 * @description
 * Defines security policies and restrictions for extension process hardening.
 * Contains policy definitions, access control rules, and resource limits.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: Air enforces OS-level security policies set by Cocoon.
 * Resource quotas configured here are synchronized with Air's native enforcement.
 *
 * **Mountain (Security Policies)**: Mountain stores and manages security policy state.
 * Security restrictions are fetched from Mountain's centralized policy management.
 *
 * **Wind (Effect-TS Services)**: Wind services enforce these policies during operations.
 * All Effect-TS services validate against these security boundaries.
 *
 * **Output (VSCode Reference)**: Based on VSCode's extension host security model:
 * - src/vs/workbench/services/extensions/common/extensionHostPolicy.ts
 * - src/vs/base/parts/ipc/common/ipc.ts
 *
 * ## Responsibilities
 *
 * 1. Define security policy structures and defaults
 * 2. enforce resource limits (CPU, memory, file handles)
 * 3. Control file system access permissions
 * 4. Manage network access restrictions
 * 5. Restrict child process spawning
 * 6. Validate environment variables
 * 7. Monitor for security violations
 *
 * ## TODOs
 *
 * - **TBD**: Windows AppContainer integration for process isolation
 * - **TBD**: Linux cgroups resource enforcement
 * - **TBD**: macOS sandbox profiles and entitlements
 * - **TBD**: Security policy versioning and migration
 * - **TBD**: Policy violation telemetry and alerting
 * - **TBD**: Context-aware policies (trusted vs untrusted extensions)
 * - **TBD**: Dynamic policy updates from Mountain
 * - **TBD**: Fine-grained file system ACLs (read-only, read-write)
 */
import { Effect } from "effect";
/**
 * Security policy configuration for extension processes
 * Defines restrictions and resource limits
 */
export interface SecurityPolicy {
    /**
     * Whether this process is allowed to exit gracefully
     */
    readonly AllowExit: boolean;
    /**
     * Maximum memory limit in megabytes (0 = unlimited)
     */
    readonly MaxMemoryMB: number;
    /**
     * Maximum CPU usage percentage (0-100, 0 = unlimited)
     */
    readonly MaxCpuPercent: number;
    /**
     * Whether network access is allowed
     */
    readonly AllowNetwork: boolean;
    /**
     * Whitelisted network endpoints (regex patterns)
     */
    readonly AllowedEndpoints: readonly string[];
    /**
     * Whether child process spawning is allowed
     */
    readonly AllowChildProcesses: boolean;
    /**
     * Allowlisted child process commands
     */
    readonly AllowedChildCommands: readonly string[];
    /**
     * Allowed file system paths
     */
    readonly AllowedPaths: readonly string[];
    /**
     * Denied file system paths (overrides allowed)
     */
    readonly DeniedPaths: readonly string[];
    /**
     * Maximum number of file descriptors (0 = OS default)
     */
    readonly MaxFileDescriptors: number;
    /**
     * Maximum number of concurrent timers (0 = unlimited)
     */
    readonly MaxTimers: number;
}
/**
 * Default security policy with strict restrictions
 * Extensions run in a secure sandbox environment
 */
export declare const DefaultSecurityPolicy: SecurityPolicy;
/**
 * Trusted security policy for internal extensions
 * Less restrictive for trusted code
 */
export declare const TrustedSecurityPolicy: SecurityPolicy;
declare const MemoryLimitExceededError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "MemoryLimitExceededError";
} & Readonly<A>;
/**
 * Tagged error for memory limit violations
 */
export declare class MemoryLimitExceededError extends MemoryLimitExceededError_base<{
    readonly LimitMB: number;
    readonly AttemptedMB: number;
    readonly ProcessId: number;
}> {
}
declare const FileAccessDeniedError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "FileAccessDeniedError";
} & Readonly<A>;
/**
 * Tagged error for file system access violations
 */
export declare class FileAccessDeniedError extends FileAccessDeniedError_base<{
    readonly Path: string;
    readonly Operation: "read" | "write" | "delete";
    readonly Reason: string;
}> {
}
declare const NetworkAccessDeniedError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "NetworkAccessDeniedError";
} & Readonly<A>;
/**
 * Tagged error for network access violations
 */
export declare class NetworkAccessDeniedError extends NetworkAccessDeniedError_base<{
    readonly Endpoint: string;
    readonly AttemptedOperation: "connect" | "listen";
    readonly Reason: string;
}> {
}
declare const ChildProcessDeniedError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ChildProcessDeniedError";
} & Readonly<A>;
/**
 * Tagged error for child process violations
 */
export declare class ChildProcessDeniedError extends ChildProcessDeniedError_base<{
    readonly Command: string;
    readonly Arguments: readonly string[];
    readonly Reason: string;
}> {
}
declare const CpuLimitExceededError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "CpuLimitExceededError";
} & Readonly<A>;
/**
 * Tagged error for CPU limit violations
 */
export declare class CpuLimitExceededError extends CpuLimitExceededError_base<{
    readonly LimitPercent: number;
    readonly CurrentUsage: number;
    readonly ProcessId: number;
}> {
}
/**
 * Validate file path against security policy
 * Returns true if access is allowed
 */
export declare const ValidatePathAccess: (PathString: string, Operation: "read" | "write" | "delete", Policy?: SecurityPolicy) => boolean;
/**
 * Validate network endpoint against security policy
 * Returns true if access is allowed
 */
export declare const ValidateNetworkAccess: (Endpoint: string, Policy?: SecurityPolicy) => boolean;
/**
 * Validate child process command against security policy
 * Returns true if spawning is allowed
 */
export declare const ValidateChildProcess: (Command: string, Arguments: readonly string[], Policy?: SecurityPolicy) => boolean;
/**
 * Validate environment variable for security
 * Removes or sanitizes dangerous variables
 */
export declare const ValidateEnvironmentVariable: (Name: string, Value: string) => string;
/**
 * Monitor memory usage and enforce limits
 * Returns Effect that checks memory and throws if limit exceeded
 */
export declare const EnforceMemoryLimit: Effect.Effect<void, MemoryLimitExceededError, never>;
/**
 * Monitor CPU usage and enforce limits
 * TODO: Implement actual CPU monitoring via native module
 */
export declare const EnforceCpuLimit: Effect.Effect<void, never, never>;
/**
 * Perform security audit of current process
 * Returns security assessment report
 */
export declare const PerformSecurityAudit: Effect.Effect<{
    MemoryUsage: NodeJS.MemoryUsage;
    Pid: number;
    Ppid: number;
    Cwd: string;
    ExecArgv: string[];
    Env: number;
    AllowedPaths: readonly string[];
    DeniedPaths: readonly string[];
    AllowNetwork: boolean;
    AllowChildProcesses: boolean;
    MaxMemoryMB: number;
    MaxCpuPercent: number;
    Timestamp: number;
}, never, never>;
/**
 * Get security policy hash for comparison
 * Used to detect policy changes
 */
export declare const GetPolicyHash: (Policy?: SecurityPolicy) => string;
/**
 * Merge default policy with overrides
 */
export declare const MergeSecurityPolicies: (Overrides: Partial<SecurityPolicy>) => SecurityPolicy;
export {};
//# sourceMappingURL=Security.d.ts.map