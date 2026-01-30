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

// Import service interfaces
import { IConfigurationService } from "./Interfaces/IConfigurationService";
import { IExtensionHostService } from "./Interfaces/IExtensionHostService";
import { IIPCService } from "./Interfaces/IIPCService";
import { IGRPCServerService } from "./Interfaces/IGRPCServerService";
import { IMountainClientService } from "./Interfaces/IMountainClientService";

// Import service implementations
import { ConfigurationServiceLive } from "./Services/Configuration";
import { ExtensionHostServiceLive } from "./Services/ExtensionHostService";
import { IPCServiceLive } from "./Services/IPCService";
import { GRPCServerServiceLive } from "./Services/GRPCServerService";
import { MountainClientServiceLive } from "./Services/MountainClientService";

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
    static getService<T>(interfaceTag: Context.Tag<any, T>): Effect.Effect<T, never, any> {
        const serviceName = this.findServiceName(interfaceTag);
        if (!serviceName) {
            throw new Error(`Service not found for interface: ${interfaceTag}`);
        }
        
        const descriptor = this.services.get(serviceName);
        if (!descriptor) {
            throw new Error(`Service descriptor not found: ${serviceName}`);
        }
        
        return Effect.succeed({} as T); // TODO: Implement proper service resolution
    }
    
    /**
     * Get service layer
     */
    static getServiceLayer<T>(interfaceTag: Context.Tag<any, T>): Layer.Layer<never, never, T> {
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
    private static findServiceName<T>(interfaceTag: Context.Tag<any, T>): string | undefined {
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
        
        // Register GRPC Server Service
        this.registerService('GRPCServerService', {
            interface: IGRPCServerService,
            implementation: GRPCServerServiceLive,
            dependencies: []
        });
        
        // Register Mountain Client Service
        this.registerService('MountainClientService', {
            interface: IMountainClientService,
            implementation: MountainClientServiceLive,
            dependencies: []
        });
        
        // TODO: Register ModuleInterceptorService
        // Specification: IMPLEMENTATION-SPECIFICATION.md (Module Interceptor Service)
        // Implementation: Create ModuleInterceptorService implementation
        // Dependencies: ExtensionHostService, SecurityService
        // Validation: Test module interception functionality
        
        // TODO: Register APIFactoryService
        // Specification: IMPLEMENTATION-SPECIFICATION.md (API Factory Service)
        // Implementation: Create APIFactoryService implementation
        // Dependencies: ModuleInterceptorService, ConfigurationService
        // Validation: Test VS Code API construction
        
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
        
        return Layer.mergeAll(...serviceLayers as [Layer.Layer<never, never, any>, ...Layer.Layer<never, never, any>[]]);
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
