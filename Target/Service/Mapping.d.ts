/**
 * @module ServiceMapping
 * @description Lean singleton registry for Cocoon's service instances.
 */
export type AppServices = typeof EffectServices.composeAppLayer extends () => infer R ? R : never;
/**
 * Effect-TS Services
 * Plain-object singletons - no Layer/pipe/provide machinery.
 */
export declare const EffectServices: {
    /**
     * Return all service singletons as a plain record.
     * Each value is already initialised; callers receive live instances directly.
     */
    composeAppLayer: () => {
        telemetry: import("../Effect/Telemetry.js").TelemetryService;
        health: import("../Effect/Health.js").HealthService;
        mountainClient: typeof import("../Effect/Mountain/Client.js").getMountainClient;
        moduleInterceptor: Promise<import("../Effect/Module/Interceptor.js").ModuleInterceptorService>;
        extension: {
            readonly _tag: "Cocoon/Extension/Live";
            readonly build: typeof import("../Effect/Extension.js").getExtension;
        };
        rpcServer: import("../Effect/RPCServer.js").RPCServerService;
        bootstrap: import("../Effect/Bootstrap.js").BootstrapService;
    };
    getTelemetry: () => import("../Effect/Telemetry.js").TelemetryService;
    getHealth: () => import("../Effect/Health.js").HealthService;
    getMountainClient: () => typeof import("../Effect/Mountain/Client.js").getMountainClient;
    getModuleInterceptor: () => Promise<import("../Effect/Module/Interceptor.js").ModuleInterceptorService>;
    getExtension: () => {
        readonly _tag: "Cocoon/Extension/Live";
        readonly build: typeof import("../Effect/Extension.js").getExtension;
    };
    getRPCServer: () => import("../Effect/RPCServer.js").RPCServerService;
    getBootstrap: () => import("../Effect/Bootstrap.js").BootstrapService;
};
//# sourceMappingURL=Mapping.d.ts.map