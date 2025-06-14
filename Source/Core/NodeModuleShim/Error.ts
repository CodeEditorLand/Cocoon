/**
 * @module Error (NodeModuleShim)
 * @description Exports all custom, tagged errors for the Node.js module shimming service.
 */

export { default as ModuleBlockedError } from "./Error/ModuleBlockedError.js";
export { default as ModuleNotShimmedError } from "./Error/ModuleNotShimmedError.js";
