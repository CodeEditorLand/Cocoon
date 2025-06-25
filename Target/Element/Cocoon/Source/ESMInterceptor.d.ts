/**
 * @module ESMInterceptor
 * @description Defines the service for setting up the Node.js loader hook to
 * intercept `import 'vscode'` statements and provide a sandboxed API module.
 */
import { Effect } from "effect";
import { ExtensionPathService } from "./ExtensionPath.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface ESMInterceptor
 * @description The contract for the ESMInterceptor service.
 */
export interface ESMInterceptor {
    /**
     * An `Effect` that, when executed, installs the ESM loader hook
     * and handles the cleanup of all associated resources.
     */
    readonly Install: () => Effect.Effect<void, Error>;
}
declare const ESMInterceptorService_base: Effect.Service.Class<ESMInterceptorService, "Service/ESMInterceptor", {
    readonly effect: Effect.Effect<{
        Install: () => Effect.Effect<void, Error>;
    }, never, LoggerService | import("./APIFactory.js").APIFactory | ExtensionPathService>;
}>;
/**
 * @class ESMInterceptorService
 * @description The `Effect.Service` for the `ESMInterceptor`.
 */
export declare class ESMInterceptorService extends ESMInterceptorService_base {
}
export {};
