/**
 * @module NodeModuleShim
 * @description Defines the service for intercepting requests for built-in Node.js
 * modules. It provides safe, sandboxed shims for allowed modules (like `os` and
 * `crypto`) and explicitly blocks access to modules that could compromise host
 * stability or security (like `fs` and `child_process`).
 */
import { Effect, Exit } from "effect";
import type { Uri } from "vscode";
import { InitDataService } from "./InitData.js";
import { LoggerService } from "./Logger.js";
import { ModuleBlockedProblem } from "./NodeModuleShim/ModuleBlockedProblem.js";
import { ModuleNotShimmedProblem } from "./NodeModuleShim/ModuleNotShimmedProblem.js";
/**
 * @interface NodeModuleShim
 * @description The contract for the NodeModuleShim service.
 */
export interface NodeModuleShim {
    /**
     * Loads a shim for a requested built-in Node.js module.
     * @param Request The name of the module being required (e.g., 'os').
     * @param ParentUri The URI of the module making the `require` call.
     * @returns An `Exit` value that is either a `Success` containing the shim
     * or a `Failure` with a `ModuleBlockedProblem` or `ModuleNotShimmedProblem`.
     */
    readonly Load: (Request: string, ParentUri?: Uri) => Exit.Exit<any, ModuleBlockedProblem | ModuleNotShimmedProblem>;
}
declare const NodeModuleShimService_base: Effect.Service.Class<NodeModuleShimService, "Service/NodeModuleShim", {
    readonly effect: Effect.Effect<{
        Load: (Request: string, ParentUri?: Uri) => Exit.Exit<any, ModuleBlockedProblem | ModuleNotShimmedProblem>;
    }, never, LoggerService | InitDataService>;
}>;
/**
 * @class NodeModuleShim
 * @description The `Effect.Service` for providing sandboxed shims for Node.js modules.
 */
export declare class NodeModuleShimService extends NodeModuleShimService_base {
}
export {};
