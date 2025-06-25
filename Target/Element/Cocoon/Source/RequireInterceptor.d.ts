/**
 * @module RequireInterceptor
 * @description Defines the service for patching Node.js's `require` function.
 * This interception is critical for providing sandboxed APIs like the `vscode`
 * module to extensions, ensuring each extension receives its own isolated API instance.
 */
import { Effect } from "effect";
import { APIFactory } from "./APIFactory.js";
import { ExtensionPathService } from "./ExtensionPath.js";
import { NodeModuleShimService } from "./NodeModuleShim.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface RequireInterceptor
 * @description The contract for the RequireInterceptor service.
 */
export interface RequireInterceptor {
    /**
     * An `Effect` that, when executed, patches the `Module.prototype.require`
     * function to intercept module loads.
     */
    readonly Install: () => Effect.Effect<void, never>;
}
declare const RequireInterceptorService_base: Effect.Service.Class<RequireInterceptorService, "Service/RequireInterceptor", {
    readonly effect: Effect.Effect<{
        Install: () => Effect.Effect<void, never, never>;
    }, never, LoggerService | APIFactory | ExtensionPathService | NodeModuleShimService>;
}>;
/**
 * @class RequireInterceptor
 * @description The `Effect.Service` for the RequireInterceptor.
 */
export declare class RequireInterceptorService extends RequireInterceptorService_base {
}
export {};
