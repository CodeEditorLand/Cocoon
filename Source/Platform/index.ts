/**
 * @file Platform Module Index
 * @description
 * Comprehensive platform abstraction layer for Cocoon.
 * Exports all platform modules: OS, Environment, Process, TypeConverter, and Service.
 *
 * **Responsibilities:**
 * - Provide unified export of all platform modules
 * - Enable clean imports for consumers
 * - Document module organization
 *
 * **Usage:**
 * ```typescript
 * import * as Platform from '@codeeditorland/cocoon/Source/Platform';
 * // Or import specific modules
 * import { OS, Environment, Process, TypeConverter } from '@codeeditorland/cocoon/Source/Platform';
 * // Or use Effect-TS service layer
 * import { PlatformServiceTag, DetectPlatform, GetOSInfo } from '@codeeditorland/cocoon/Source/Platform';
 * ```
 *
 * **Element Connections:**
 * - **Air**: Rust workbench imports platform functions for OS operations
 * - **Wind**: Effect-TS services depend on PlatformServiceTag for DI
 * - **Mountain**: TypeConverter exports DTO conversion functions for backend
 * - **Output**: Inspired by VSCode's platform module organization
 */

// Core modules
export * as OS from "./OS.js";
export * as Environment from "./Environment.js";
export * as Process from "./Process.js";
export * as TypeConverter from "./TypeConverter.js";

// Service layer
export * as Service from "./Service.js";

// Direct exports for convenience
export {
	// Service exports
	IPlatformService,
	PlatformService,
	PlatformServiceTag,
	PlatformServiceLayer,
	LivePlatformService,
	TestPlatformService,
	DetectPlatform,
	GetOSInfo,
	NormalizePath,
	GetEnvironmentVariable,
	SetEnvironmentVariable,
	ExecuteCommand,
	SpawnProcess,
	GetHealthStatus,
	InitializePlatformService,
} from "./Service.js";

// OS module re-exports
export {
	PlatformNumber,
	PlatformName,
	OperatingSystem,
	OSArchitecture,
	PATH_SEPARATOR_WINDOWS,
	PATH_SEPARATOR_UNIX,
	LINE_ENDING_WINDOWS,
	LINE_ENDING_UNIX,
	DEFAULT_LANGUAGE,
	DEFAULT_LOCALE,
	IProcessEnvironment,
	INodeProcess,
	OSInfo,
	GetPlatformNumber,
	GetPlatformName,
	GetOperatingSystem,
	GetArchitecture,
	IsWindows,
	IsMacintosh,
	IsLinux,
	IsWeb,
	IsElectron,
	IsCI,
	GetPathSeparator,
	GetLineEnding,
	NormalizePath as NormalizePathOS,
	NormalizePathToUnix,
	NormalizePathToWindows,
	JoinPath,
	GetLocale as GetLocaleOS,
	GetLanguage as GetLanguageOS,
	GetUserAgent,
	IsLittleEndian,
	GetOSInfo as GetOSInfoDirect,
	PlatformToString,
	StringToPlatform,
	IsDefaultLanguage,
	IsEnglishVariant,
	IsAbsolutePath,
	Platform,
	PlatformConstants,
	OS as OSModule,
} from "./OS.js";

// Environment module re-exports
export {
	IProcessEnvironment as IProcessEnvironmentEnv,
	EnvironmentValidationResult,
	EnvironmentValidationRule,
	EnvironmentInfo,
	DEFAULT_LANGUAGE as DEFAULT_LANGUAGE_ENV,
	DEFAULT_LOCALE as DEFAULT_LOCALE_ENV,
	GetEnvironmentVariable as GetEnvironmentVariableDirect,
	GetEnvironmentVariableOr,
	SetEnvironmentVariable as SetEnvironmentVariableDirect,
	DeleteEnvironmentVariable,
	GetAllEnvironmentVariables,
	ValidateEnvironmentVariable,
	GetValidatedEnvironmentVariable,
	GetLanguage as GetLanguageDirect,
	GetLocale as GetLocaleDirect,
	GetHomeDirectory,
	GetTempDirectory,
	GetUserDataDirectory,
	GetPlatformHome,
	GetEnvironmentInfo as GetEnvironmentInfoDirect,
	IsDevelopment,
	IsProduction,
	IsCI as IsCIEnv,
	IsVSCode,
	GetVSCodePath,
	SanitizeName,
	SanitizeValue,
	ClearCache as ClearEnvironmentCache,
	GetEnvironmentVariableEffect,
	GetEnvironmentVariableOrEffect,
	SetEnvironmentVariableEffect,
	GetEnvironmentInfoEffect,
	Environment as EnvironmentModule,
} from "./Environment.js";

// Process module re-exports
export {
	ProcessExitStatus,
	ProcessSpawnOptions,
	ProcessMonitorOptions,
	ProcessInfo,
	ProcessSignal,
	ValidateCommand,
	ValidateArgs,
	SpawnProcess as SpawnProcessDirect,
	ExecuteCommand as ExecuteCommandDirect,
	ForkProcess,
	SendSignal,
	TerminateProcess,
	KillProcess as KillProcessDirect,
	GetProcess as GetProcessDirect,
	GetAllProcesses,
	GetRunningProcesses,
	GetStoppedProcesses,
	UnregisterProcess,
	CleanupAllProcesses,
	MonitorProcess,
	IsProcessRunning,
	GetCurrentPid,
	GetParentPid,
	SpawnProcessEffect,
	ExecuteCommandEffect,
	SendSignalEffect,
	GetProcessEffect,
	Process as ProcessModule,
	DEFAULT_TIMEOUT,
	DEFAULT_MAX_BUFFER,
	DEFAULT_HEARTBEAT_INTERVAL,
	DEFAULT_KILL_TIMEOUT,
	DEFAULT_MAX_RESTARTS,
	DEFAULT_RESTART_DELAY,
	ProcessConstants,
} from "./Process.js";

// TypeConverter module re-exports
export {
	MountainPlatformInfoDTO,
	MountainEnvironmentVariableDTO,
	MountainEnvironmentInfoDTO,
	MountainProcessInfoDTO,
	MountainProcessSpawnOptionsDTO,
	MountainProcessSignalDTO,
	ConvertPlatformNumberToDTO,
	ConvertDTOToPlatformNumber,
	ConvertArchitectureToString,
	ConvertOperatingSystemToNumber,
	ConvertNumberToOperatingSystem,
	ConvertOSInfoToDTO,
	ConvertDTOToOSInfo,
	ConvertEnvironmentVariableToDTO,
	ConvertDTOToEnvironmentVariable,
	ConvertEnvironmentInfoToDTO,
	ConvertDTOToEnvironmentInfo,
	ConvertProcessInfoToDTO,
	ConvertDTOToProcessInfo,
	ConvertProcessSpawnOptionsToDTO,
	ConvertDTOToProcessSpawnOptions,
	ConvertProcessSignalToDTO,
	ConvertDTOToProcessSignal,
	SerializeDTO,
	DeserializeDTO,
	ValidatePlatformInfoDTO,
	ValidateEnvironmentVariableDTO,
	ValidateProcessInfoDTO,
	ConvertOSInfoToDTOEffect,
	DeserializeDTOEffect,
	TypeConverter as TypeConverterModule,
} from "./TypeConverter.js";
