/**
 * @module ServiceMapping
 * @description Dependency injection container and service composition for Cocoon's Effect-TS layer stack.
 */
import { Layer } from "effect";
/**
 * Effect-TS Services
 * Dependency injection for the Effect-TS service-based architecture.
 */
export declare const EffectServices: {
    /**
     * Compose the main application layer.
     *
     * Layer deps: Telemetry → Health, MountainClient, ModuleInterceptor, Extension, RPCServer → Bootstrap
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
//# sourceMappingURL=Mapping.d.ts.map