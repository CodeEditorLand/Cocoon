/**
 * @file Type Converter - Platform to Mountain DTO Mapping
 * @description
 * Provides type conversion utilities for mapping Cocoon Platform types
 * to Mountain DTOs (Data Transfer Objects) for Tauri backend communication.
 * Includes bidirectional conversion, validation, and serialization.
 *
 * **Responsibilities:**
 * - Convert Platform OS types to Mountain DTOs
 * - Convert Platform Environment types to Mountain DTOs
 * - Convert Platform Process types to Mountain DTOs
 * - Convert Mountain DTOs back to Platform types
 * - Validate DTOs before serialization
 * - Handle platform-specific value transformations
 * - Provide safe type conversions with error handling
 *
 * **Element Connections:**
 * - **Air**: Rust workbench uses converted types for cross-language communication
 * - **Wind**: Effect-TS services consume Mountain DTOs via these converters
 * - **Mountain**: DTOs must match Tauri backend protocol exactly
 * - **Output**: Inspired by VSCode's type conversion patterns
 *
 * **TODOs:**
 * DEPENDENCY: Mountain DTO definitions - pending Mountain/Source/Platform.dto
 * DEPENDENCY: Mountain protocol format - use gRPC/protobuf as per Mountain spec
 * FUTURE: Type guards - add isOSInfo, isEnvironmentInfo type predicates
 * FUTURE: Schema validation - use zod for runtime type checking
 * DEPENDENCY: Wind Effect converters - create Effect-based streaming converters
 * PERFORMANCE: Conversion cache - use MemoCache for frequent conversions
 * TESTING: Unit tests - add vitest test suite for each converter
 * SECURITY: DTO validation - sanitize all input before deserialization
 * DOCUMENTATION: Schema docs - generate with quicktype or similar
 * VERSIONING: Migration - support v1->v2 DTO conversion
 */

/**
 * Mountain DTOs - These should match actual Tauri backend definitions
 *
 * NOTE: These are placeholder DTO structures. When Mountain platform DTOs
 * are implemented, update these interfaces to match exactly.
 */

/**
 * Platform information DTO for Mountain
 */
export interface MountainPlatformInfoDTO {
	platform_number: number; // 0=Web, 1=Mac, 2=Linux, 3=Windows

	platform_name: string; // 'Web' | 'Windows' | 'Mac' | 'Linux'

	operating_system: number; // 1=Windows, 2=Macintosh, 3=Linux

	architecture: string; // 'x64' | 'arm64' | 'arm' | 'ia32' | 'unknown'

	path_separator: string; // '/' or '\\'

	line_ending: string; // '\n' or '\r\n'

	locale: string; // 'en-US'

	language: string; // 'en'

	is_little_endian: boolean;

	is_web: boolean;

	is_electron: boolean;

	is_ci: boolean;

	user_agent?: string;

	timestamp: number; // Unix timestamp
}

/**
 * Environment variable DTO for Mountain
 */
export interface MountainEnvironmentVariableDTO {
	name: string;

	value: string;

	is_sensitive: boolean; // True for passwords, tokens

	is_readonly: boolean; // True for system variables

	source: string; // 'user' | 'system' | 'process' | 'config'
}

/**
 * Environment info DTO for Mountain
 */
export interface MountainEnvironmentInfoDTO {
	language: string;

	locale: string;

	home_directory: string;

	temp_directory: string;

	user_data_directory: string;

	platform_home: string;

	variable_count: number;

	is_development: boolean;

	is_production: boolean;

	is_ci: boolean;

	is_vscode: boolean;

	timestamp: number;
}

/**
 * Process info DTO for Mountain
 */
export interface MountainProcessInfoDTO {
	pid: number;

	command: string;

	args: string[];

	cwd: string;

	parent_pid?: number;

	start_time: number; // Unix timestamp

	end_time?: number; // Unix timestamp if stopped

	status: "running" | "stopped" | "error";

