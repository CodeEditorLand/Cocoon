/**
 * @module ServiceMapping
 * @description
 * Service mapping registry for Cocoon's dependency injection system.
 * Based on Wind's successful service mapping pattern.
 *
 * This registry manages service dependencies and provides dependency injection
 * capabilities following Effect-TS patterns.
 */
import { Effect, Layer, Context } from "effect";
/**
 * Service descriptor interface
 */
export interface ServiceDescriptor<T> {
    interface: Context.Tag<any, T>;
    implementation: Layer.Layer<never, never, T>;
    dependencies?: Context.Tag<any, any>[];
}
/**
 * Service mapping registry
 */
export declare class ServiceMapping {
    private static services;
    /**
     * Register a service
     */
    static registerService<T>(name: string, descriptor: ServiceDescriptor<T>): void;
    /**
     * Get a service
     */
    static getService<T>(interfaceTag: Context.Tag<any, T>): Effect.Effect<T, never, any>;
    /**
     * Get service layer
     */
    static getServiceLayer<T>(interfaceTag: Context.Tag<any, T>): Layer.Layer<never, never, T>;
    /**
     * Find service name by interface
     */
    private static findServiceName;
    /**
     * Get all registered services
     */
    static getRegisteredServices(): string[];
    /**
     * Initialize service mapping with channel registration
     */
    static initialize(): void;
    private validateDependencies;
}
export default ServiceMapping;
//# sourceMappingURL=ServiceMapping.d.ts.map