/**
 * @module ServiceMapping
 * @description
 * Defines the dependency injection container and service composition.
 * Orchestrates the initialization of all Core, Infrastructure, and UI services.
 * Provides both old-style service layers and new Effect-TS service layers.
 */
import { Layer } from "effect";
/**
 * Old Style Services
 *
 * Provides dependency injection for traditional service-based architecture.
 * Legacy services that use Promise-based async patterns.
 */
export declare const OldStyleServices: {
    /**
     * Validate dependencies for old-style services
     */
    validateDependencies: () => Layer.Layer<unknown, unknown, unknown>;
    /**
     * Compose application layer for old-style services
     */
    composeAppLayer: () => Layer.Layer<unknown, unknown, unknown>;
};
/**
 * Effect-TS Services
 *
 * Provides dependency injection for Effect-TS service-based architecture.
 * Modern services that use Effect-based async patterns with proper composable effects.
 */
export declare const EffectServices: {
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
    composeAppLayer: () => Layer.Layer<import("../Effect/Telemetry.js").TelemetryTag | import("../Effect/Health.js").HealthTag | import("../Effect/index.js").MountainClientTag | import("../Effect/index.js").ModuleInterceptorTag | import("../Effect/Extension.js").ExtensionTag | import("../Effect/RPCServer.js").RPCServerTag | import("../Effect/Bootstrap.js").BootstrapTag, never, never>;
    /**
     * Get individual service layers for fine-grained composition
     */
    getTelemetry: () => Layer.Layer<import("../Effect/Telemetry.js").TelemetryTag, never, never>;
    getHealth: () => Layer.Layer<import("../Effect/Health.js").HealthTag, never, never>;
    getMountainClient: () => Layer.Layer<import("../Effect/index.js").MountainClientTag, never, import("../Effect/Telemetry.js").TelemetryTag>;
    getModuleInterceptor: () => Layer.Layer<import("../Effect/index.js").ModuleInterceptorTag, never, import("../Effect/Telemetry.js").TelemetryTag>;
    getExtension: () => Layer.Layer<import("../Effect/Extension.js").ExtensionTag, never, import("../Effect/Telemetry.js").TelemetryTag>;
    getRPCServer: () => Layer.Layer<import("../Effect/RPCServer.js").RPCServerTag, never, import("../Effect/Telemetry.js").TelemetryTag>;
    getBootstrap: () => Layer.Layer<import("../Effect/Bootstrap.js").BootstrapTag, never, never>;
};
/**
 * Backwards compatibility - keep old ServiceMapping class
 * @deprecated Use OldStyleServices or EffectServices instead
 */
export declare class ServiceMapping {
    /**
     * Validate dependencies
     */
    static validateDependencies: () => Layer.Layer<unknown, unknown, unknown>;
    /**
     * Compose application layer
     */
    static composeAppLayer: () => Layer.Layer<unknown, unknown, unknown>;
}
//# sourceMappingURL=Mapping.d.ts.map