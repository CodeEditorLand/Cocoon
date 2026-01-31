/**
 * @file Platform Service - Effect-TS Layer for Platform Abstraction
 * @description
 * Main platform service that integrates OS, Environment, Process, and TypeConverter
 * modules into a comprehensive Effect-TS layer. Provides dependency injection,
 * service lifecycle management, and effect-based operations for all platform
 * functionality.
 *
 * **Responsibilities:**
 * - Initialize and manage platform service lifecycle
 * - Provide Effect-TS layer for dependency injection
 * - Orchestrate OS, Environment, Process operations
 * - Cache platform information for performance
 * - Handle service errors and recovery
 * - Monitor platform health and metrics
 * - Bridge to Mountain backend via TypeConverter
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may call platform operations via service layer
 * - **Wind**: Effect-TS services depend on PlatformService for OS operations
 * - **Mountain**: Service converts platform data to Mountain DTOs via TypeConverter
 * - **Output**: References VSCode service layer patterns
 *
 * **TODOs:**
 * - TODO: Implement Platform service registration in Wind's Effect context
 * - TODO: Add platform-specific health checks and monitoring
 * - TODO: Implement observability (telemetry, metrics, distributed tracing)
 * - TODO: Add hot-reload support for platform detection changes
 * - TODO: Wind: Create PlatformServiceTag for Effect-TS dependency injection
 * - TODO: Wind: Initialize PlatformService in main Effect application
 * - TODO: Mountain: Add GRIPC endpoints for platform operations
 * - TODO: Testing: Add comprehensive integration tests for service layer
 * - TODO: Performance: Add adaptive caching based on usage patterns
 * - TODO: Documentation: Generate service API documentation
 */
import { Effect, Layer, Context, Option } from "effect";
import * as OSModule from "./OS.js";
import * as EnvironmentModule from "./Environment.js";
import * as ProcessModule from "./Process.js";
import * as TypeConverterModule from "./TypeConverter.js";
/**
 * Platform Service interface
 */
export interface IPlatformService {
    readonly _serviceBrand: undefined;
    initialize(): Effect.Effect<void, Error>;
    detectPlatform(): Effect.Effect<OSModule.PlatformNumber, Error>;
    getOSInfo(): Effect.Effect<OSModule.OSInfo, Error>;
    isWindows(): Effect.Effect<boolean>;
    isMacintosh(): Effect.Effect<boolean>;
    isLinux(): Effect.Effect<boolean>;
    normalizePath(path: string): Effect.Effect<string, Error>;
    joinPath(...segments: string[]): Effect.Effect<string>;
    getEnvironmentVariable(name: string): Effect.Effect<Option.Option<string>>;
    setEnvironmentVariable(name: string, value: string): Effect.Effect<void, Error>;
    getEnvironmentInfo(): Effect.Effect<EnvironmentModule.EnvironmentInfo, Error>;
    getLanguage(): Effect.Effect<string>;
    getLocale(): Effect.Effect<string>;
    getHomeDirectory(): Effect.Effect<string>;
    getTempDirectory(): Effect.Effect<string>;
    spawnProcess(command: string, args: string[], options: ProcessModule.ProcessSpawnOptions): Effect.Effect<ProcessModule.ProcessInfo | null, Error>;
    executeCommand(command: string, args: string[], options?: ProcessModule.ProcessSpawnOptions): Effect.Effect<{
        stdout: string;
        stderr: string;
        exitCode: number | null;
    }, Error>;
    killProcess(pid: number): Effect.Effect<boolean>;
    getProcess(pid: number): Effect.Effect<Option.Option<ProcessModule.ProcessInfo>>;
    convertOSInfoToDTO(osInfo: OSModule.OSInfo): Effect.Effect<TypeConverterModule.MountainPlatformInfoDTO>;
    convertEnvironmentInfoToDTO(envInfo: EnvironmentModule.EnvironmentInfo): Effect.Effect<TypeConverterModule.MountainEnvironmentInfoDTO>;
    convertProcessInfoToDTO(procInfo: ProcessModule.ProcessInfo): Effect.Effect<TypeConverterModule.MountainProcessInfoDTO>;
    getHealthStatus(): Effect.Effect<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        uptime: number;
        lastUpdate: number;
    }>;
    dispose(): Effect.Effect<void>;
}
/**
 * Platform Service implementation
 */
