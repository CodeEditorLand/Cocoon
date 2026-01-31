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
 * - TODO: Define actual Mountain DTOs in Tauri backend (Mountain/Source/Platform.dto)
 * - TODO: Implement protobuf or JSON serialization based on Mountain protocol
 * - TODO: Add TypeScript type guards for DTO validation
 * - TODO: Implement schema validation with Zod or similar
 * - TODO: Wind: Create Effect-Based type converters for streaming
 * - TODO: Performance: Add conversion caching for frequent DTOs
 * - TODO: Testing: Add comprehensive unit tests for all converters
 * - TODO: Security: Validate all DTOs before/deserialization to prevent injection
 * - TODO: Documentation: Generate DTO schema documentation
 * - TODO: Versioning: Support DTO version migration and backward compatibility
 */
import { Option } from "effect";
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
    platform_number: number;
    platform_name: string;
    operating_system: number;
    architecture: string;
    path_separator: string;
    line_ending: string;
    locale: string;
    language: string;
    is_little_endian: boolean;
    is_web: boolean;
    is_electron: boolean;
    is_ci: boolean;
    user_agent?: string;
    timestamp: number;
}
/**
 * Environment variable DTO for Mountain
 */
export interface MountainEnvironmentVariableDTO {
    name: string;
    value: string;
    is_sensitive: boolean;
    is_readonly: boolean;
    source: string;
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
    start_time: number;
    end_time?: number;
    status: 'running' | 'stopped' | 'error';
    exit_code: number | null;
    signal: string | null;
    uptime: number;
    is_detached: boolean;
    timestamp: number;
}
/**
 * Process spawn options DTO for Mountain
 */
