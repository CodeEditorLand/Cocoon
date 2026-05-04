/**
 * @module PatchProcess
 * @description
 * Process hardening and security system for extension isolation.
 * Provides comprehensive security controls for extension processes.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: OS-level security enforcement and native process controls
 * **Mountain (Security Policies)**: Centralized security policy management
 * **Wind (Effect-TS Services)**: Security-aware service operations
 * **Output (VSCode Reference)**: Based on VSCode extension host security patterns
 *
 * ## TODOs
 *
 * FUTURE: Windows job objects - use win32 JobObject API
 * FUTURE: Linux seccomp - use libseccomp for syscall filtering
 * FUTURE: macOS sandbox - use OS Sandbox Entitlements
 * DEPENDENCY: Mountain policy sync - pending Mountain backend
 * FUTURE: Security telemetry - integrate with SecurityService
 */

// --- Patcher Module ---
export {
	RunPatchProcess,
	ReloadSecurityPolicy,
	PatcherService,
	type Patcher,
} from "./Patcher.js";

// --- Security Module ---
export {
	DefaultSecurityPolicy,
	TrustedSecurityPolicy,
	MemoryLimitExceededError,
	FileAccessDeniedError,
	NetworkAccessDeniedError,
	ChildProcessDeniedError,
	CpuLimitExceededError,
	ValidatePathAccess,
	ValidateNetworkAccess,
	ValidateChildProcess,
	ValidateEnvironmentVariable,
	EnforceMemoryLimit,
	EnforceCpuLimit,
	PerformSecurityAudit,
	GetPolicyHash,
	MergeSecurityPolicies,
	type SecurityPolicy,
} from "./Security.js";

// --- Validator Module ---
export {
	InitializeProcessValidation,
	ValidateFileSystemAccess,
	ValidateNetworkAccess as ValidateNetworkAccessValidator,
	ValidateChildProcessSpawn,
	ValidateMemoryUsage,
	DetectSuspiciousBehavior,
	GetValidationMetrics,
	ResetValidationMetrics,
	GetProcessValidationState,
	ClearProcessValidationState,
	RunSecurityValidation,
	ValidationError,
	BehaviorViolationError,
	type ValidationResult,
	type ProcessValidationState,
} from "./Validator.js";

// --- Loader Module ---
export {
	InitializeSecurityLoader,
	ValidateFileSystemAccessWrapper,
	ValidateNetworkAccessWrapper,
	ValidateChildProcessSpawnWrapper,
	InstallSecurityHooks,
	GetResourceUsage,
	CleanupSecurityLoader,
	LoaderService,
	LoaderServiceLive,
	SecurityLive,
	type Loader,
} from "./Loader.js";

// --- TypeConverter Module ---
export {
	SecurityPolicyToDTO,
	DTOToSecurityPolicy,
	ProcessStateToDTO,
	DTOToProcessState,
	ValidationStateToDTO,
	ValidationResultToDTO,
	DTOToValidationResult,
	CreateSecurityEventDTO,
	SerializeDTO,
	DeserializeDTO,
	CamelCaseToPascalCase,
	PascalCaseToCamelCase,
	ConvertObjectKeysToPascalCase,
	ConvertObjectKeysToCamelCase,
	BatchSecurityPoliciesToDTO,
	BatchDTOsToSecurityPolicies,
	ConversionError,
	type SecurityPolicyDTO,
	type ProcessStateDTO,
	type ValidationStateDTO,
	type SecurityEventDTO,
	type ValidationResultDTO,
} from "./Type/Converter.js";