export declare class PlatformService implements IPlatformService {
    readonly _serviceBrand: undefined;
    private startTime;
    private initialized;
    private cache;
    private readonly CACHE_TTL;
    constructor();
    /**
     * Initialize platform service
     */
    initialize(): Effect.Effect<void, Error>;
    /**
     * Get cached value or compute new one
     */
    private getCached;
    /**
     * Clear cache
     */
    private clearCache;
    /**
     * Detect platform
     */
    detectPlatform(): Effect.Effect<OSModule.PlatformNumber, Error>;
    /**
     * Get OS information
     */
    getOSInfo(): Effect.Effect<OSModule.OSInfo, Error>;
    /**
     * Check if Windows
     */
    isWindows(): Effect.Effect<boolean>;
    /**
     * Check if Macintosh
     */
    isMacintosh(): Effect.Effect<boolean>;
    /**
     * Check if Linux
     */
    isLinux(): Effect.Effect<boolean>;
    /**
     * Normalize path for current platform
     */
    normalizePath(path: string): Effect.Effect<string, Error>;
    /**
     * Join path segments
     */
    joinPath(...segments: string[]): Effect.Effect<string>;
    /**
     * Get environment variable
     */
    getEnvironmentVariable(name: string): Effect.Effect<Option.Option<string>>;
    /**
     * Set environment variable
     */
    setEnvironmentVariable(name: string, value: string): Effect.Effect<void, Error>;
    /**
     * Get environment information
     */
    getEnvironmentInfo(): Effect.Effect<EnvironmentModule.EnvironmentInfo, Error>;
    /**
     * Get language
     */
    getLanguage(): Effect.Effect<string>;
    /**
     * Get locale
     */
    getLocale(): Effect.Effect<string>;
    /**
     * Get home directory
     */
    getHomeDirectory(): Effect.Effect<string>;
    /**
     * Get temp directory
     */
    getTempDirectory(): Effect.Effect<string>;
    /**
     * Spawn process
     */
    spawnProcess(command: string, args: string[], options: ProcessModule.ProcessSpawnOptions): Effect.Effect<ProcessModule.ProcessInfo | null, Error>;
    /**
     * Execute command
     */
    executeCommand(command: string, args: string[], options?: ProcessModule.ProcessSpawnOptions): Effect.Effect<{
        stdout: string;
        stderr: string;
        exitCode: number | null;
    }, Error>;
    /**
     * Kill process
     */
    killProcess(pid: number): Effect.Effect<boolean>;
    /**
     * Get process info
     */
    getProcess(pid: number): Effect.Effect<Option.Option<ProcessModule.ProcessInfo>>;
    /**
     * Convert OS info to Mountain DTO
     */
    convertOSInfoToDTO(osInfo: OSModule.OSInfo): Effect.Effect<TypeConverterModule.MountainPlatformInfoDTO>;
    /**
     * Convert environment info to Mountain DTO
     */
    convertEnvironmentInfoToDTO(envInfo: EnvironmentModule.EnvironmentInfo): Effect.Effect<TypeConverterModule.MountainEnvironmentInfoDTO>;
    /**
     * Convert process info to Mountain DTO
     */
    convertProcessInfoToDTO(procInfo: ProcessModule.ProcessInfo): Effect.Effect<TypeConverterModule.MountainProcessInfoDTO>;
    /**
     * Get health status
     */
    getHealthStatus(): Effect.Effect<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        uptime: number;
        lastUpdate: number;
    }>;
    /**
     * Get cache timestamp by key
     */
    private getCacheTimestamp;
    /**
     * Dispose platform service
     */
    dispose(): Effect.Effect<void>;
}
/**
 * Platform Service Tag for Effect-TS dependency injection
 */
export declare const PlatformServiceTag: Context.Tag<IPlatformService, IPlatformService>;
/**
 * Platform Service Layer
 */
export declare const PlatformServiceLayer: Layer.Layer<IPlatformService, never, never>;
/**
 * Live platform service layer
 */
export declare const LivePlatformService: Layer.Layer<IPlatformService, never, never>;
/**
 * Test platform service layer (for testing)
 */
export declare const TestPlatformService: Layer.Layer<IPlatformService, never, never>;
/**
 * Convenience functions using PlatformService context
 */
/**
 * Get platform number from context
 */
export declare function DetectPlatform(): Effect.Effect<OSModule.PlatformNumber, never, IPlatformService>;
/**
 * Get OS info from context
 */
export declare function GetOSInfo(): Effect.Effect<OSModule.OSInfo, never, IPlatformService>;
/**
 * Normalize path using platform context
 */
export declare function NormalizePath(path: string): Effect.Effect<string, never, IPlatformService>;
/**
 * Get environment variable using platform context
 */
export declare function GetEnvironmentVariable(name: string): Effect.Effect<Option.Option<string>, never, IPlatformService>;
/**
 * Set environment variable using platform context
 */
export declare function SetEnvironmentVariable(name: string, value: string): Effect.Effect<void, never, IPlatformService>;
/**
 * Execute command using platform context
 */
export declare function ExecuteCommand(command: string, args?: string[], options?: ProcessModule.ProcessSpawnOptions): Effect.Effect<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
}, never, IPlatformService>;
/**
 * Spawn process using platform context
 */
export declare function SpawnProcess(command: string, args: string[], options: ProcessModule.ProcessSpawnOptions): Effect.Effect<ProcessModule.ProcessInfo | null, never, IPlatformService>;
/**
 * Get service health status using platform context
 */
export declare function GetHealthStatus(): Effect.Effect<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    lastUpdate: number;
}, never, IPlatformService>;
/**
 * Initialize platform service
 */
export declare function InitializePlatformService(): Effect.Effect<void, never>;
/**
 * Export Platform service module
 */
export declare const PlatformServiceModule: {
    IPlatformService: any;
    PlatformService: typeof PlatformService;
    PlatformServiceTag: Context.Tag<IPlatformService, IPlatformService>;
    PlatformServiceLayer: Layer.Layer<IPlatformService, never, never>;
    LivePlatformService: Layer.Layer<IPlatformService, never, never>;
    TestPlatformService: Layer.Layer<IPlatformService, never, never>;
    DetectPlatform: typeof DetectPlatform;
    GetOSInfo: typeof GetOSInfo;
    NormalizePath: typeof NormalizePath;
    GetEnvironmentVariable: typeof GetEnvironmentVariable;
    SetEnvironmentVariable: typeof SetEnvironmentVariable;
    ExecuteCommand: typeof ExecuteCommand;
    SpawnProcess: typeof SpawnProcess;
    GetHealthStatus: typeof GetHealthStatus;
    InitializePlatformService: typeof InitializePlatformService;
};
/**
 * Re-export submodules for convenience
 */
export { OSModule as OS };
export { EnvironmentModule as Environment };
export { ProcessModule as Process };
export { TypeConverterModule as TypeConverter };
//# sourceMappingURL=Service.d.ts.map