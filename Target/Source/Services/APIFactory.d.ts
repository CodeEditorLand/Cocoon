/**
 * @module APIFactory
 * @description
 * VS Code API factory for Cocoon extension host.
 * Constructs complete VS Code API surface with extension-specific scoping and security.
 *
 * Responsibilities:
 * - Create sandboxed VS Code API instances for extensions
 * - Validate API compatibility and security policies
 * - Implement comprehensive API versioning checks
 * - Provide security sandboxing for extension API access
 * - Integrate with Mountain for API discovery and schema validation
 * - Optimize API construction performance with caching
 * - Track API usage metrics and performance statistics
 *
 * Based on VS Code's extension API construction patterns.
 * Specification: IMPLEMENTATION-SPECIFICATION.md (API Factory)
 *
 * @future TODO: Integrate with Mountain API discovery (pending Mountain client from Agent 1)
 * @future TODO: Implement WebView panel API with full security sandboxing
 * @future TODO: Add cross-Element integration patterns for Air/Echo/Sky services
 * @future TODO: Implement API telemetry and usage analytics
 */
import { Layer } from "effect";
import { APIConstructionRequest, APIConstructionResult, APIValidationResult, IAPIFactory } from "../Interfaces/IAPIFactory";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { IModuleInterceptor } from "../Interfaces/IModuleInterceptor";
/**
 * APIFactory implementation
 */
export declare class APIFactory implements IAPIFactory {
    private readonly _serviceBrand;
    private configurationService;
    private moduleInterceptor;
    private apiCache;
    private apiVersions;
    private securityPolicies;
    private constructionMetrics;
    constructor(configurationService: IConfigurationService, moduleInterceptor: IModuleInterceptor);
    /**
     * Initialize API factory service
     */
    initialize(): Promise<void>;
    /**
     * Load API configuration from Mountain
     * @future TODO: Replace with actual Mountain client integration once available from Agent 1
     */
    private loadAPIConfiguration;
    /**
     * Load API versions with compatibility matrix
     */
    private loadAPIVersions;
    /**
     * Load security policies for extensions
     */
    private loadSecurityPolicies;
    /**
     * Initialize cache with pre-warmed APIs
     */
    private initializeCache;
    /**
     * Validate API version matrix
     */
    private validateAPIVersionMatrix;
    /**
     * Register with ModuleInterceptor for secure API access
     * @future TODO: Implement full integration when ModuleInterceptor methods are available
     */
    private registerWithInterceptor;
    /**
     * Create VS Code API for extension
     */
    createVSCodeAPI(request: APIConstructionRequest): Promise<APIConstructionResult>;
    /**
     * Validate security context
     */
    private validateSecurityContext;
    /**
     * Create API context for extension
     */
    private createAPIContext;
    /**
     * Construct VS Code API surface
     */
    private constructVSCodeAPI;
    /**
     * Create complete VS Code environment API
     */
    private createEnvAPI;
    /**
     * Create complete VS Code commands API
     */
    private createCommandsAPI;
    /**
     * Create complete VS Code window API
     */
    private createWindowAPI;
    /**
     * Create complete VS Code workspace API
     */
    private createWorkspaceAPI;
    /**
     * Create extensions API
     */
    private createExtensionsAPI;
    /**
     * Create languages API
     */
    private createLanguagesAPI;
    /**
     * Create debug API
     */
    private createDebugAPI;
    /**
     * Create SCM API
     */
    private createSCMAPI;
    /**
     * Create authentication API
     */
    private createAuthenticationAPI;
    /**
     * Validate URI access
     */
    private validateURIAccess;
    /**
     * Validate clipboard access
     */
    private validateClipboardAccess;
    /**
     * Validate external access
     */
    private validateExternalAccess;
    /**
     * Validate config access
     */
    private validateConfigAccess;
    /**
     * Validate command access
     */
    private validateCommandAccess;
    /**
     * Validate webview access
     */
    private validateWebviewAccess;
    /**
     * Validate file system access
     */
    private validateFileSystemAccess;
    /**
     * Apply security policies to API
     */
    private applySecurityPolicies;
    /**
     * Validate constructed API matches version spec
     */
    private validateConstructedAPI;
    /**
     * Create extension context
     */
    createExtensionContext(extensionId: string, extensionDescription: any): Promise<any>;
    /**
     * Register API service
     */
    registerService(serviceName: string, serviceImplementation: any): Promise<void>;
    /**
     * Validate API compatibility
     */
    validateAPICompatibility(extensionId: string, apiVersion: string): Promise<APIValidationResult>;
    /**
     * Get API usage statistics
     */
    getUsageStatistics(): Promise<{
        totalAPIConstructions: number;
        averageConstructionTime: number;
        mostUsedAPIs: string[];
        performanceMetrics: any;
    }>;
    /**
     * Update API version
     */
    updateAPIVersion(version: string): Promise<void>;
    /**
     * Get cache key
     */
    private getCacheKey;
    /**
     * Get API surface for version
     */
    private getAPISurfaceForVersion;
    /**
     * Track API cache hit
     */
    private trackAPICacheHit;
    /**
     * Update construction metrics
     */
    private updateMetrics;
    /**
     * Cleanup API factory service
     */
    cleanup(): Promise<void>;
}
/**
 * Service layer for APIFactory
 */
export declare const APIFactoryLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation for testing
 */
export declare const APIFactoryLive: Layer.Layer<unknown, never, never>;
export default APIFactory;
//# sourceMappingURL=APIFactory.d.ts.map