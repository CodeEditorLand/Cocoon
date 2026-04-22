/**
 * @module ModuleInterceptor/Types
 * @description
 * Type definitions and configuration interfaces for the ModuleInterceptor service.
 */

import type { SecurityLevel } from "../../Interfaces/IModuleInterceptor.js";

// Module interception configuration
export interface ModuleInterceptorConfig {
	allowNodeBuiltins: boolean;
	allowFileSystemAccess: boolean;
	allowNetworkAccess: boolean;
	allowedModules: string[];
	blockedModules: string[];
	securityPolicy: SecurityLevel;
}

// Module cache entry with security metadata
export interface ModuleCacheEntry {
	module: any;
	securityLevel: SecurityLevel;
	validationTime: number;
	path: string;
}

// AST node types for module analysis
export type ASTNode = any;

// Module loading telemetry
export interface ModuleTelemetry {
	totalModulesLoaded: number;
	blockedModules: number;
	sandboxedModules: number;
	averageAnalysisTime: number;
	securityViolations: number;
}

export default {};
