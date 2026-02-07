/**
 * @module ServiceMapping
 * @description
 * Defines the dependency injection container and service composition.
 */

import { Layer } from "effect";
import { IConfigurationService } from "./Interfaces/IConfigurationService.js";
import { IExtensionHostService } from "./Interfaces/IExtensionHostService.js";
import { IIPCService } from "./Interfaces/IIPCService.js";
import { IModuleInterceptorService } from "./Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "./Interfaces/IMountainClientService.js";
import { IFileSystemService } from "./Interfaces/IFileSystemService.js";
import { ITerminalService } from "./Interfaces/ITerminalService.js";

import { ConfigurationLayer } from "./Services/Configuration.js";
import { ExtensionHostLayer } from "./Services/ExtensionHostService.js";
import { IPCServiceLayer } from "./Services/IPCService.js";
import { ModuleInterceptorLayer } from "./Services/ModuleInterceptorService.js";
import { MountainClientLayer } from "./Services/MountainClientService.js";
import { APIFactoryLayer, IAPIFactoryService } from "./Services/APIFactoryService.js";
import { FileSystemService, FileSystemServiceLayer } from "./Services/FileSystemService.js";
import { TerminalServiceLayer } from "./Services/TerminalService.js";

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
            TerminalServiceLayer
		);

	/**
	 * Compose application layer
	 */
	static composeAppLayer = () => {
        // Base layers
		const Base = Layer.merge(MountainClientLayer, IPCServiceLayer);
        
        // Capabilities depend on Base
        const Config = ConfigurationLayer.pipe(Layer.provide(Base));
        const FS = FileSystemServiceLayer.pipe(Layer.provide(Base));
        const Terminal = TerminalServiceLayer.pipe(Layer.provide(Base));

        // API Factory depends on MountainClient + Config
        const API = APIFactoryLayer.pipe(
            Layer.provide(Base),
            Layer.provide(Config)
        );

        // Extension Host depends on API + Config
        const ExtHost = ExtensionHostLayer.pipe(
             Layer.provide(Base),
             Layer.provide(Config),
             Layer.provide(API)
        );

        // Module Interceptor
        const ModuleInt = ModuleInterceptorLayer.pipe(Layer.provide(Base));

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
