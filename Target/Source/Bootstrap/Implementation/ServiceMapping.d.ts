/**
 * @module ServiceMapping
 * @description
 * Service mapping registry for Cocoon's dependency injection system.
 * This follows Wind's pattern for managing service dependencies and layer composition.
 *
 * Architecture:
 * 1. Service descriptor registry for dependency tracking
 * 2. Layer composition system for Effect-TS services
 * 3. Integration with Mountain's service system
 *
 * TODOs:
 * - Implement actual service descriptors
 * - Create layer composition logic
 * - Integrate with Mountain services
 */
import { Effect, Layer, Context } from "effect";
declare const ConfigurationService_base: Context.TagClass<ConfigurationService, "Service/Configuration", {
    readonly getValue: <T>(key: string, defaultValue?: T, scope?: number) => T;
    readonly updateValue: (key: string, value: any, scope?: number) => Promise<void>;
    readonly inspect: <T>(key: string, scope?: number) => any;
    readonly keys: () => string[];
    readonly reloadConfiguration: () => Promise<void>;
}>;
/**
 * Configuration Service Tag
 * Manages configuration settings for extensions
 */
export declare class ConfigurationService extends ConfigurationService_base {
}
declare const ExtensionHostService_base: Context.TagClass<ExtensionHostService, "Service/ExtensionHost", {
    readonly activateExtension: (extensionId: string, activationEvent: string) => Effect.Effect<void>;
    readonly deactivateExtension: (extensionId: string) => Effect.Effect<void>;
    readonly getExtensionExports: (extensionId: string) => Effect.Effect<any>;
}>;
/**
 * Extension Host Service Tag
 * Manages extension lifecycle and activation
 */
export declare class ExtensionHostService extends ExtensionHostService_base {
}
declare const APIFactoryService_base: Context.TagClass<APIFactoryService, "Service/APIFactory", {
    readonly createVSCodeAPI: (extensionId: string) => Effect.Effect<any>;
    readonly getAPI: (extensionId: string) => Effect.Effect<any>;
}>;
/**
 * API Factory Service Tag
 * Constructs the vscode API object for extensions
 */
export declare class APIFactoryService extends APIFactoryService_base {
}
declare const IPCService_base: Context.TagClass<IPCService, "Service/IPC", {
    readonly sendRequest: <T>(method: string, params: any[]) => Effect.Effect<T>;
    readonly sendNotification: (method: string, params: any[]) => Effect.Effect<void>;
    readonly registerHandler: (method: string, handler: (...args: any[]) => Promise<any>) => Effect.Effect<void>;
}>;
/**
 * IPC Service Tag
 * Handles communication with Mountain via gRPC
 */
export declare class IPCService extends IPCService_base {
}
declare const ModuleInterceptorService_base: Context.TagClass<ModuleInterceptorService, "Service/ModuleInterceptor", {
    readonly install: () => Effect.Effect<void>;
    readonly uninstall: () => Effect.Effect<void>;
    readonly intercept: (moduleId: string) => Effect.Effect<any>;
}>;
/**
 * Module Interceptor Service Tag
 * Intercepts require('vscode') and ESM imports
 */
export declare class ModuleInterceptorService extends ModuleInterceptorService_base {
}
/**
 * Service descriptor interface
 * Defines service dependencies and implementation
 */
export interface ServiceDescriptor<T> {
    readonly tag: Context.Tag<T>;
    readonly dependencies: readonly Context.Tag<any>[];
    readonly implementation: Effect.Effect<T>;
}
/**
 * Service mapping registry
 * Manages service dependencies and layer composition
 */
export declare class ServiceMapping {
    private readonly descriptors;
    private readonly layers;
    constructor();
    /**
     * Register a service descriptor
     */
    register<T>(descriptor: ServiceDescriptor<T>): void;
    /**
     * Get service layer by tag
     */
    getLayer<T>(tag: Context.Tag<T>): Layer.Layer<T> | undefined;
    /**
     * Get all registered layers
     */
    getAllLayers(): Layer.Layer<any>[];
    /**
     * Compose application layer from all registered services
     */
    composeAppLayer(): Layer.Layer<any>;
    /**
     * Register core Cocoon services
     */
    private registerCoreServices;
    private getNestedValue;
    private setNestedValue;
    private collectKeys;
    /**
     * Validate service dependencies
     */
    validateDependencies(): Effect.Effect<void>;
    /**
     * Get service instance
     */
    getService<T>(tag: Context.Tag<T>): Effect.Effect<T>;
}
export declare const ServiceMappingInstance: ServiceMapping;
export {};
//# sourceMappingURL=ServiceMapping.d.ts.map