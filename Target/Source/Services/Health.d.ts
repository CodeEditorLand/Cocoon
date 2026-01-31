/**
 * @module HealthService
 * @description
 * Cocoon's Health Service for monitoring Mountain services and Cocoon components
 * Provides health monitoring, service discovery, and recovery mechanisms
 *
 * Features:
 * - Mountain service health monitoring
 * - Cocoon component health tracking
 * - Performance metrics collection
 * - Error recovery mechanisms
 * - Health status reporting
 */
import { Layer } from "effect";
/**
 * Health status enumeration
 */
export declare enum HealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    UNKNOWN = "unknown"
}
/**
 * Service health information
 */
export interface ServiceHealth {
    name: string;
    status: HealthStatus;
    lastHeartbeat: number;
    uptime: number;
    metrics: HealthMetrics;
    dependencies: string[];
    errorCount: number;
    recoveryAttempts: number;
}
/**
 * Health metrics
 */
export interface HealthMetrics {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
    lastUpdated: number;
}
/**
 * Health configuration
 */
export interface HealthConfig {
    heartbeatInterval: number;
    healthCheckInterval: number;
    timeoutThreshold: number;
    errorThreshold: number;
    enableAutoRecovery: boolean;
    maxRetryAttempts: number;
}
/**
 * Health event
 */
export interface HealthEvent {
    type: 'service_healthy' | 'service_degraded' | 'service_unhealthy' | 'service_lost' | 'recovery_attempted' | 'recovery_successful';
    timestamp: number;
    service: string;
    data?: any;
    error?: string;
}
/**
 * Health service interface
 */
export interface IHealthService {
    readonly _serviceBrand: undefined;
    initialize(): Promise<void>;
    getServiceHealth(serviceName: string): Promise<ServiceHealth | undefined>;
    getSystemHealth(): Promise<{
        overallStatus: HealthStatus;
        healthyServices: number;
        totalServices: number;
        degradedServices: number;
        unhealthyServices: number;
    }>;
    triggerHealthCheck(): Promise<void>;
    onHealthEvent(listener: (event: HealthEvent) => void): void;
    offHealthEvent(listener: (event: HealthEvent) => void): void;
    dispose(): void;
}
/**
 * Health service implementation
 */
export declare class HealthService implements IHealthService {
    readonly _serviceBrand: undefined;
    private config;
    private monitoredServices;
    private eventListeners;
    private heartbeatIntervalId;
    private healthCheckIntervalId;
    private errorCounts;
    private recoveryAttempts;
    constructor(config?: Partial<HealthConfig>);
    /**
     * Initialize health service
     */
    initialize(): Promise<void>;
    /**
     * Initialize core services for monitoring
     */
    private initializeCoreServices;
    /**
     * Start heartbeat monitoring
     */
    private startHeartbeatMonitoring;
    /**
     * Check service heartbeats
     */
    private checkServiceHeartbeats;
    /**
     * Start health checks
     */
    private startHealthChecks;
    /**
     * Perform comprehensive health checks
     */
    private performHealthChecks;
    /**
     * Check individual service health
     */
    private checkServiceHealth;
    /**
     * Perform service-specific health check
     */
    private performServiceHealthCheck;
    /**
     * Check Mountain client health
     */
    private checkMountainClientHealth;
    /**
     * Check IPC service health
     */
    private checkIPCServiceHealth;
    /**
     * Check extension host health
     */
    private checkExtensionHostHealth;
    /**
     * Check configuration service health
     */
    private checkConfigurationServiceHealth;
    /**
     * Check gRPC server health
     */
    private checkGRPCServerHealth;
    /**
     * Calculate response time for service
     */
    private calculateResponseTime;
    /**
     * Calculate error rate for service
     */
    private calculateErrorRate;
    /**
     * Calculate throughput for service
     */
    private calculateThroughput;
    /**
     * Get memory usage for service
     */
    private getMemoryUsage;
    /**
     * Get CPU usage for service
     */
    private getCpuUsage;
    /**
     * Attempt service recovery
     */
    private attemptServiceRecovery;
    /**
     * Perform service-specific recovery
     */
    private performServiceRecovery;
    /**
     * Wait for service recovery
     */
    private waitForServiceRecovery;
    /**
     * Emit health event
     */
    private emitEvent;
    /**
     * Get service health
     */
    getServiceHealth(serviceName: string): Promise<ServiceHealth | undefined>;
    /**
     * Get overall system health
     */
    getSystemHealth(): Promise<{
        overallStatus: HealthStatus;
        healthyServices: number;
        totalServices: number;
        degradedServices: number;
        unhealthyServices: number;
    }>;
    /**
     * Trigger manual health check
     */
    triggerHealthCheck(): Promise<void>;
    /**
     * Add event listener
     */
    onHealthEvent(listener: (event: HealthEvent) => void): void;
    /**
     * Remove event listener
     */
    offHealthEvent(listener: (event: HealthEvent) => void): void;
    /**
     * Dispose health service
     */
    dispose(): void;
}
/**
 * Service layer for HealthService
 */
export declare const HealthServiceLayer: Layer.Layer<unknown, never, never>;
//# sourceMappingURL=Health.d.ts.map