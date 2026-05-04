/**
 * @module ModuleInterceptor/Index
 * @description
 * Barrel re-export for the ModuleInterceptor service.
 * The ModuleInterceptor class is a single tightly-coupled unit (AST analysis,
 * security sandboxing, module caching, and telemetry are all co-dependent)
 * and cannot be split further without architectural changes.
 *
 * Types are separated in ./Types.ts for consumers that only need interfaces.
 */

export {
	default,
	ModuleInterceptorLayer,
	ModuleInterceptorLive,
} from "../Module/Interceptor.js";

export type {
	ModuleInterceptorConfig,
	ModuleCacheEntry,
	ASTNode,
	ModuleTelemetry,
} from "./Types.js";
