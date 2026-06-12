/**
 * @module ServiceMapping
 * @description Lean singleton registry for Cocoon's service instances.
 */

import {
	BootstrapLive,
	ExtensionLive,
	HealthLive,
	ModuleInterceptorLive,
	MountainClientLive,
	RPCServerLive,
	TelemetryLive,
} from "../Effect/index.js";

// ============================================================================

export type AppServices =
	typeof EffectServices.composeAppLayer extends () => infer R ? R : never;

/**
 * Effect-TS Services
 * Plain-object singletons - no Layer/pipe/provide machinery.
 */
export const EffectServices = {
	/**
	 * Return all service singletons as a plain record.
	 * Each value is already initialised; callers receive live instances directly.
	 */
	composeAppLayer: () => ({
		telemetry: TelemetryLive,
		health: HealthLive,
		mountainClient: MountainClientLive,
		moduleInterceptor: ModuleInterceptorLive,
		extension: ExtensionLive,
		rpcServer: RPCServerLive,
		bootstrap: BootstrapLive,
	}),

	getTelemetry: () => TelemetryLive,

	getHealth: () => HealthLive,

	getMountainClient: () => MountainClientLive,

	getModuleInterceptor: () => ModuleInterceptorLive,

	getExtension: () => ExtensionLive,

	getRPCServer: () => RPCServerLive,

	getBootstrap: () => BootstrapLive,
};
