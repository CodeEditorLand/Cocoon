/**
 * @module IModuleInterceptor
 * @description
 * Interface for advanced module interception service.
 * Provides security sandboxing and module resolution for extensions.
 *
 * FUTURE: Module pre-loading - add preloadModules() for optimization
 */

import { Context } from "effect";

// Module interception types
export interface ModuleInterceptionRequest {
	moduleId: string;

	parentModule?: string;

	extensionId: string;

	requirePath: string;
}

export interface ModuleInterceptionResult {
	success: boolean;

	module?: any;

	error?: string;

	securityLevel: SecurityLevel;
}

export enum SecurityLevel {
	TRUSTED = "TRUSTED",

	SANDBOXED = "SANDBOXED",

	RESTRICTED = "RESTRICTED",

	BLOCKED = "BLOCKED",
}

export interface SecurityPolicy {
	extensionId: string;

	allowedModules: string[];

	blockedModules: string[];

	securityLevel: SecurityLevel;

	maxMemoryUsage?: number;

	maxExecutionTime?: number;
}

export interface IModuleInterceptor {
	readonly _serviceBrand: undefined;

	/**
	 * Initialize module interception service
	 */
	initialize(): Promise<void>;

	/**
	 * Intercept module require calls
	 */
	interceptRequire(
		request: ModuleInterceptionRequest,
	): Promise<ModuleInterceptionResult>;

	/**
	 * Resolve module path for extension
	 */
	resolveModule(extensionId: string, modulePath: string): Promise<string>;

	/**
	 * Set security policy for extension
	 */
	setSecurityPolicy(policy: SecurityPolicy): Promise<void>;

	/**
	 * Get security policy for extension
	 */
	getSecurityPolicy(extensionId: string): Promise<SecurityPolicy | undefined>;

	/**
	 * Create security context for extension
	 */
	createSecurityContext(extensionId: string): Promise<any>;

	/**
	 * Validate module security
	 */
	validateModuleSecurity(
		extensionId: string,

		moduleId: string,
	): Promise<boolean>;

	/**
	 * Get interception statistics
	 */
	getStatistics(): Promise<{
		totalInterceptions: number;

		blockedModules: number;

		averageResolutionTime: number;

		securityViolations: number;
	}>;

	/**
	 * Cleanup module interception service
	 */
	cleanup?(): Promise<void>;
}

/**
 * Effect context for ModuleInterceptor
 */
export const IModuleInterceptor =
	Context.Tag<IModuleInterceptor>("IModuleInterceptor");
