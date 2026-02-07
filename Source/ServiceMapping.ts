/**
 * @module ServiceMapping
 * @description
 * Defines the dependency injection container and service composition.
 * Orchestrates the initialization of all Core, Infrastructure, and UI services.
 */

import { Layer } from "effect";

// Interfaces
import { IConfigurationService } from "./Interfaces/IConfigurationService.js";
import { IExtensionHostService } from "./Interfaces/IExtensionHostService.js";
import { IIPCService } from "./Interfaces/IIPCService.js";
import { IModuleInterceptorService } from "./Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "./Interfaces/IMountainClientService.js";
import { IFileSystemService } from "./Interfaces/IFileSystemService.js";
import { ITerminalService } from "./Interfaces/ITerminalService.js";
import { ISecurityService } from "./Interfaces/ISecurityService.js";
import { IPerformanceMonitoringService } from "./Interfaces/IPerformanceMonitoringService.js";
import { IErrorHandlingService } from "./Interfaces/IErrorHandlingService.js";
import { IAPIFactoryService } from "./Services/APIFactoryService.js";

// Implementations
import { ConfigurationLayer } from "./Services/Configuration.js";
import { ExtensionHostLayer } from "./Services/ExtensionHostService.js";
import { IPCServiceLayer } from "./Services/IPCService.js";
import { ModuleInterceptorLayer } from "./Services/ModuleInterceptorService.js";
import { MountainClientLayer } from "./Services/MountainClientService.js";
import { APIFactoryLayer } from "./Services/APIFactoryService.js";
import { FileSystemServiceLayer } from "./Services/FileSystemService.js";
import { TerminalServiceLayer } from "./Services/TerminalService.js";
import { SecurityServiceLive } from "./Services/SecurityService.js";
import { PerformanceMonitoringServiceLive } from "./Services/PerformanceMonitoringService.js";
import { ErrorHandlingServiceLive } from "./Services/ErrorHandlingService.js";

/**
 * ServiceMapping implementation
 */
export class ServiceMapping {
	/**
	 * Validate dependencies
	 */
	static validateDependencies = () =>
		Layer.mergeAll(
			MountainClientLayer,
			IPCServiceLayer,
			ConfigurationLayer,
			ModuleInterceptorLayer,
			ExtensionHostLayer,
            APIFactoryLayer,
            FileSystemServiceLayer,
            TerminalServiceLayer,
            SecurityServiceLive,
            PerformanceMonitoringServiceLive,
            ErrorHandlingServiceLive
		);

	/**
	 * Compose application layer
	 */
	static composeAppLayer = () => {
        // Base Infrastructure
		const Base = Layer.mergeAll(
            MountainClientLayer, 
            IPCServiceLayer,
            SecurityServiceLive,
            PerformanceMonitoringServiceLive,
            ErrorHandlingServiceLive
        );
        
        // Core Capabilities (Depend on Base)
        const Config = ConfigurationLayer.pipe(Layer.provide(Base));
        const FS = FileSystemServiceLayer.pipe(Layer.provide(Base));
        const Terminal = TerminalServiceLayer.pipe(Layer.provide(Base));
        const ModuleInt = ModuleInterceptorLayer.pipe(Layer.provide(Base));

        // API Factory (Depends on Config, FS, Terminal, ModuleInt)
        const API = APIFactoryLayer.pipe(
            Layer.provide(Base),
            Layer.provide(Config),
            Layer.provide(FS),
            Layer.provide(Terminal),
            Layer.provide(ModuleInt)
        );

        // Extension Host (Depends on API, Config, ModuleInt)
        const ExtHost = ExtensionHostLayer.pipe(
             Layer.provide(Base),
             Layer.provide(Config),
             Layer.provide(API),
             Layer.provide(ModuleInt)
        );

		return Layer.mergeAll(
            Base, 
            Config,
            FS,
            Terminal,
            API, 
            ExtHost, 
            ModuleInt
        );
	};
}
