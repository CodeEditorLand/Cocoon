/**
 * @module ModuleInterceptor
 * @description
 * Advanced module interception service for Cocoon extension host.
 * Provides AST-based security sandboxing and module isolation for extensions.
 *
 * Responsibilities:
 * - Intercept and validate all module require/import calls
 * - Perform AST-based security analysis on loaded modules
 * - Implement secure module path resolution
 * - Create security sandboxes for extension code execution
 * - Manage module caching with security-aware invalidation
 * - Track module loading telemetry and statistics
 * - Enforce security policies for Node.js builtins and external modules
 *
 * Based on VS Code's extension host module interception pattern.
 * Specification: ARCHITECTURE-SPECIFICATION.md (Module Interceptor)
 *
 * @future TODO: Integrate with Mountain for module validation whitelist
 * @future TODO: Implement module telemetry collection for security analytics
 * @future TODO: Add module pre-loading optimization for performance
 */
import { Layer } from "effect";
import { IModuleInterceptor, SecurityLevel, SecurityPolicy } from "../Interfaces/IModuleInterceptor";
interface ModuleInterceptorConfig {
    allowNodeBuiltins: boolean;
    allowFileSystemAccess: boolean;
    allowNetworkAccess: boolean;
    allowedModules: string[];
    blockedModules: string[];
    securityPolicy: SecurityLevel;
}
interface ModuleTelemetry {
    totalModulesLoaded: number;
    blockedModules: number;
    sandboxedModules: number;
    averageAnalysisTime: number;
    securityViolations: number;
}
/**
 * ModuleInterceptor implementation
 */
export declare class ModuleInterceptor implements IModuleInterceptor {
    private readonly _serviceBrand;
    private config;
    private moduleCache;
    private securitySandbox;
    private securityPolicies;
    private telemetry;
    constructor();
    /**
     * Initialize module interceptor service
     */
    initialize(): Promise<void>;
    /**
     * Load security policies from configuration
     * @future TODO: Load from Mountain client when available
     */
    private loadSecurityPolicies;
    /**
     * Validate module path resolution
     */
    private validateModulePathResolution;
    /**
     * Setup telemetry reporting
     * @future TODO: Send telemetry to Mountain for analytics
     */
    private setupTelemetry;
    /**
     * Load default configuration
     */
    private loadDefaultConfig;
    /**
     * Create security sandbox with safe functions
     */
    private createSecuritySandbox;
    /**
     * Validate module access permissions
     */
    private validateModuleAccess;
    /**
     * Check if module is a safe Node.js built-in
     */
    private isSafeNodeBuiltin;
    /**
     * Check if module is Node.js built-in
     */
    private isNodeBuiltin;
    /**
     * Resolve module path with security checks
     */
    resolveModule(extensionId: string, modulePath: string): Promise<string>;
    /**
     * Resolve module path from parent
     */
    private resolveModulePath;
    /**
     * Validate module path doesn't escape allowed directories
     */
    private validateModulePath;
    /**
     * Validate resolved path
     */
    private validateResolvedPath;
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
     * Create extension-specific sandbox
     */
    private createExtensionSandbox;
    /**
     * Validate module security
     */
    validateModuleSecurity(extensionId: string, moduleId: string): Promise<boolean>;
    /**
     * Analyze module security using advanced AST parsing
     */
    private analyzeModuleSecurity;
    /**
     * Check if function is critically dangerous (block immediately)
     */
    private isCriticalDangerousFunction;
    /**
     * Check if function is dangerous (warning level)
     */
    private isDangerousFunction;
    /**
     * Check if property access is critically dangerous
     */
    private isCriticalDangerousPropertyAccess;
    /**
     * Check if property access is dangerous
     */
    private isDangerousPropertyAccess;
    /**
     * Check if assignment is critically dangerous
     */
    private isCriticalDangerousAssignment;
    /**
     * Check if assignment is dangerous
     */
    private isDangerousAssignment;
    /**
     * Check if import is dangerous
     */
    private isDangerousImport;
    /**
     * Check if constructor is dangerous
     */
    private isDangerousConstructor;
    /**
     * Perform pattern-based security analysis
     */
    private performPatternAnalysis;
    /**
     * Load and intercept module with security wrappers
     */
    private loadAndInterceptModule;
    /**
     * Create security wrapper for module
     */
    private createSecurityWrapper;
    /**
     * Wrap function with security checks
     */
    private wrapFunction;
    /**
     * Validate function argument
     */
    private validateFunctionArgument;
    /**
     * Get cache key
     */
    private getCacheKey;
    /**
     * Invalidate cache for extension
     */
    private invalidateCacheForExtension;
    /**
     * Invalidate all module cache
     */
    invalidateAllCache(): void;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ModuleInterceptorConfig>): void;
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
     * Get service status
     */
    getStatus(): {
        cacheSize: number;
        config: ModuleInterceptorConfig;
        securityRules: number;
        telemetry: ModuleTelemetry;
    };
    /**
     * Register with security services
     * @future TODO: Implement actual registration when SecurityService methods are available
     */
    registerWithSecurityService(): Promise<void>;
    /**
     * Cleanup module interceptor service
     */
    cleanup(): Promise<void>;
    /**
     * Create extension context with isolated environment
     * @deprecated Use createSecurityContext instead
     */
    createExtensionContext(extensionId: string): any;
}
/**
 * Service layer for ModuleInterceptor
 */
export declare const ModuleInterceptorLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const ModuleInterceptorLive: Layer.Layer<unknown, never, never>;
export default ModuleInterceptor;
//# sourceMappingURL=ModuleInterceptor.d.ts.map