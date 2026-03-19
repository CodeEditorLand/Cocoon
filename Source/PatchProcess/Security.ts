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
 * FUTURE: Windows AppContainer - use Windows.Security
 * FUTURE: Linux cgroups - use cgroup v2 API
 * FUTURE: macOS sandbox - use sandbox.h framework
 * FUTURE: Policy versioning - implement policy migration
 * FUTURE: Violation telemetry - integrate with SecurityService
 * FUTURE: Context-aware - trust levels per extension
 * DEPENDENCY: Dynamic policies - pending Mountain backend
 * FUTURE: File ACLs - implement read-only/read-write modes
 */

import * as FileSystem from "node:fs";
import * as Path from "node:path";
import * as URL from "node:url";

import { Data, Effect } from "effect";

// --- Security Policy Definition ---

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
export const DefaultSecurityPolicy: SecurityPolicy = {
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
	MaxTimers: 1000,
};

/**
 * Trusted security policy for internal extensions
 * Less restrictive for trusted code
 */
export const TrustedSecurityPolicy: SecurityPolicy = {
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
	MaxTimers: 10000,
};

// --- Security Violation Types ---

/**
 * Tagged error for memory limit violations
 */
export class MemoryLimitExceededError extends Data.TaggedError(
	"MemoryLimitExceededError",
)<{
	readonly LimitMB: number;
	readonly AttemptedMB: number;
	readonly ProcessId: number;
}> {}

/**
 * Tagged error for file system access violations
 */
export class FileAccessDeniedError extends Data.TaggedError(
	"FileAccessDeniedError",
)<{
	readonly Path: string;
	readonly Operation: "read" | "write" | "delete";
	readonly Reason: string;
}> {}

/**
 * Tagged error for network access violations
 */
export class NetworkAccessDeniedError extends Data.TaggedError(
	"NetworkAccessDeniedError",
)<{
	readonly Endpoint: string;
	readonly AttemptedOperation: "connect" | "listen";
	readonly Reason: string;
}> {}

/**
 * Tagged error for child process violations
 */
export class ChildProcessDeniedError extends Data.TaggedError(
	"ChildProcessDeniedError",
)<{
	readonly Command: string;
	readonly Arguments: readonly string[];
	readonly Reason: string;
}> {}

/**
 * Tagged error for CPU limit violations
 */
export class CpuLimitExceededError extends Data.TaggedError(
	"CpuLimitExceededError",
)<{
	readonly LimitPercent: number;
	readonly CurrentUsage: number;
	readonly ProcessId: number;
}> {}

// --- Security Policy Enforcement ---

/**
 * Validate file path against security policy
 * Returns true if access is allowed
 */
export const ValidatePathAccess = (
	PathString: string,
	Operation: "read" | "write" | "delete",
	Policy: SecurityPolicy = DefaultSecurityPolicy,
): boolean => {
	// Normalize the path
	const NormalizedPath = Path.normalize(PathString);
	const ResolvedPath = Path.resolve(NormalizedPath);

	// Check denied paths first (blacklist overrides whitelist)
	for (const DeniedPath of Policy.DeniedPaths) {
		const ResolvedDeniedPath = Path.resolve(DeniedPath);
		if (
			ResolvedPath === ResolvedDeniedPath ||
			ResolvedPath.startsWith(ResolvedDeniedPath + Path.sep)
		) {
			return false;
		}
	}

	// If no specific allowed paths, allow everything except denied
	if (Policy.AllowedPaths.length === 0) {
		return true;
	}

	// Check allowed paths
	for (const AllowedPath of Policy.AllowedPaths) {
		const ResolvedAllowedPath = Path.resolve(AllowedPath);
		if (
			ResolvedPath === ResolvedAllowedPath ||
			ResolvedPath.startsWith(ResolvedAllowedPath + Path.sep)
		) {
			return true;
		}
	}

	return false;
};

/**
 * Validate network endpoint against security policy
 * Returns true if access is allowed
 */
export const ValidateNetworkAccess = (
	Endpoint: string,
	Policy: SecurityPolicy = DefaultSecurityPolicy,
): boolean => {
	if (!Policy.AllowNetwork) {
		return false;
	}

	if (Policy.AllowedEndpoints.length === 0) {
		return true;
	}

	// Parse endpoint URL
	let ParsedUrl: URL.URL;
	try {
		ParsedUrl = new URL.URL(Endpoint);
	} catch (Error) {
		// Not a valid URL, try parsing as hostname:port
		return true;
	}

	// Check against allowed patterns
	for (const Pattern of Policy.AllowedEndpoints) {
		const Regex = new RegExp(Pattern);
		if (Regex.test(Endpoint)) {
			return true;
		}
	}

	return false;
};

/**
 * Validate child process command against security policy
 * Returns true if spawning is allowed
 */