	exit_code: number | null;

	signal: string | null;

	uptime: number; // milliseconds

	is_detached: boolean;

	timestamp: number;
}

/**
 * Process spawn options DTO for Mountain
 */
export interface MountainProcessSpawnOptionsDTO {
	cwd?: string;

	env_variables: { [key: string]: string };

	detached: boolean;

	shell: boolean;

	windows_hide: boolean;

	timeout?: number;

	max_buffer: number;

	uid?: number;

	gid?: number;
}

/**
 * Process signal DTO for Mountain
 */
export interface MountainProcessSignalDTO {
	pid: number;

	signal: string;

	timeout: number;

	force: boolean;
}

/**
 * Platform type converters
 */

/**
 * Convert PlatformNumber to Mountain DTO format
 */
export function ConvertPlatformNumberToDTO(platformNumber: number): number {
	// Ensure platform number is valid enum value
	if (platformNumber < 0 || platformNumber > 3) {
		console.warn(
			`[TypeConverter] Invalid platform number: ${platformNumber}, using default`,
		;

		return 0; // Web as default
	}

	return platformNumber;
}

/**
 * Mountain DTO to PlatformNumber
 */
export function ConvertDTOToPlatformNumber(dtoNumber: number): number {
	return ConvertPlatformNumberToDTO(dtoNumber); // bidirectional
}

/**
 * Convert OS architecture to string
 */
export function ConvertArchitectureToString(architecture: string): string {
	const validArchitectures = ["x64", "arm64", "arm", "ia32", "unknown"];

	if (validArchitectures.includes(architecture)) {
		return architecture;
	}

	return "unknown";
}

/**
 * OperatingSystem type to number for Mountain
 */
export function ConvertOperatingSystemToNumber(os: number): number {
	if (os < 1 || os > 3) {
		console.warn(
			`[TypeConverter] Invalid operating system: ${os}, using default`,
		;

		return 3; // Linux as default
	}

	return os;
}

/**
 * Number to OperatingSystem type
 */
export function ConvertNumberToOperatingSystem(number: number): number {
	return ConvertOperatingSystemToNumber(number); // bidirectional
}

/**
 * Convert OS info to Mountain DTO
 */
export function ConvertOSInfoToDTO(osInfo: any): MountainPlatformInfoDTO {
	const timestamp = Date.now(;

	return {
		platform_number: ConvertPlatformNumberToDTO(
			osInfo.platformNumber || osInfo.platform,
		),

		platform_name: String(osInfo.platform || osInfo.platformName),

		operating_system: ConvertOperatingSystemToNumber(
			osInfo.operatingSystem || osInfo.OS,
		),

		architecture: ConvertArchitectureToString(
			osInfo.architecture || "unknown",
		),

		path_separator: String(osInfo.pathSeparator || "/"),

		line_ending: String(osInfo.lineEnding || "\n"),

		locale: String(osInfo.locale || "en-US"),

		language: String(osInfo.language || "en"),

		is_little_endian: Boolean(osInfo.isLittleEndian),

		is_web: Boolean(osInfo.isWeb),

		is_electron: Boolean(osInfo.isElectron),

		is_ci: Boolean(osInfo.isCI),

		user_agent: osInfo.userAgent ? String(osInfo.userAgent) : undefined,

		timestamp,
	};
}

/**
 * Convert Mountain DTO to OS info
 */
export function ConvertDTOToOSInfo(dto: MountainPlatformInfoDTO): any {
	return {
		platformNumber: ConvertPlatformNumberToDTO(dto.platform_number),

		platform: dto.platform_name,

		operatingSystem: ConvertNumberToOperatingSystem(dto.operating_system),

		architecture: ConvertArchitectureToString(dto.architecture),

		pathSeparator: dto.path_separator,

		lineEnding: dto.line_ending,

		locale: dto.locale,

		language: dto.language,

		isLittleEndian: dto.is_little_endian,

		isWeb: dto.is_web,

		isElectron: dto.is_electron,

		isCI: dto.is_ci,

		userAgent: dto.user_agent,
	};
}

/**
 * Check if environment variable name is sensitive
 */
function IsSensitiveVariable(name: string): boolean {
	const sensitivePrefixes = [
		"PASSWORD",

		"TOKEN",

		"SECRET",

		"KEY",

		"AUTH",

		"CREDENTIAL",

		"PRIVATE",

		"API_KEY",

		"ACCESS_KEY",
	];

	const upperName = name.toUpperCase(;

	return sensitivePrefixes.some((prefix) => upperName.startsWith(prefix);
}

/**
 * Check if environment variable is read-only (system)
 */
function IsReadonlyVariable(name: string): boolean {
	const readonlyVariables = [
		"PATH",

		"HOME",

		"USERPROFILE",

		"TEMP",

		"TMP",

		"TMPDIR",

		"APPDATA",

		"LOCALAPPDATA",

		"PROGRAMFILES",

		"SYSTEMROOT",

		"WINDIR",
	];

	return readonlyVariables.includes(name.toUpperCase();
}

/**
 * Detect environment variable source
 */
function DetectVariableSource(name: string): string {
	if (name.startsWith("VSCODE_")) {
		return "system";
	}

	if (name.startsWith("NODE_ENV")) {
		return "process";
	}

	if (["PATH", "HOME", "USERPROFILE"].includes(name.toUpperCase())) {
		return "system";
	}

	return "user";
}

/**
 * Convert environment variable to Mountain DTO
 */
export function ConvertEnvironmentVariableToDTO(
	name: string,

	value: string,
): MountainEnvironmentVariableDTO {
	return {
		name: String(name),

		value: String(value),

		is_sensitive: IsSensitiveVariable(name),

		is_readonly: IsReadonlyVariable(name),

		source: DetectVariableSource(name),
	} as MountainEnvironmentVariableDTO;
}

/**
 * Convert Mountain DTO to environment variable
 */
export function ConvertDTOToEnvironmentVariable(
	dto: MountainEnvironmentVariableDTO,
): { name: string; value: string } {
	return {
		name: dto.name,

		value: dto.value,
	};
}

/**
 * Convert environment info to Mountain DTO
 */
export function ConvertEnvironmentInfoToDTO(
	envInfo: any,
): MountainEnvironmentInfoDTO {
	return {
		language: String(envInfo.language ?? "en"),

		locale: String(envInfo.locale ?? "en-US"),

		home_directory: String(envInfo.homeDirectory ?? ""),

		temp_directory: String(envInfo.tempDirectory ?? ""),

		user_data_directory: String(envInfo.userDataDirectory ?? ""),

		platform_home: String(envInfo.platformHome ?? ""),

		variable_count: Number(
			envInfo.variables ? Object.keys(envInfo.variables).length : 0,
		),

		is_development: Boolean(envInfo.isDevelopment),

		is_production: Boolean(envInfo.isProduction),

		is_ci: Boolean(envInfo.isCI),

		is_vscode: Boolean(envInfo.isVSCode),

		timestamp: Date.now(),
	} as MountainEnvironmentInfoDTO;
}

/**
 * Convert Mountain DTO to environment info
 */
export function ConvertDTOToEnvironmentInfo(
	dto: MountainEnvironmentInfoDTO,
): any {
	return {
		language: dto.language,

		locale: dto.locale,

		homeDirectory: dto.home_directory,

		tempDirectory: dto.temp_directory,

		userDataDirectory: dto.user_data_directory,

		platformHome: dto.platform_home,

		isDevelopment: dto.is_development,

		isProduction: dto.is_production,

		isCI: dto.is_ci,

		isVSCode: dto.is_vscode,
	};
}

/**
 * Convert process info to Mountain DTO
 */
export function ConvertProcessInfoToDTO(procInfo: any): MountainProcessInfoDTO {
	const now = Date.now(;

	const startTime = procInfo.startTime ?? now;

	return {
		pid: Number(procInfo.pid),

		command: String(procInfo.command ?? ""),

		args: Array.isArray(procInfo.args) ? procInfo.args.map(String) : [],

		cwd: String(procInfo.cwd ?? ""),

		parent_pid: procInfo.parentPid ? Number(procInfo.parentPid) : undefined,

		start_time: Number(startTime),

		end_time:
			procInfo.status === "stopped"
				? (procInfo.endTime ?? now)
				: undefined,

		status: ["running", "stopped", "error"].includes(procInfo.status)
			? procInfo.status
			: "error",

		exit_code:
			procInfo.exitCode !== null ? Number(procInfo.exitCode) : null,

		signal: procInfo.signal ? String(procInfo.signal) : null,

		uptime: Number(now - startTime),

		is_detached: Boolean(procInfo.detached),

		timestamp: now,
	} as MountainProcessInfoDTO;
}

/**
 * Convert Mountain DTO to process info
 */
export function ConvertDTOToProcessInfo(dto: MountainProcessInfoDTO): any {
	return {
		pid: dto.pid,

		command: dto.command,

		args: dto.args,

		cwd: dto.cwd,

		parentPid: dto.parent_pid,

		startTime: dto.start_time,

		endTime: dto.end_time,

		status: dto.status,

		exitCode: dto.exit_code,

		signal: dto.signal,

		detached: dto.is_detached,
	};
}

/**
 * Convert process spawn options to Mountain DTO
 */
export function ConvertProcessSpawnOptionsToDTO(
	options: any,
): MountainProcessSpawnOptionsDTO {
	return {
		cwd: options.cwd ? String(options.cwd) : undefined,

		env_variables: options.env ? { ...options.env } : {},

		detached: Boolean(options.detached),

		shell: Boolean(options.shell),

		windows_hide: options.windowsHide !== false,

		timeout: options.timeout ? Number(options.timeout) : undefined,

		max_buffer: Number(options.maxBuffer ?? 1048576), // 1MB default

		uid: options.uid ? Number(options.uid) : undefined,

		gid: options.gid ? Number(options.gid) : undefined,
	} as MountainProcessSpawnOptionsDTO;
}

/**
 * Convert Mountain DTO to process spawn options
 */
export function ConvertDTOToProcessSpawnOptions(
	dto: MountainProcessSpawnOptionsDTO,
): any {
	return {
		cwd: dto.cwd,

		env: dto.env_variables,

		detached: dto.detached,

		shell: dto.shell,

		windowsHide: dto.windows_hide,

		timeout: dto.timeout,

		maxBuffer: dto.max_buffer,

		uid: dto.uid,

		gid: dto.gid,
	};
}

/**
 * Convert process signal to Mountain DTO
 */
export function ConvertProcessSignalToDTO(
	pid: number,

	signal: string,

	timeout: number = 5000,

	force: boolean = false,
): MountainProcessSignalDTO {
	return {
		pid: Number(pid),

		signal: String(signal),

		timeout: Number(timeout),

		force: Boolean(force),
	} as MountainProcessSignalDTO;
}

/**
 * Convert Mountain DTO to process signal
 */
export function ConvertDTOToProcessSignal(dto: MountainProcessSignalDTO): any {
	return {
		pid: dto.pid,

		signal: dto.signal,

		timeout: dto.timeout,

		force: dto.force,
	};
}

/**
 * Serialize DTO to JSON string
 */
export function SerializeDTO(dto: any): string {
	try {
		return JSON.stringify(dto;
	} catch (error) {
		console.error("[TypeConverter] Failed to serialize DTO:", error;

		throw new Error(`DTO serialization failed: ${error}`;
	}
}

/**
 * Deserialize JSON string to DTO
 */
export function DeserializeDTO<T>(
	json: string,

	validator?: (obj: any) => boolean,
): T | null {
	try {
		const parsed = JSON.parse(json;

		// Validate if validator provided
		if (validator && !validator(parsed)) {
			console.warn("[TypeConverter] DTO validation failed";

			return null;
		}

		return parsed as T;
	} catch (error) {
		console.error("[TypeConverter] Failed to deserialize DTO:", error;

		return null;
	}
}

/**
 * Validate MountainPlatformInfoDTO
 */
export function ValidatePlatformInfoDTO(dto: MountainPlatformInfoDTO): boolean {
	return (
		typeof dto === "object" &&
		typeof dto.platform_number === "number" &&
		typeof dto.platform_name === "string" &&
		typeof dto.operating_system === "number" &&
		typeof dto.architecture === "string" &&
		typeof dto.path_separator === "string" &&
		typeof dto.line_ending === "string" &&
		typeof dto.locale === "string" &&
		typeof dto.language === "string" &&
		typeof dto.is_little_endian === "boolean" &&
		typeof dto.is_web === "boolean" &&
		typeof dto.is_electron === "boolean" &&
		typeof dto.is_ci === "boolean" &&
		typeof dto.timestamp === "number"
	;
}

/**
 * Validate MountainEnvironmentVariableDTO
 */
export function ValidateEnvironmentVariableDTO(
	dto: MountainEnvironmentVariableDTO,
): boolean {
	return (
		typeof dto === "object" &&
		typeof dto.name === "string" &&
		typeof dto.value === "string" &&
		typeof dto.is_sensitive === "boolean" &&
		typeof dto.is_readonly === "boolean" &&
		typeof dto.source === "string"
	;
}

/**
 * Validate MountainProcessInfoDTO
 */
export function ValidateProcessInfoDTO(dto: MountainProcessInfoDTO): boolean {
	return (
		typeof dto === "object" &&
		typeof dto.pid === "number" &&
		typeof dto.command === "string" &&
		Array.isArray(dto.args) &&
		typeof dto.cwd === "string" &&
		typeof dto.start_time === "number" &&
		["running", "stopped", "error"].includes(dto.status) &&
		typeof dto.timestamp === "number"
	;
}

/**
 * Effect-TS: Convert OS info to DTO as Effect
 */
export function ConvertOSInfoToDTOEffect(osInfo: any) {
	return {
		dto: ConvertOSInfoToDTO(osInfo),

		json: SerializeDTO(ConvertOSInfoToDTO(osInfo)),
	};
}

/**
 * Effect-TS: Deserialize DTO from JSON as Effect
 */
export function DeserializeDTOEffect<T>(
	json: string,

	validator?: (obj: any) => boolean,
): Option.Option<T> {
	const parsed = DeserializeDTO<T>(json, validator;

	return parsed ? Option.some(parsed) : Option.none(;
}

/**
 * Export TypeConverter module
 */
export const TypeConverter = {
	// Platform converters
	ConvertPlatformNumberToDTO,

	ConvertDTOToPlatformNumber,

	ConvertArchitectureToString,

	ConvertOperatingSystemToNumber,

	ConvertNumberToOperatingSystem,

	ConvertOSInfoToDTO,

	ConvertDTOToOSInfo,

	// Environment converters
	ConvertEnvironmentVariableToDTO,

	ConvertDTOToEnvironmentVariable,

	ConvertEnvironmentInfoToDTO,

	ConvertDTOToEnvironmentInfo,

	// Process converters
	ConvertProcessInfoToDTO,

	ConvertDTOToProcessInfo,

	ConvertProcessSpawnOptionsToDTO,

	ConvertDTOToProcessSpawnOptions,

	ConvertProcessSignalToDTO,

	ConvertDTOToProcessSignal,

	// Serialization
	SerializeDTO,

	DeserializeDTO,

	// Validation
	ValidatePlatformInfoDTO,

	ValidateEnvironmentVariableDTO,

	ValidateProcessInfoDTO,
};
