/**
 * @module PatchProcess
 * @description This module defines the `PatchProcess` service and the main
 * orchestrator `Effect` that composes and applies all individual process-level
 * patches at application startup. It ensures the Node.js environment is stable,
 * secure, and properly configured before any extension code is loaded.
 */
import { Effect } from "effect";
/**
 * @interface PatchProcess
 * @description The contract for the service that provides access to native process
 * functions and configuration for other process-patching Effects.
 */
export interface PatchProcess {
    readonly NativeExit: (code?: number) => never;
    readonly NativeCrash: (() => void) | undefined;
    readonly AllowExit: () => boolean;
}
declare const PatchProcessService_base: Effect.Service.Class<PatchProcessService, "Service/PatchProcess", {
    readonly effect: Effect.Effect<{
        NativeExit: any;
        NativeCrash: any;
        AllowExit: () => boolean;
    }, never, never>;
}>;
/**
 * @class PatchProcessService
 * @description The `Effect.Service` for the `PatchProcess` service.
 * This service is a crucial part of the sandboxing mechanism. It captures the
 * original, native `process` functions before they can be overwritten, and it
 * holds the configuration that determines whether termination is allowed.
 */
export declare class PatchProcessService extends PatchProcessService_base {
}
/**
 * @description The main orchestrator `Effect` for applying all core process patches.
 * It runs all patches concurrently where possible. This `Effect` should be one of the
 * very first to run at application startup.
 */
export declare const RunPatchProcess: Effect.Effect<void, never, any>;
export {};
//# sourceMappingURL=PatchProcess.d.ts.map