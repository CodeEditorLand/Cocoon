/*
 * File: Cocoon/Source/Core/RequireInterceptor/Factory.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:52 UTC
 * Export: default
 */

/**
 * @module Factory (RequireInterceptor)
 * @description Aggregates and exports all module factories used by the
 * `RequireInterceptor` service. This serves as a single point of import
 * for the different factory implementations.
 */

export type { default as INodeModuleFactory } from "./Factory/Interface.js";
export { default as VSCodeNodeModuleFactory } from "./Factory/VSCode.js";