export interface MountainProcessSpawnOptionsDTO {
    cwd?: string;
    env_variables: {
        [key: string]: string;
    };
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
export declare function ConvertPlatformNumberToDTO(platformNumber: number): number;
/**
 * Mountain DTO to PlatformNumber
 */
export declare function ConvertDTOToPlatformNumber(dtoNumber: number): number;
/**
 * Convert OS architecture to string
 */
export declare function ConvertArchitectureToString(architecture: string): string;
/**
 * OperatingSystem type to number for Mountain
 */
export declare function ConvertOperatingSystemToNumber(os: number): number;
/**
 * Number to OperatingSystem type
 */
export declare function ConvertNumberToOperatingSystem(number: number): number;
/**
 * Convert OS info to Mountain DTO
 */
export declare function ConvertOSInfoToDTO(osInfo: any): MountainPlatformInfoDTO;
/**
 * Convert Mountain DTO to OS info
 */
export declare function ConvertDTOToOSInfo(dto: MountainPlatformInfoDTO): any;
/**
 * Convert environment variable to Mountain DTO
 */
export declare function ConvertEnvironmentVariableToDTO(name: string, value: string): MountainEnvironmentVariableDTO;
/**
 * Convert Mountain DTO to environment variable
 */
export declare function ConvertDTOToEnvironmentVariable(dto: MountainEnvironmentVariableDTO): {
    name: string;
    value: string;
};
/**
 * Convert environment info to Mountain DTO
 */
export declare function ConvertEnvironmentInfoToDTO(envInfo: any): MountainEnvironmentInfoDTO;
/**
 * Convert Mountain DTO to environment info
 */
export declare function ConvertDTOToEnvironmentInfo(dto: MountainEnvironmentInfoDTO): any;
/**
 * Convert process info to Mountain DTO
 */
export declare function ConvertProcessInfoToDTO(procInfo: any): MountainProcessInfoDTO;
/**
 * Convert Mountain DTO to process info
 */
export declare function ConvertDTOToProcessInfo(dto: MountainProcessInfoDTO): any;
/**
 * Convert process spawn options to Mountain DTO
 */
export declare function ConvertProcessSpawnOptionsToDTO(options: any): MountainProcessSpawnOptionsDTO;
/**
 * Convert Mountain DTO to process spawn options
 */
export declare function ConvertDTOToProcessSpawnOptions(dto: MountainProcessSpawnOptionsDTO): any;
/**
 * Convert process signal to Mountain DTO
 */
export declare function ConvertProcessSignalToDTO(pid: number, signal: string, timeout?: number, force?: boolean): MountainProcessSignalDTO;
/**
 * Convert Mountain DTO to process signal
 */
export declare function ConvertDTOToProcessSignal(dto: MountainProcessSignalDTO): any;
/**
 * Serialize DTO to JSON string
 */
export declare function SerializeDTO(dto: any): string;
/**
 * Deserialize JSON string to DTO
 */
export declare function DeserializeDTO<T>(json: string, validator?: (obj: any) => boolean): T | null;
/**
 * Validate MountainPlatformInfoDTO
 */
export declare function ValidatePlatformInfoDTO(dto: MountainPlatformInfoDTO): boolean;
/**
 * Validate MountainEnvironmentVariableDTO
 */
export declare function ValidateEnvironmentVariableDTO(dto: MountainEnvironmentVariableDTO): boolean;
/**
 * Validate MountainProcessInfoDTO
 */
export declare function ValidateProcessInfoDTO(dto: MountainProcessInfoDTO): boolean;
/**
 * Effect-TS: Convert OS info to DTO as Effect
 */
export declare function ConvertOSInfoToDTOEffect(osInfo: any): {
    dto: MountainPlatformInfoDTO;
    json: string;
};
/**
 * Effect-TS: Deserialize DTO from JSON as Effect
 */
export declare function DeserializeDTOEffect<T>(json: string, validator?: (obj: any) => boolean): Option.Option<T>;
/**
 * Export TypeConverter module
 */
export declare const TypeConverter: {
    ConvertPlatformNumberToDTO: typeof ConvertPlatformNumberToDTO;
    ConvertDTOToPlatformNumber: typeof ConvertDTOToPlatformNumber;
    ConvertArchitectureToString: typeof ConvertArchitectureToString;
    ConvertOperatingSystemToNumber: typeof ConvertOperatingSystemToNumber;
    ConvertNumberToOperatingSystem: typeof ConvertNumberToOperatingSystem;
    ConvertOSInfoToDTO: typeof ConvertOSInfoToDTO;
    ConvertDTOToOSInfo: typeof ConvertDTOToOSInfo;
    ConvertEnvironmentVariableToDTO: typeof ConvertEnvironmentVariableToDTO;
    ConvertDTOToEnvironmentVariable: typeof ConvertDTOToEnvironmentVariable;
    ConvertEnvironmentInfoToDTO: typeof ConvertEnvironmentInfoToDTO;
    ConvertDTOToEnvironmentInfo: typeof ConvertDTOToEnvironmentInfo;
    ConvertProcessInfoToDTO: typeof ConvertProcessInfoToDTO;
    ConvertDTOToProcessInfo: typeof ConvertDTOToProcessInfo;
    ConvertProcessSpawnOptionsToDTO: typeof ConvertProcessSpawnOptionsToDTO;
    ConvertDTOToProcessSpawnOptions: typeof ConvertDTOToProcessSpawnOptions;
    ConvertProcessSignalToDTO: typeof ConvertProcessSignalToDTO;
    ConvertDTOToProcessSignal: typeof ConvertDTOToProcessSignal;
    SerializeDTO: typeof SerializeDTO;
    DeserializeDTO: typeof DeserializeDTO;
    ValidatePlatformInfoDTO: typeof ValidatePlatformInfoDTO;
    ValidateEnvironmentVariableDTO: typeof ValidateEnvironmentVariableDTO;
    ValidateProcessInfoDTO: typeof ValidateProcessInfoDTO;
};
//# sourceMappingURL=TypeConverter.d.ts.map