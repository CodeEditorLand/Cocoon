/**
 * @module Loader
 * @description
 * Loads and applies security measures to extension processes during initialization.
 * Performs process hardening setup, applies security patches, and initializes monitoring.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: Air provides native process controls that Loader configures.
 * Air's security modules are initialized and configured through Loader's setup routines.
 *
 * **Mountain (Security Policies)**: Loader retrieves and applies security policies from Mountain.
 * Security policies are synchronized and enforced during process initialization.
 *
 * **Wind (Effect-TS Services)**: Loader ensures Wind services are initialized within hardened context.
 * All Effect-TS services are wrapped in security layers by Loader.
 *
 * **Output (VSCode Reference)**: Based on VSCode's extension host initialization:
 * - src/vs/workbench/services/extensions/node/extensionHostProcess.ts
 * - src/vs/workbench/services/extensions/common/extensionHostMain.ts
 *
 * ## Responsibilities
 *
 * 1. Load and validate security configuration
 * 2. Apply process security patches
 * 3. Initialize monitoring and validation
 * 4. Setup resource limits
 * 5. Configure child process handling
 * 6. Initialize security event listeners
 * 7. Provide security telemetry
 *
 * ## TODOs
 *
 * - **TBD**: Native module loading for OS-specific controls
 * - **TBD**: Process isolation container setup (cgroups, Job Objects)
 * - **TBD**: Security policy hot-reloading
 * - **TBD**: Distributed tracing for security events
 * - **TBD**: Automated security compliance checks
 * - **TBD**: Emergency lockdown mode
 * - **TBD**: Security audit log aggregation
 * - **TBD**: Rate limiting and throttling controls
 */
import { Effect, Layer } from "effect";
import { SecurityPolicy } from "./Security.js";
/**
 * Interface for the Loader service
 * Provides methods for loading and applying security measures
 */
export interface Loader {
    /**
     * Load and apply all security patches
     */
    readonly LoadSecurityPatches: Effect.Effect<void>;
    /**
     * Initialize process monitoring
     */
    readonly InitializeMonitoring: Effect.Effect<void>;
    /**
     * Get current security policy
     */
    readonly GetSecurityPolicy: Effect.Effect<SecurityPolicy>;
    /**
     * Run security audit
     */
    readonly RunSecurityAudit: Effect.Effect<any>;
}
declare const LoaderService_base: Effect.Service.Class<LoaderService, "PatchProcess/LoaderService", {
    readonly effect: Effect.Effect<{
        LoadSecurityPatches: Effect.Effect<void, import("effect/ConfigError").ConfigError, unknown>;
        InitializeMonitoring: Effect.Effect<void, never, never>;
        GetSecurityPolicy: Effect.Effect<{
            AllowExit: boolean;
            MaxMemoryMB: number;
            MaxCpuPercent: number;
            AllowNetwork: boolean;
            AllowedEndpoints: never[];
            AllowChildProcesses: boolean;
            AllowedChildCommands: never[];
            AllowedPaths: never[];
            DeniedPaths: string[];
            MaxFileDescriptors: number;
            MaxTimers: number;
        }, never, never>;
        RunSecurityAudit: Effect.Effect<{
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
    }, never, never>;
}>;
/**
 * Service class for process security loading
 * Orchestrates all security initialization and setup
 */
export declare class LoaderService extends LoaderService_base {
}
/**
 * Main initialization Effect for loader
 * Loads all security measures and prepares environment
 */
export declare const InitializeSecurityLoader: Effect.Effect<void, import("effect/ConfigError").ConfigError, unknown>;
/**
 * Validate file system access wrapper
 * Intercepts file operations and validates them
 */
export declare const ValidateFileSystemAccessWrapper: (File: string, Operation: "read" | "write" | "delete") => Effect.Effect<boolean>;
/**
 * Validate network access wrapper
 * Intercepts network operations and validates them
 */
export declare const ValidateNetworkAccessWrapper: (Endpoint: string, Operation: "connect" | "listen") => Effect.Effect<boolean>;
/**
 * Validate child process spawn wrapper
 * Intercepts child process operations and validates them
 */
export declare const ValidateChildProcessSpawnWrapper: (Command: string, Arguments: readonly string[]) => Effect.Effect<boolean>;
/**
 * Install all security hooks
 * Installs all module-level interceptors
 */
export declare const InstallSecurityHooks: Effect.Effect<void, never, never>;
/**
 * Get process resource usage
 * Returns current resource statistics
 */
export declare const GetResourceUsage: Effect.Effect<{
    Memory: NodeJS.MemoryUsage;
    CpuUsage: NodeJS.CpuUsage;
    Uptime: number;
    Pid: number;
    Ppid: number;
    Platform: NodeJS.Platform;
    Arch: NodeJS.Architecture;
    NodeVersion: string;
    Timestamp: number;
}, never, never>;
/**
 * Cleanup security loader
 * Performs graceful shutdown of security monitoring
 */
export declare const CleanupSecurityLoader: Effect.Effect<void, never, never>;
/**
 * Live layer for LoaderService
 */
export declare const LoaderServiceLive: Layer.Layer<unknown, unknown, unknown>;
/**
 * Complete security layer including loader, patcher, and monitoring
 */
export declare const SecurityLive: Layer.Layer<unknown, unknown, unknown>;
export {};
//# sourceMappingURL=Loader.d.ts.map