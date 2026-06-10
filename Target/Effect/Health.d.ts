/**
 * @module Effect/Health
 * @description
 * Health monitoring service for Cocoon Extension Host.
 * Replaces Bootstrap Stage6 - HealthCheck with plain async monitoring.
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
export interface ServiceHealth {
    readonly serviceName: string;
    readonly status: HealthStatus;
    readonly message: string;
    readonly lastChecked: number;
    readonly responseTime: number;
    readonly details: Readonly<Record<string, unknown>> | undefined;
}
export interface SystemHealth {
    readonly overallStatus: HealthStatus;
    readonly services: ReadonlyArray<ServiceHealth>;
    readonly systemInfo: {
        readonly platform: string;
        readonly architecture: string;
        readonly nodeVersion: string;
        readonly upSince: number;
    };
    readonly lastChecked: number;
}
export interface HealthService {
    readonly checkService: (serviceName: string) => Promise<ServiceHealth>;
    readonly checkAllServices: () => Promise<SystemHealth>;
    readonly getOverallStatus: () => Promise<HealthStatus>;
    readonly monitorService: (serviceName: string, intervalMs: number) => Promise<void>;
}
export declare const HealthTag: {
    readonly _tag: "Cocoon/Health";
};
export declare const getHealth: () => HealthService;
export declare const makeMockHealth: (overrides?: Partial<Record<string, HealthStatus>>) => HealthService;
export declare const HealthLive: HealthService;
export declare const HealthMock: HealthService;
//# sourceMappingURL=Health.d.ts.map