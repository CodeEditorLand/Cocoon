/*
 * File: Cocoon/Source/Core/NodeModuleShim/Error.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:23 UTC
 * Export: default
 */

/**
 * @module Error (NodeModuleShim)
 * @description Exports all custom, tagged errors for the Node.js module shimming service.
 */

export { default as ModuleBlockedError } from "./Error/ModuleBlockedError.js";
export { default as ModuleNotShimmedError } from "./Error/ModuleNotShimmedError.js";
