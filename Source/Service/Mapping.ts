/**
 * @module ServiceMapping
 * @description Dependency injection container and service composition for Cocoon's Effect-TS layer stack.
 */

import { Layer } from "effect";

// ============================================================================
// EFFECT-TS SERVICE LAYERS
// ============================================================================

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

/**
 * Effect-TS Services
 * Dependency injection for the Effect-TS service-based architecture.
 */
export const EffectServices = {
	/**
	 * Compose the main application layer.
	 *
	 * Layer deps: Telemetry → Health, MountainClient, ModuleInterceptor, Extension, RPCServer → Bootstrap
	 */
	composeAppLayer: () => {
		// Telemetry (no dependencies)
		const Telemetry = TelemetryLive;

		// Layer 1: Services depending only on Telemetry
		const Layer1 = Layer.mergeAll(
			HealthLive.pipe(Layer.provide(Telemetry)),
			MountainClientLive.pipe(Layer.provide(Telemetry)),
			ModuleInterceptorLive.pipe(Layer.provide(Telemetry)),
			ExtensionLive.pipe(Layer.provide(Telemetry)),
			RPCServerLive.pipe(Layer.provide(Telemetry)),
		);

		// Layer 2: Bootstrap depends on Layer1 + Telemetry
		const Bootstrap = BootstrapLive.pipe(
			Layer.provide(Telemetry),
			Layer.provide(Layer1),
		);

		// Merge all layers
		return Layer.mergeAll(Telemetry, Layer1, Bootstrap);
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
