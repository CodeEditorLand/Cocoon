/**
 * @file OS Detection and Platform Information
 * @description
 * Provides comprehensive OS detection and platform-specific information for Cocoon.
 * Detects operating system (Windows, macOS, Linux) and provides platform-specific
 * utilities for path handling, environment detection, and OS-specific behavior.
 *
 * **Responsibilities:**
 * - OS detection and platform identification
 * - Platform-specific path handling (forward/backward slashes)
 * - OS-specific utility functions
 * - Platform constants and enums
 * - Locale and language detection
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may call OS detection for cross-platform compilation
 * - **Wind**: Effect-TS services need platform-specific path and behavior resolution
 * - **Mountain**: Platform types convert to Mountain DTOs for Tauri backend communication
 * - **Output**: References VSCode platform code patterns from Dependency/Microsoft/Dependency/Editor/src/vs/base/common/platform.ts
 *
 * **TODOs:**
 * - TODO: Implement Windows-specific path normalization (UNC paths, drive letters)
 * - TODO: Add Windows registry detection for system information
 * - TODO: Implement macOS version detection (Catalina, Big Sur, Monterey, Sonoma)
 * - TODO: Add Linux distribution detection (Ubuntu, Fedora, Debian, Arch, etc.)
 * - TODO: Implement WSL detection on Windows
 * - TODO: Add container detection (Docker, Kubernetes)
 * - TODO: Mountain: Define OSInfo DTO in Mountain for platform data transfer
 * - TODO: Wind: Create Effect-TS services for OS-specific operations
 * - TODO: Performance: Cache OS detection results for lifetime of application
 * - TODO: Security: Add OS-level security feature detection (SELinux, AppArmor, Gatekeeper)
 */
import { Effect, Option } from "effect";
/**
 * Platform enumeration matching VSCode patterns
 */
export declare enum PlatformNumber {
    Web = 0,
    Mac = 1,
    Linux = 2,
    Windows = 3
}
/**
 * Platform type names
 */
export type PlatformName = 'Web' | 'Windows' | 'Mac' | 'Linux';
/**
 * Operating system enumeration
 */
export declare enum OperatingSystem {
    Windows = 1,
    Macintosh = 2,
    Linux = 3
}
/**
 * OS architecture
 */
export declare enum OSArchitecture {
    X64 = "x64",
    ARM64 = "arm64",
    ARM = "arm",
    IA32 = "ia32",
    Unknown = "unknown"
}
/**
 * Path separator by platform
 */
export declare const PATH_SEPARATOR_WINDOWS = "\\";
export declare const PATH_SEPARATOR_UNIX = "/";
/**
 * Line ending by platform
 */
export declare const LINE_ENDING_WINDOWS = "\r\n";
export declare const LINE_ENDING_UNIX = "\n";
/**
 * Default language
 */
export declare const DEFAULT_LANGUAGE = "en";
/**
 * Default locale
 */
export declare const DEFAULT_LOCALE = "en-US";
/**
 * Process environment interface (simplified from VSCode)
 */
export interface IProcessEnvironment {
    [key: string]: string | undefined;
}
/**
 * Node process interface (simplified from VSCode)
 */
export interface INodeProcess {
    platform: string;
    arch: string;
    env: IProcessEnvironment;
    versions?: {
        node?: string;
        electron?: string;
        chrome?: string;
    };
    type?: string;
    cwd: () => string;
}
/**
 * OS information structure
 */
export interface OSInfo {
    platform: PlatformName;
    operatingSystem: OperatingSystem;
    architecture: OSArchitecture;
    pathSeparator: string;
    lineEnding: string;
    locale: string;
    language: string;
    isLittleEndian: boolean;
    isWeb: boolean;
    isElectron: boolean;
    isCI: boolean;
    userAgent?: string;
}
/**
 * Get platform number
 */
export declare function GetPlatformNumber(): PlatformNumber;
/**
 * Get platform name
 */
export declare function GetPlatformName(): PlatformName;
/**
 * Get operating system
 */
export declare function GetOperatingSystem(): OperatingSystem;
/**
 * Get architecture
 */
export declare function GetArchitecture(): OSArchitecture;
/**
 * Check if running on Windows
 */
export declare function IsWindows(): boolean;
/**
 * Check if running on macOS
 */
export declare function IsMacintosh(): boolean;
/**
 * Check if running on Linux
 */
export declare function IsLinux(): boolean;
/**
 * Check if running in web environment
 */
