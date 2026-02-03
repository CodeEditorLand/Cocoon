/**
 * @module ServiceMapping
 * @description
 * Service mapping registry for Cocoon's dependency injection system.
 * Based on Wind's successful service mapping pattern.
 *
 * This registry manages service dependencies and provides dependency injection
 * capabilities following Effect-TS patterns.
 */

import { Context, Effect, Layer } from "effect";

import { IAPIFactoryService } from "./Interfaces/IAPIFactoryService";
// Import service interfaces
import { IConfigurationService } from "./Interfaces/IConfigurationService";
import { IErrorHandlingService } from "./Interfaces/IErrorHandlingService";
import { IExtensionHostService } from "./Interfaces/IExtensionHostService";
import { IGRPCServerService } from "./Interfaces/IGRPCServerService";
import { IIPCService } from "./Interfaces/IIPCService";
import { IModuleInterceptorService } from "./Interfaces/IModuleInterceptorService";
import { IMountainClientService } from "./Interfaces/IMountainClientService";
import { IPerformanceMonitoringService } from "./Interfaces/IPerformanceMonitoringService";
import { ISecurityService } from "./Interfaces/ISecurityService";
import {
	APIFactoryService,
	APIFactoryServiceLive,
} from "./Services/APIFactoryService";
// Import service implementations
import {
	ConfigurationService,
	ConfigurationServiceLive,
} from "./Services/Configuration";
import { ConfigurationChannel } from "./Services/ConfigurationChannel";
import {
	ErrorHandlingService,
	ErrorHandlingServiceLive,
} from "./Services/ErrorHandlingService";
// Import channel implementations
import { ExtensionChannel } from "./Services/ExtensionChannel";
import {
	ExtensionHostService,
	ExtensionHostServiceLive,
} from "./Services/ExtensionHostService";
import {
	GRPCServerService,
	GRPCServerServiceLive,
} from "./Services/GRPCServerService";
import { IPCService, IPCServiceLive } from "./Services/IPCService";
import {
	ModuleInterceptorService,
	ModuleInterceptorServiceLive,
} from "./Services/ModuleInterceptorService";
import {
	MountainClientService,
	MountainClientServiceLive,
} from "./Services/MountainClientService";
import {
	PerformanceMonitoringService,
	PerformanceMonitoringServiceLive,
} from "./Services/PerformanceMonitoringService";
import {
	SecurityService,
	SecurityServiceLive,
} from "./Services/SecurityService";

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
	private static services: Map<string, ServiceDescriptor<unknown>> =
		new Map();

	/**
	 * Register a service
	 */
	static registerService<T>(
		name: string,
		descriptor: ServiceDescriptor<T>,
	): void {
		this.services.set(name, descriptor);
		console.log(`[ServiceMapping] Registered service: ${name}`);
	}

	/**
	 * Get a service
	 */
	static getService<T>(
		interfaceTag: Context.Tag<unknown, T>,
	): Effect.Effect<T, never, unknown> {
		const serviceName = this.findServiceName(interfaceTag);
		if (!serviceName) {
			return Effect.fail(
				new Error(`Service not found for interface: ${interfaceTag}`),
			);
		}

		const descriptor = this.services.get(serviceName);
		if (!descriptor) {
			return Effect.fail(
				new Error(`Service descriptor not found: ${serviceName}`),
			);
		}

		return Effect.succeed({} as T); // TODO: Implement proper service resolution
	}

	/**
	 * Get service layer
	 */
	static getServiceLayer<T>(
		interfaceTag: Context.Tag<unknown, T>,
	): Layer.Layer<never, never, T> {
		const serviceName = this.findServiceName(interfaceTag);
		if (!serviceName) {
			throw new Error(
				`Service layer not found for interface: ${interfaceTag}`,
			);
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
	private static findServiceName<T>(
		interfaceTag: Context.Tag<unknown, T>,
	): string | undefined {
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
	 * Initialize service mapping with channel registration
	 */
	static initialize(): void {
		console.log("[ServiceMapping] Initializing service mapping registry");

		// Register Configuration Service
		this.registerService("ConfigurationService", {
			interface: IConfigurationService,
			implementation: ConfigurationServiceLive,
			dependencies: [],
		});

		// Register IPC Service
		this.registerService("IPCService", {
			interface: IIPCService,
			implementation: IPCServiceLive,
			dependencies: [],
		});

		// Register Extension Host Service
		this.registerService("ExtensionHostService", {
			interface: IExtensionHostService,
			implementation: ExtensionHostServiceLive,
			dependencies: [IConfigurationService, IIPCService],
		});

		// Register GRPC Server Service
		this.registerService("GRPCServerService", {
			interface: IGRPCServerService,
			implementation: GRPCServerServiceLive,
			dependencies: [],
		});

		// Register Mountain Client Service
		this.registerService("MountainClientService", {
			interface: IMountainClientService,
			implementation: MountainClientServiceLive,
			dependencies: [],
		});

		// Register ModuleInterceptorService
		this.registerService("ModuleInterceptorService", {
			interface: IModuleInterceptorService,
			implementation: ModuleInterceptorServiceLive,
			dependencies: [],
		});

		// Register APIFactoryService
		this.registerService("APIFactoryService", {
			interface: IAPIFactoryService,
			implementation: APIFactoryServiceLive,
			dependencies: [IConfigurationService, IModuleInterceptorService],
		});

		// Register PerformanceMonitoringService
		this.registerService("PerformanceMonitoringService", {
			interface: IPerformanceMonitoringService,
			implementation: PerformanceMonitoringServiceLive,
			dependencies: [],
		});

		// Register SecurityService
		this.registerService("SecurityService", {
			interface: ISecurityService,
			implementation: SecurityServiceLive,
			dependencies: [],
		});

		// Register ErrorHandlingService
		this.registerService("ErrorHandlingService", {
			interface: IErrorHandlingService,
			implementation: ErrorHandlingServiceLive,
			dependencies: [],
		});

		// Initialize channels after services
		this.initializeChannels();

		console.log("[ServiceMapping] Service mapping registry initialized");
		console.log(
			`[ServiceMapping] Registered services: ${this.getRegisteredServices().join(", ")}`,
		);

		// Validate all service dependencies
		this.validateDependencies();

		console.log(
			"[ServiceMapping] Enhanced services include advanced Mountain integration, security features, and production-ready error handling",
		);
	}

	private validateDependencies(): boolean {
		for (const [name, service] of this.services) {
			for (const dependency of service.dependencies) {
				const dependencyName = this.services.get(dependency);
				if (!dependencyName) {
					console.error(
						`[ServiceMapping] Dependency not found: ${dependency} for service ${name}`,
					);
					return false;
				}
			}
		}

		console.log("[ServiceMapping] All service dependencies validated");
		return true;
	}
}

/**
 * Initialize service mapping on module load
 */
ServiceMapping.initialize();

export default ServiceMapping;
