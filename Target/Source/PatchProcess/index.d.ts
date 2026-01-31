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
 * - Windows: Job Objects and AppContainer for process isolation
 * - Linux: seccomp filters for system call restriction
 * - macOS: Sandbox enforcement and entitlements
 * - Security policy synchronization with Mountain
 * - Telemetry integration for security events
 */
export { RunPatchProcess, ReloadSecurityPolicy, PatcherService, type Patcher, } from "./Patcher.js";
export { DefaultSecurityPolicy, TrustedSecurityPolicy, MemoryLimitExceededError, FileAccessDeniedError, NetworkAccessDeniedError, ChildProcessDeniedError, CpuLimitExceededError, ValidatePathAccess, ValidateNetworkAccess, ValidateChildProcess, ValidateEnvironmentVariable, EnforceMemoryLimit, EnforceCpuLimit, PerformSecurityAudit, GetPolicyHash, MergeSecurityPolicies, type SecurityPolicy, } from "./Security.js";
export { InitializeProcessValidation, ValidateFileSystemAccess, ValidateNetworkAccess, ValidateChildProcessSpawn, ValidateMemoryUsage, DetectSuspiciousBehavior, GetValidationMetrics, ResetValidationMetrics, GetProcessValidationState, ClearProcessValidationState, RunSecurityValidation, ValidationError, BehaviorViolationError, type ValidationResult, type ProcessValidationState, } from "./Validator.js";
export { InitializeSecurityLoader, ValidateFileSystemAccessWrapper, ValidateNetworkAccessWrapper, ValidateChildProcessSpawnWrapper, InstallSecurityHooks, GetResourceUsage, CleanupSecurityLoader, LoaderService, LoaderServiceLive, SecurityLive, type Loader, } from "./Loader.js";
export { SecurityPolicyToDTO, DTOToSecurityPolicy, ProcessStateToDTO, DTOToProcessState, ValidationStateToDTO, ValidationResultToDTO, DTOToValidationResult, CreateSecurityEventDTO, SerializeDTO, DeserializeDTO, CamelCaseToPascalCase, PascalCaseToCamelCase, ConvertObjectKeysToPascalCase, ConvertObjectKeysToCamelCase, BatchSecurityPoliciesToDTO, BatchDTOsToSecurityPolicies, ConversionError, type SecurityPolicyDTO, type ProcessStateDTO, type ValidationStateDTO, type SecurityEventDTO, type ValidationResultDTO, } from "./TypeConverter.js";
//# sourceMappingURL=index.d.ts.map