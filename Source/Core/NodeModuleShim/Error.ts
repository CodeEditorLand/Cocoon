/*
 * File: Cocoon/Source/Core/NodeModuleShim/Error.ts
 * Responsibility: Exports custom error classes for the Cocoon sidecar's Node.js module shimming system, enforcing security policies when blocked modules are accessed or required modules lack proper shims.
 * Modified: 2025-06-17 10:32:50 UTC
 * Export: default
 */

/**
 * @module Error (NodeModuleShim)
 * @description Exports all custom, tagged errors for the Node.js module shimming service.
 */

export { default as ModuleBlockedError } from "./Error/ModuleBlockedError.js";
export { default as ModuleNotShimmedError } from "./Error/ModuleNotShimmedError.js";