export declare function IsWeb(): boolean;
/**
 * Check if running in Electron
 */
export declare function IsElectron(): boolean;
/**
 * Check if running in CI environment
 */
export declare function IsCI(): boolean;
/**
 * Get path separator for current platform
 */
export declare function GetPathSeparator(): string;
/**
 * Get line ending for current platform
 */
export declare function GetLineEnding(): string;
/**
 * Normalize path separators to current platform
 */
export declare function NormalizePath(path: string | null | undefined): string;
/**
 * Normalize path separators to forward slashes (for web/Unix)
 */
export declare function NormalizePathToUnix(path: string | null | undefined): string;
/**
 * Normalize path separators to backslashes (for Windows)
 */
export declare function NormalizePathToWindows(path: string | null | undefined): string;
/**
 * Join path segments using platform separator
 */
export declare function JoinPath(...segments: (string | null | undefined)[]): string;
/**
 * Get locale
 */
export declare function GetLocale(): string;
/**
 * Get language
 */
export declare function GetLanguage(): string;
/**
 * Get user agent (web only)
 */
export declare function GetUserAgent(): string | undefined;
/**
 * Check if system is little endian
 */
export declare function IsLittleEndian(): boolean;
/**
 * Get comprehensive OS information
 */
export declare function GetOSInfo(): OSInfo;
/**
 * Convert platform number to string
 */
export declare function PlatformToString(platform: PlatformNumber): PlatformName;
/**
 * Convert platform string to number
 */
export declare function StringToPlatform(platform: string): Option.Option<PlatformNumber>;
/**
 * Check if language is default (English)
 */
export declare function IsDefaultLanguage(): boolean;
/**
 * Check if language is English variant (en-*)
 */
export declare function IsEnglishVariant(): boolean;
/**
 * Effect-TS: Get OS information as Effect
 */
export declare function GetOSInfoEffect(): Effect.Effect<OSInfo>;
/**
 * Effect-TS: Detect platform as Effect
 */
export declare function DetectPlatformEffect(): Effect.Effect<PlatformNumber>;
/**
 * Effect-TS: Normalize path as Effect
 */
export declare function NormalizePathEffect(path: string): Effect.Effect<string, Error>;
/**
 * Effect-TS: Check if path is absolute for current platform
 */
export declare function IsAbsolutePath(path: string): boolean;
/**
 * Export constants
 */
export declare const Platform: {
    Web: PlatformNumber;
    Mac: PlatformNumber;
    Linux: PlatformNumber;
    Windows: PlatformNumber;
};
export declare const PlatformConstants: {
    readonly DEFAULT_LANGUAGE: "en";
    readonly DEFAULT_LOCALE: "en-US";
    readonly PATH_SEPARATOR_WINDOWS: "\\";
    readonly PATH_SEPARATOR_UNIX: "/";
    readonly LINE_ENDING_WINDOWS: "\r\n";
    readonly LINE_ENDING_UNIX: "\n";
};
/**
 * Export getters
 */
export declare const OS: {
    readonly IsWindows: typeof IsWindows;
    readonly IsMacintosh: typeof IsMacintosh;
    readonly IsLinux: typeof IsLinux;
    readonly IsWeb: typeof IsWeb;
    readonly IsElectron: typeof IsElectron;
    readonly IsCI: typeof IsCI;
    readonly GetPlatformNumber: typeof GetPlatformNumber;
    readonly GetPlatformName: typeof GetPlatformName;
    readonly GetOperatingSystem: typeof GetOperatingSystem;
    readonly GetArchitecture: typeof GetArchitecture;
    readonly GetPathSeparator: typeof GetPathSeparator;
    readonly GetLineEnding: typeof GetLineEnding;
    readonly GetLocale: typeof GetLocale;
    readonly GetLanguage: typeof GetLanguage;
    readonly GetUserAgent: typeof GetUserAgent;
    readonly IsLittleEndian: typeof IsLittleEndian;
    readonly GetOSInfo: typeof GetOSInfo;
    readonly NormalizePath: typeof NormalizePath;
    readonly NormalizePathToUnix: typeof NormalizePathToUnix;
    readonly NormalizePathToWindows: typeof NormalizePathToWindows;
    readonly JoinPath: typeof JoinPath;
    readonly IsAbsolutePath: typeof IsAbsolutePath;
    readonly IsDefaultLanguage: typeof IsDefaultLanguage;
    readonly IsEnglishVariant: typeof IsEnglishVariant;
};
//# sourceMappingURL=OS.d.ts.map