/**
 * @module ServiceMapping
 * @description
 * Defines the dependency injection container and service composition.
 * Orchestrates the initialization of all Core, Infrastructure, and UI services.
 * Provides both old-style service layers and new Effect-TS service layers.
 */

import { Layer } from "effect";

// ============================================================================
// OLD-STYLE SERVICE INTERFACES
// ============================================================================

import { IConfigurationService } from "./Interfaces/IConfigurationService.js";
import { IExtensionHostService } from "./Interfaces/IExtensionHostService.js";
import { IIPCService } from "./Interfaces/IIPCService.js";
import { IModuleInterceptorService } from "./Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "./Interfaces/IMountainClientService.js";
import { ITerminalService } from "./Interfaces/ITerminalService.js";
import { ISecurityService } from "./Interfaces/ISecurityService.js";
import { IPerformanceMonitoringService } from "./Interfaces/IPerformanceMonitoringService.js";
import { IErrorHandlingService } from "./Interfaces/IErrorHandlingService.js";
import { IAPIFactoryService } from "./Services/APIFactoryService.js";

// ============================================================================
// OLD-STYLE SERVICE LAYERS
// ============================================================================

import { ConfigurationLayer } from "./Services/Configuration.js";
import { ExtensionHostLayer } from "./Services/ExtensionHostService.js";
import { IPCServiceLayer } from "./Services/IPCService.js";
import { ModuleInterceptorServiceLayer } from "./Services/ModuleInterceptorService.js";
import { MountainClientServiceLayer } from "./Services/MountainClientService.js";
import { MountainGRPCClientLayer } from "./Services/MountainGRPCClient.js";
import { APIFactoryLayer } from "./Services/APIFactoryService.js";
import { TerminalServiceLayer } from "./Services/TerminalService.js";
import { SecurityServiceLive } from "./Services/SecurityService.js";
import { PerformanceMonitoringServiceLive } from "./Services/PerformanceMonitoringService.js";
import { ErrorHandlingServiceLive } from "./Services/ErrorHandlingService.js";

// ============================================================================
// EFFECT-TS SERVICE LAYERS
// ============================================================================

import {
	TelemetryLive,
	HealthLive,
	MountainClientLive,
	ModuleInterceptorLive,
	ExtensionLive,
	RPCServerLive,
	BootstrapLive,
} from "./Effect/index.js";

// ============================================================================
// SERVICE MAPPING - OLD STYLE SERVICES
// ============================================================================

/**
 * Old Style Services
 *
 * Provides dependency injection for traditional service-based architecture.
 * Legacy services that use Promise-based async patterns.
 */
export const OldStyleServices = {
	/**
	 * Validate dependencies for old-style services
	 */
	validateDependencies: () =>
		Layer.mergeAll(
			MountainClientServiceLayer,
			IPCServiceLayer,
			ConfigurationLayer,
			ModuleInterceptorServiceLayer,
			ExtensionHostLayer,
			APIFactoryLayer,
			TerminalServiceLayer,
			SecurityServiceLive,
			PerformanceMonitoringServiceLive,
			ErrorHandlingServiceLive,
		),

	/**
	 * Compose application layer for old-style services
	 */
	composeAppLayer: () => {
		// Base Infrastructure
		const Base = Layer.mergeAll(
			MountainClientServiceLayer,
			MountainGRPCClientLayer,
			IPCServiceLayer,
			SecurityServiceLive,
			PerformanceMonitoringServiceLive,
			ErrorHandlingServiceLive
		);

		// Core Capabilities (Depend on Base)
		const Config = ConfigurationLayer.pipe(Layer.provide(Base));
		const Terminal = TerminalServiceLayer.pipe(Layer.provide(Base));
		const ModuleInt = ModuleInterceptorServiceLayer.pipe(Layer.provide(Base));

		// API Factory (Depends on Config, Terminal, ModuleInt)
		const API = APIFactoryLayer.pipe(
			Layer.provide(Base),
			Layer.provide(Config),
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
			Terminal,
			API,
			ExtHost,
			ModuleInt
		);
	},
};

// ============================================================================
// SERVICE MAPPING - EFFECT-TS SERVICES
// ============================================================================

/**
 * Effect-TS Services
 *
 * Provides dependency injection for Effect-TS service-based architecture.
 * Modern services that use Effect-based async patterns with proper composable effects.
 */
export const EffectServices = {
	/**
	 * Compose the main Effect-TS application layer
	 * 
	 * Layer dependencies:
	 * - Telemetry (base, no dependencies)
	 * - Health (depends on Telemetry)
	 * - MountainClient (depends on Telemetry)
	 * - ModuleInterceptor (depends on Telemetry)
	 * - Extension (depends on Telemetry)
	 * - RPCServer (depends on Telemetry)
	 * - Bootstrap (depends on all above)
	 */
	composeAppLayer: () => {
		// Base layer: Telemetry (no dependencies)
		const Telemetry = TelemetryLive;

		// Layer 1: Services that depend only on Telemetry
		const Health = HealthLive.pipe(Layer.provide(Telemetry));
		const MountainClient = MountainClientLive.pipe(Layer.provide(Telemetry));
		const ModuleInterceptor = ModuleInterceptorLive.pipe(Layer.provide(Telemetry));
		const Extension = ExtensionLive.pipe(Layer.provide(Telemetry));
		const RPCServer = RPCServerLive.pipe(Layer.provide(Telemetry));

		// Layer 2: Bootstrap depends on all services
		const Bootstrap = BootstrapLive.pipe(
			Layer.provide(Telemetry),
			Layer.provide(Health),
			Layer.provide(MountainClient),
			Layer.provide(ModuleInterceptor),
			Layer.provide(Extension),
			Layer.provide(RPCServer)
		);

		// Merge all layers into a single application layer
		return Layer.mergeAll(
			Telemetry,
			Health,
			MountainClient,
			ModuleInterceptor,
			Extension,
			RPCServer,
			Bootstrap
		);
	},

	/**
	 * Get individual service layers for fine-grained composition
	 */
	getTelemetry: () => TelemetryLive,
	getHealth: () => HealthLive,
	getMountainClient: () => MountainClientLive,
	getModuleInterceptor: () => ModuleInterceptorLive,
	getExtension: () => ExtensionLive,
	getRPCServer: () => RPCServerLive,
	getBootstrap: () => BootstrapLive,
};

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Backwards compatibility - keep old ServiceMapping class
 * @deprecated Use OldStyleServices or EffectServices instead
 */
export class ServiceMapping {
	/**
	 * Validate dependencies
	 */
	static validateDependencies = () =>
		OldStyleServices.validateDependencies();

	/**
	 * Compose application layer
	 */
	static composeAppLayer = () => {
		return OldStyleServices.composeAppLayer();
	};
}
