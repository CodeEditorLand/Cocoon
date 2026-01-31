/**
 * @module IAPIFactory
 * @description
 * Interface for VS Code API factory.
 * Constructs complete VS Code API surface with extension-specific scoping and security.
 *
 * @future TODO: Add cross-Element integration methods for Air/Echo/Sky services
 */
export interface APIConstructionRequest {
    extensionId: string;
    extensionDescription: any;
    securityContext: any;
    apiVersion: string;
}
export interface APIConstructionResult {
    success: boolean;
    vscodeAPI?: any;
    error?: string;
    constructionTime: number;
    apiSurface: string[];
}
export interface APIValidationResult {
    valid: boolean;
    missingAPIs: string[];
    deprecatedAPIs: string[];
    performanceWarnings: string[];
}
export interface IAPIFactory {
    readonly _serviceBrand: undefined;
    /**
     * Initialize API factory service
     */
    initialize(): Promise<void>;
    /**
     * Create VS Code API for extension
     */
    createVSCodeAPI(request: APIConstructionRequest): Promise<APIConstructionResult>;
    /**
     * Create extension-specific API context
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
     * Cleanup API factory service
     */
    cleanup?(): Promise<void>;
}
/**
 * Effect context for APIFactory
 */
export declare const IAPIFactory: any;
//# sourceMappingURL=IAPIFactory.d.ts.map