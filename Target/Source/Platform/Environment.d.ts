/**
 * @file Environment Variable Management
 * @description
 * Provides comprehensive environment variable management for Cocoon.
 * Reads, sets, validates, and manages environment variables with defensive
 * coding and security considerations for all supported platforms.
 *
 * **Responsibilities:**
 * - Read environment variables from process.env
 * - Set environment variables (where supported)
 * - Validate environment variable values
 * - Detect locale and language from environment
 * - Provide secure environment access with sanitization
 * - Cache frequently accessed environment variables
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may need environment variables for compilation flags and paths
 * - **Wind**: Effect-TS services need environment-aware configuration and context
 * - **Mountain**: Environment data converts to Mountain DTOs for Tauri backend
 * - **Output**: References VSCode environment handling from Dependency/Microsoft/Dependency/Editor/src/vs/base/common/platform.ts
 *
 * **TODOs:**
 * - TODO: Implement .env file loading for development environments
 * - TODO: Add environment variable validation schemas with runtime checks
 * - TODO: Implement variable expansion (${VAR} syntax)
 * - TODO: Add environment variable change monitoring (fs.watch for .env files)
 * - TODO: Mountain: Define EnvironmentInfo DTO for environment state transfer
 * - TODO: Wind: Create Effect-TS Environment service with dependency injection
 * - TODO: Security: Mask sensitive values (passwords, tokens, keys) in logs
 * - TODO: Security: Add environment variable access control and permissions
 * - TODO: Performance: Implement LRU cache for frequently accessed variables
 * - TODO: Testing: Add comprehensive unit tests for environment variable parsing
 */
import { Effect, Option } from "effect";
/**
 * Process environment interface
 */
export interface IProcessEnvironment {
    [key: string]: string | undefined;
}
/**
 * Environment variable validation result
 */
export interface EnvironmentValidationResult {
    isValid: boolean;
    value: string;
    error?: string;
}
/**
 * Environment variable validation rules
 */
export interface EnvironmentValidationRule {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'path' | 'url';
    pattern?: RegExp;
    min?: number;
    max?: number;
    allowedValues?: string[];
    sanitize?: (value: string) => string;
}
/**
 * Environment information structure
 */
export interface EnvironmentInfo {
    variables: Record<string, string>;
    language: string;
    locale: string;
    homeDirectory: string;
    tempDirectory: string;
    userDataDirectory: string;
    platformHome: string;
}
/**
 * Default environment variables
 */
export declare const DEFAULT_LANGUAGE = "en";
export declare const DEFAULT_LOCALE = "en-US";
/**
 * Clear environment cache
 */
export declare function ClearCache(): void;
/**
 * Get environment variable
 */
export declare function GetEnvironmentVariable(name: string): Option.Option<string>;
/**
 * Get environment variable with default
 */
export declare function GetEnvironmentVariableOr(name: string, defaultValue: string): string;
/**
 * Set environment variable (where supported)
 */
export declare function SetEnvironmentVariable(name: string, value: string): boolean;
/**
 * Delete environment variable
 */
export declare function DeleteEnvironmentVariable(name: string): boolean;
/**
 * Get all environment variables
 */
export declare function GetAllEnvironmentVariables(): IProcessEnvironment;
/**
 * Validate environment variable value
 */
export declare function ValidateEnvironmentVariable(name: string, value: string, rule: EnvironmentValidationRule): EnvironmentValidationResult;
/**
 * Get and validate environment variable
 */
export declare function GetValidatedEnvironmentVariable(name: string, rule: EnvironmentValidationRule): EnvironmentValidationResult;
/**
 * Get language from environment
 */
export declare function GetLanguage(): string;
/**
 * Get locale from environment
 */
export declare function GetLocale(): string;
/**
 * Get home directory from environment
 */
export declare function GetHomeDirectory(): string;
/**
 * Get temp directory from environment
 */
export declare function GetTempDirectory(): string;
/**
 * Get user data directory
 */
export declare function GetUserDataDirectory(): string;
/**
 * Get platform home directory
 */
export declare function GetPlatformHome(): string;
/**
 * Get comprehensive environment information
 */
export declare function GetEnvironmentInfo(): EnvironmentInfo;
/**
 * Check if running in development environment
 */
export declare function IsDevelopment(): boolean;
/**
 * Check if running in production environment
 */
export declare function IsProduction(): boolean;
/**
 * Check if running in CI environment
 */
export declare function IsCI(): boolean;
/**
 * Check if running in VSCode environment
 */
export declare function IsVSCode(): boolean;
/**
 * Get VSCode installation path
 */
export declare function GetVSCodePath(): Option.Option<string>;
/**
 * Sanitize environment variable name
 */
export declare function SanitizeName(name: string): string;
/**
 * Sanitize environment variable value
 */
export declare function SanitizeValue(value: string): string;
/**
 * Effect-TS: Get environment variable as Effect
 */
export declare function GetEnvironmentVariableEffect(name: string): Effect.Effect<Option.Option<string>>;
/**
 * Effect-TS: Get environment variable or default as Effect
 */
export declare function GetEnvironmentVariableOrEffect(name: string, defaultValue: string): Effect.Effect<string>;
/**
 * Effect-TS: Set environment variable as Effect
 */
export declare function SetEnvironmentVariableEffect(name: string, value: string): Effect.Effect<void, Error>;
/**
 * Effect-TS: Get environment info as Effect
 */
export declare function GetEnvironmentInfoEffect(): Effect.Effect<EnvironmentInfo>;
/**
 * Export environment module
 */
export declare const Environment: {
    GetEnvironmentVariable: typeof GetEnvironmentVariable;
    GetEnvironmentVariableOr: typeof GetEnvironmentVariableOr;
    SetEnvironmentVariable: typeof SetEnvironmentVariable;
    DeleteEnvironmentVariable: typeof DeleteEnvironmentVariable;
    GetAllEnvironmentVariables: typeof GetAllEnvironmentVariables;
    ValidateEnvironmentVariable: typeof ValidateEnvironmentVariable;
    GetValidatedEnvironmentVariable: typeof GetValidatedEnvironmentVariable;
    GetLanguage: typeof GetLanguage;
    GetLocale: typeof GetLocale;
    GetHomeDirectory: typeof GetHomeDirectory;
    GetTempDirectory: typeof GetTempDirectory;
    GetUserDataDirectory: typeof GetUserDataDirectory;
    GetPlatformHome: typeof GetPlatformHome;
    GetEnvironmentInfo: typeof GetEnvironmentInfo;
    IsDevelopment: typeof IsDevelopment;
    IsProduction: typeof IsProduction;
    IsCI: typeof IsCI;
    IsVSCode: typeof IsVSCode;
    GetVSCodePath: typeof GetVSCodePath;
    SanitizeName: typeof SanitizeName;
    SanitizeValue: typeof SanitizeValue;
    ClearCache: typeof ClearCache;
};
//# sourceMappingURL=Environment.d.ts.map