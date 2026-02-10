/**
 * @module OldStyleServices
 * @description
 * Provides dependency injection for traditional Promise-based service architecture.
 * Legacy services that use async/await patterns instead of Effect-TS.
 *
 * @see {@link Element/Cocoon/Source/Services/} Legacy service implementations
 * @see {@link Element/Cocoon/Source/Orchestration/EffectServices.ts} Modern Effect-TS services
 *
 * @deprecated Prefer EffectServices for new implementations
 *
 * @author Cocoon Team
 * @since 1.0.0
 */

import { Layer } from "effect";

// ============================================================================
// OLD-STYLE SERVICE INTERFACES
// ============================================================================

import { IConfigurationService } from "../Interfaces/IConfigurationService.js";
import { IExtensionHostService } from "../Interfaces/IExtensionHostService.js";
import { IIPCService } from "../Interfaces/IIPCService.js";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";
import { ITerminalService } from "../Interfaces/ITerminalService.js";
import { ISecurityService } from "../Interfaces/ISecurityService.js";
import { IPerformanceMonitoringService } from "../Interfaces/IPerformanceMonitoringService.js";
import { IErrorHandlingService } from "../Interfaces/IErrorHandlingService.js";
import { IAPIFactoryService } from "../Services/APIFactoryService.js";

// ============================================================================
// OLD-STYLE SERVICE LAYERS
// ============================================================================

import { ConfigurationLayer } from "../Services/Configuration.js";
import { ExtensionHostLayer } from "../Services/ExtensionHostService.js";
import { IPCServiceLayer } from "../Services/IPCService.js";
import { ModuleInterceptorServiceLayer } from "../Services/ModuleInterceptorService.js";
import { MountainClientServiceLayer } from "../Services/MountainClientService.js";
import { MountainGRPCClientLayer } from "../Services/MountainGRPCClient.js";
import { APIFactoryLayer } from "../Services/APIFactoryService.js";
import { TerminalServiceLayer } from "../Services/TerminalService.js";
import { SecurityServiceLive } from "../Services/SecurityService.js";
import { PerformanceMonitoringServiceLive } from "../Services/PerformanceMonitoringService.js";
import { ErrorHandlingServiceLive } from "../Services/ErrorHandlingService.js";

// ============================================================================
// OLD STYLE SERVICES
// ============================================================================

/**
 * Old Style Services
 *
 * Provides dependency injection for traditional service-based architecture.
 * Legacy services that use Promise-based async patterns.
 */
export default class OldStyleServices {
	/**
	 * Validate dependencies for old-style services
	 *
	 * @returns A composed Layer with all service dependencies
	 */
	validateDependencies() {
		return Layer.mergeAll(
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
		);
	}

	/**
	 * Compose application layer for old-style services
	 *
	 * Builds the dependency graph with proper layering:
	 * - Base Infrastructure (no dependencies)
	 * - Core Capabilities (depend on Base)