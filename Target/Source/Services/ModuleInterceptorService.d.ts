/**
 * @module ModuleInterceptorService
 * @description
 * Advanced module interception service for Cocoon extension host.
 * Provides AST-based security sandboxing and module isolation for extensions.
 *
 * Based on VS Code's extension host module interception pattern.
 * Specification: ARCHITECTURE-SPECIFICATION.md (Module Interceptor Service)
 */
import { Layer } from "effect";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService";
interface ModuleInterceptorConfig {
    allowNodeBuiltins: boolean;
    allowFileSystemAccess: boolean;
    allowNetworkAccess: boolean;
    allowedModules: string[];
    blockedModules: string[];
}
/**
 * ModuleInterceptorService implementation
 */
export declare class ModuleInterceptorService implements IModuleInterceptorService {
    private readonly _serviceBrand;
    private config;
    private moduleCache;
    private securitySandbox;
    constructor();
    /**
     * Load default configuration
     */
    private loadDefaultConfig;
    /**
     * Create security sandbox with safe functions
     */
    private createSecuritySandbox;
    /**
     * Intercept module require calls
     */
    interceptRequire(modulePath: string, parentPath: string): any;
    /**
     * Validate module access permissions
     */
    private validateModuleAccess;
    /**
     * Check if module is Node.js built-in
     */
    private isNodeBuiltin;
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
     * Resolve module path
     */
    resolveModule(modulePath: string, parentPath: string): string;
    /**
     * Create extension context with isolated environment
     */
    createExtensionContext(extensionId: string): any;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ModuleInterceptorConfig>): void;
    /**
     * Get service status
     */
    getStatus(): {
        cacheSize: number;
        config: ModuleInterceptorConfig;
        securityRules: number;
    };
}
/**
 * Service layer for ModuleInterceptorService
 */
export declare const ModuleInterceptorServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const ModuleInterceptorServiceLive: Layer.Layer<unknown, never, never>;
export default ModuleInterceptorService;
//# sourceMappingURL=ModuleInterceptorService.d.ts.map