/**
 * @module Patcher
 * @description
 * Main orchestrator for applying process-level security patches and hardening measures.
 * This module is responsible for patching the Node.js process to restrict malicious or buggy extensions.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: Air provides OS-level security enforcement through native process controls.
 * When Air enforces quotas or privileges, those policies are synchronized with Cocoon's process patching.
 *
 * **Mountain (Security Policies)**: Mountain centralizes security policies and synchronizes them with
 * Cocoon's process hardening. Security limits (CPU, memory, network) are retrieved from Mountain's
 * state management.
 *
 * **Wind (Effect-TS Services)**: Wind services respect the security boundaries established by the
 * Patcher. All Effect-TS operations run within the hardened environment.
 *
 * **Output (VSCode Reference)**: Based on VSCode's extension host security patterns:
 * - src/vs/workbench/services/extensions/common/extHostExtensionService.ts
 * - src/vs/base/parts/sandbox/electron-sandbox/preload.js
 *
 * ## Responsibilities
 *
 * 1. Patch process.exit() and process.crash() to prevent unauthorized termination
 * 2. Limit Error.stackTraceLimit to prevent stack trace attacks
 * 3. Block dangerous modules like "natives"
 * 4. Pipe console logging to host for security monitoring
 * 5. Setup global exception handlers for error containment
 * 6. Configure environment variables for secure execution
 * 7. Monitor parent process for graceful termination
 *
 * ## TODOs
 *
 * - **TBD**: Windows-specific process isolation using Job Objects and AppContainer
 * - **TBD**: Linux seccomp filters for system call restriction
 * - **TBD**: macOS sandbox enforcement and entitlements
 * - **TBD**: Security policy synchronization with Mountain via IPC
 * - **TBD**: Telemetry integration for security event logging
 * - **TBD**: Real-time process monitoring for suspicious activity
 * - **TBD**: Memory pressure detection and early warning system
 * - **TBD**: Process priority management for extension isolation
 */
import { Effect } from "effect";
import { SecurityPolicy } from "./Security.js";
/**
 * Interface for the Patcher service providing access to native process functions
 * Allows other security modules to interact with process controls
 */
export interface Patcher {
    /**
     * Original native process.exit function
     */
    readonly NativeExit: (code?: number) => never;
    /**
     * Original native process.crash function (if available)
     */
    readonly NativeCrash: (() => void) | undefined;
    /**
     * Check if process exit is allowed by security policy
     */
    readonly AllowExit: () => boolean;
    /**
     * Get current security policy
     */
    readonly GetSecurityPolicy: () => SecurityPolicy;
}
declare const PatcherService_base: Effect.Service.Class<PatcherService, "PatchProcess/PatcherService", {
    readonly effect: Effect.Effect<{
        NativeExit: (code?: number | string | null) => never;
        NativeCrash: any;
        AllowExit: () => boolean;
        GetSecurityPolicy: () => SecurityPolicy;
    }, import("effect/ConfigError").ConfigError, never>;
}>;
/**
 * Service class for process patching
 * Captures native functions before they can be patched, and maintains security configuration
 */
export declare class PatcherService extends PatcherService_base {
}
/**
 * Main orchestrator Effect for applying all process patches
 * Runs all patches concurrently where possible
 * Should be one of the first Effects to run at startup
 */
export declare const RunPatchProcess: Effect.Effect<void, import("effect/ConfigError").ConfigError, unknown>;
/**
 * Reload security policy at runtime
 * Allows dynamic policy updates from Mountain
 */
export declare const ReloadSecurityPolicy: Effect.Effect<SecurityPolicy, never, never>;
export {};
//# sourceMappingURL=Patcher.d.ts.map