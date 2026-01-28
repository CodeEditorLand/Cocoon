/**
 * @module ServiceMapping
 * @description
 * Service mapping registry for Cocoon's dependency injection system.
 * Based on Wind's successful service mapping pattern.
 * 
 * This registry manages service dependencies and provides dependency injection
 * capabilities following Effect-TS patterns.
 */

import { Effect, Layer, Context, pipe } from "effect";

// Import service interfaces
import { IConfigurationService } from "./Interfaces/IConfigurationService";
import { IExtensionHostService } from "./Interfaces/IExtensionHostService";
import { IIPCService } from "./Interfaces/IIPCService";

// Import service implementations
import { ConfigurationService, ConfigurationServiceLive } from "./Services/Configuration";
import { ExtensionHostService, ExtensionHostServiceLive } from "./Services/ExtensionHostService";
import { IPCService, IPCServiceLive } from "./Services/IPCService";

/**
 * Service descriptor interface
 */
export interface ServiceDescriptor<T> {
    interface: Context.Tag<T, T>;
    implementation: Layer.Layer<never, never, T>;
    dependencies?: Context.Tag<any, any>[];
}

/**
 * Service mapping registry
 */
export class ServiceMapping {
    private static services: Map<string, ServiceDescriptor<any>> = new Map();
    
    /**
     * Register a service
     */
    static registerService<T>(
        name: string,
        descriptor: ServiceDescriptor<T>
    ): void {
        this.services.set(name, descriptor);
        console.log(`[ServiceMapping] Registered service: ${name}`);
    }
    
    /**
     * Get a service
     */
    static getService<T>(interfaceTag: Context.Tag<T, T>): Effect.Effect<T, never, any> {
        const serviceName = this.findServiceName(interfaceTag);
        if (!serviceName) {
            throw new Error(`Service not found for interface: ${interfaceTag}`);
        }
        
        const descriptor = this.services.get(serviceName);
        if (!descriptor) {
            throw new Error(`Service descriptor not found: ${serviceName}`);
        }
        
        return Effect.flatMap(
            Effect.service(interfaceTag),
            (service) => Effect.succeed(service)
        );
    }
    
    /**
     * Get service layer
     */
    static getServiceLayer<T>(interfaceTag: Context.Tag<T, T>): Layer.Layer<never, never, T> {
        const serviceName = this.findServiceName(interfaceTag);
        if (!serviceName) {
            throw new Error(`Service layer not found for interface: ${interfaceTag}`);
        }
        
        const descriptor = this.services.get(serviceName);
        if (!descriptor) {
            throw new Error(`Service descriptor not found: ${serviceName}`);
        }
        
        return descriptor.implementation;
    }
    
    /**
     * Find service name by interface
     */
    private static findServiceName<T>(interfaceTag: Context.Tag<T, T>): string | undefined {
        for (const [name, descriptor] of this.services.entries()) {
            if (descriptor.interface === interfaceTag) {
                return name;
            }
        }
        return undefined;
    }
    
    /**
     * Get all registered services
     */
    static getRegisteredServices(): string[] {
        return Array.from(this.services.keys());
    }
    
    /**
     * Initialize service mapping
     */
    static initialize(): void {
        console.log('[ServiceMapping] Initializing service mapping registry');
        
        // Register Configuration Service
        this.registerService('ConfigurationService', {
            interface: IConfigurationService,
            implementation: ConfigurationServiceLive,
            dependencies: []
        });
        
        // Register IPC Service
        this.registerService('IPCService', {
            interface: IIPCService,
            implementation: IPCServiceLive,
            dependencies: []
        });
        
        // Register Extension Host Service
        this.registerService('ExtensionHostService', {
            interface: IExtensionHostService,
            implementation: ExtensionHostServiceLive,
            dependencies: [IConfigurationService, IIPCService]
        });
        
        console.log('[ServiceMapping] Service mapping registry initialized');
        console.log(`[ServiceMapping] Registered services: ${this.getRegisteredServices().join(', ')}`);
    }
    
    /**
     * Create application layer with all services
     */
    static createApplicationLayer(): Layer.Layer<never, never, any> {
        const serviceLayers = Array.from(this.services.values()).map(
            descriptor => descriptor.implementation
        );
        
        return Layer.mergeAll(...serviceLayers);
    }
    
    /**
     * Validate service dependencies
     */
    static validateDependencies(): boolean {
        for (const [name, descriptor] of this.services.entries()) {
            if (descriptor.dependencies) {
                for (const dependency of descriptor.dependencies) {
                    const dependencyName = this.findServiceName(dependency);
                    if (!dependencyName) {
                        console.error(`[ServiceMapping] Dependency not found: ${dependency} for service ${name}`);
                        return false;
                    }
                }
            }
        }
        
        console.log('[ServiceMapping] All service dependencies validated');
        return true;
    }
}

/**
 * Initialize service mapping on module load
 */
ServiceMapping.initialize();

export default ServiceMapping;
