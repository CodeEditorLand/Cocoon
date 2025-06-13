/**
 * @module Factory (RequireInterceptor)
 * @description Aggregates and exports all module factories used by the
 * `RequireInterceptor` service. This serves as a single point of import
 * for the different factory implementations.
 */

export type { Interface as INodeModuleFactory } from "./Factory/Interface.js";
export { VscodeNodeModuleFactory } from "./Factory/Vscode.js";