export const ValidateChildProcess = (
	Command: string,
	Arguments: readonly string[],
	Policy: SecurityPolicy = DefaultSecurityPolicy,
): boolean => {
	if (!Policy.AllowChildProcesses) {
		return false;
	}

	// Get the base command name
	const CommandName = Command.split(Path.sep).pop() || Command;

	// Check against allowed commands
	if (Policy.AllowedChildCommands.length === 0) {
		return true;
	}

	for (const AllowedCommand of Policy.AllowedChildCommands) {
		if (CommandName === AllowedCommand) {
			return true;
		}
	}

	return false;
};

/**
 * Validate environment variable for security
 * Removes or sanitizes dangerous variables
 */
export const ValidateEnvironmentVariable = (
	Name: string,
	Value: string,
): string => {
	// Block certain environment variables
	const BlockedVariables = [
		"NODE_OPTIONS",
		"NODE_DEBUG",
		"NODE_ENV",
		"NODE_EXTRA_CA_CERTS",
	];

	if (BlockedVariables.includes(Name)) {
		return "";
	}

	// Sanitize values
	const UnsafePatterns = [
		/--inspect/i,
		/--debug/i,
		/--eval/i,
		/--print/i,
		/-e\s+/i,
		/-p\s+/i,
	];

	for (const Pattern of UnsafePatterns) {
		if (Pattern.test(Value)) {
			return "";
		}
	}

	return Value;
};

/**
 * Monitor memory usage and enforce limits
 * Returns Effect that checks memory and throws if limit exceeded
 */
export const EnforceMemoryLimit = Effect.gen(function* () {
	const Policy = DefaultSecurityPolicy;
	if (Policy.MaxMemoryMB <= 0) {
		return yield* Effect.logTrace("No memory limit configured");
	}

	// Get current memory usage
	const MemoryUsage = process.memoryUsage();
	const UsedMemoryMB = MemoryUsage.heapUsed / (1024 * 1024);

	if (UsedMemoryMB > Policy.MaxMemoryMB) {
		yield* Effect.logError(
			`Memory limit exceeded: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`,
		);
		return yield* Effect.fail(
			new MemoryLimitExceededError({
				LimitMB: Policy.MaxMemoryMB,
				AttemptedMB: UsedMemoryMB,
				ProcessId: process.pid,
			}),
		);
	}

	yield* Effect.logTrace(
		`Memory usage within limits: ${UsedMemoryMB.toFixed(2)}MB / ${Policy.MaxMemoryMB}MB`,
	);
});

/**
 * Monitor CPU usage and enforce limits
 * TODO: Implement actual CPU monitoring via native module
 */
export const EnforceCpuLimit = Effect.gen(function* () {
	const Policy = DefaultSecurityPolicy;
	if (Policy.MaxCpuPercent <= 0) {
		return yield* Effect.logTrace("No CPU limit configured");
	}

	// TODO: Implement actual CPU monitoring
	// This would require a native module to get accurate CPU usage
	yield* Effect.logDebug(
		`CPU limit configured: ${Policy.MaxCpuPercent}% (monitoring not yet implemented)`,
	);
});

// --- Security Audit ---

/**
 * Perform security audit of current process
 * Returns security assessment report
 */
export const PerformSecurityAudit = Effect.gen(function* () {
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
		Timestamp: Date.now(),
	};

	yield* Effect.logInfo("Security audit completed", { Report });

	return Report;
});

/**
 * Get security policy hash for comparison
 * Used to detect policy changes
 */
export const GetPolicyHash = (
	Policy: SecurityPolicy = DefaultSecurityPolicy,
): string => {
	const PolicyString = JSON.stringify(Policy, Object.keys(Policy).sort());
	return Buffer.from(PolicyString).toString("base64").slice(0, 16);
};

/**
 * Merge default policy with overrides
 */
export const MergeSecurityPolicies = (
	Overrides: Partial<SecurityPolicy>,
): SecurityPolicy => {
	return {
		AllowExit: Overrides.AllowExit ?? DefaultSecurityPolicy.AllowExit,
		MaxMemoryMB: Overrides.MaxMemoryMB ?? DefaultSecurityPolicy.MaxMemoryMB,
		MaxCpuPercent:
			Overrides.MaxCpuPercent ?? DefaultSecurityPolicy.MaxCpuPercent,
		AllowNetwork:
			Overrides.AllowNetwork ?? DefaultSecurityPolicy.AllowNetwork,
		AllowedEndpoints:
			Overrides.AllowedEndpoints ??
			DefaultSecurityPolicy.AllowedEndpoints,
		AllowChildProcesses:
			Overrides.AllowChildProcesses ??
			DefaultSecurityPolicy.AllowChildProcesses,
		AllowedChildCommands:
			Overrides.AllowedChildCommands ??
			DefaultSecurityPolicy.AllowedChildCommands,
		AllowedPaths:
			Overrides.AllowedPaths ?? DefaultSecurityPolicy.AllowedPaths,
		DeniedPaths: Overrides.DeniedPaths ?? DefaultSecurityPolicy.DeniedPaths,
		MaxFileDescriptors:
			Overrides.MaxFileDescriptors ??
			DefaultSecurityPolicy.MaxFileDescriptors,
		MaxTimers: Overrides.MaxTimers ?? DefaultSecurityPolicy.MaxTimers,
	};
};
