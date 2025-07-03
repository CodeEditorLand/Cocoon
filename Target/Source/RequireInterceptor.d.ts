/**
 * @module RequireInterceptor
 * @description Defines the service for patching Node.js's `require` function.
 * This interception is critical for providing sandboxed APIs like the `vscode`
 * module to extensions, ensuring each extension receives its own isolated API instance.
 */
import { Effect } from "effect";
import type { Uri } from "vscode";
import { APIFactoryService, type APIFactory } from "./APIFactory.js";
import { ExtensionPathService, type ExtensionPath } from "./ExtensionPath.js";
import { LoggerService, type Logger } from "./Logger.js";
import { NodeModuleShimService } from "./NodeModuleShim.js";
/**
 * @interface NodeModuleFactory
 * @description The interface for a factory that can produce a module when
 * `require(Request)` is called by an extension.
 */
export interface NodeModuleFactory {
    /**
     * Loads or creates a module instance.
     * @param Request The exact string passed to `require` (e.g., 'vscode').
     * @param ParentUri The URI of the module making the `require` call.
     * @returns The module object to be returned by the patched `require`.
     */
    Load(Request: string, ParentUri: Uri): any;
}
/**
 * @class VsCodeNodeModuleFactory
 * @description A factory that creates the `vscode` API object for a specific extension.
 * @implements {NodeModuleFactory}
 */
export declare class VsCodeNodeModuleFactory implements NodeModuleFactory {
    private readonly APIFactory;
    private readonly ExtensionPath;
    private readonly Logger;
    constructor(APIFactory: APIFactory, ExtensionPath: ExtensionPath, Logger: Logger);
    Load(_Request: "vscode", ParentUri: Uri): any;
}
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
    }, never, LoggerService | APIFactoryService | ExtensionPathService | NodeModuleShimService>;
}>;
/**
 * @class RequireInterceptor
 * @description The `Effect.Service` for the RequireInterceptor.
 */
export declare class RequireInterceptorService extends RequireInterceptorService_base {
}
export {};
//# sourceMappingURL=RequireInterceptor.d.ts.map