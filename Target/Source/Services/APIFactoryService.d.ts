/**
 * @module APIFactoryService
 * @description
 * VS Code API factory service for Cocoon extension host.
 * Constructs complete VS Code API surface with extension-specific scoping.
 *
 * Based on VS Code's extension API construction patterns.
 * Specification: IMPLEMENTATION-SPECIFICATION.md (API Factory Service)
 */
import { Layer } from "effect";
import { IAPIFactoryService, APIConstructionRequest, APIConstructionResult, APIValidationResult } from "../Interfaces/IAPIFactoryService";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService";
/**
 * APIFactoryService implementation
 */
export declare class APIFactoryService implements IAPIFactoryService {
    private readonly _serviceBrand;
    private configurationService;
    private moduleInterceptorService;
    private apiCache;
    private apiVersions;
    private constructionMetrics;
    constructor(configurationService: IConfigurationService, moduleInterceptorService: IModuleInterceptorService);
    /**
     * Initialize API factory service
     */
    initialize(): Promise<void>;
    /**
     * Load API configuration
     */
    private loadAPIConfiguration;
    /**
     * Load API versions
     */
    private loadAPIVersions;
    /**
     * Initialize API cache
     */
    private initializeAPICache;
    /**
     * Create VS Code API for extension
     */
    createVSCodeAPI(request: APIConstructionRequest): Promise<APIConstructionResult>;
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
     * Apply security policies to API
     */
    private applySecurityPolicies;
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
    getUsageStatistics(): Promise<any>;
    /**
     * Update API version
     */
    updateAPIVersion(version: string): Promise<void>;
    /**
     * Get cache key
     */
    private getCacheKey;
    /**
     * Get API surface
     */
    private getAPISurface;
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
 * Service layer for APIFactoryService
 */
export declare const APIFactoryServiceLayer: Layer.Layer<IAPIFactoryService, never, never>;
/**
 * Live implementation for testing
 */
export declare const APIFactoryServiceLive: Layer.Layer<IAPIFactoryService, never, never>;
//# sourceMappingURL=APIFactoryService.d.ts.map