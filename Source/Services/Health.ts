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

import { Effect, Layer } from "effect";

/**
 * Health status enumeration
 */
export enum HealthStatus {
	HEALTHY = "healthy",
	DEGRADED = "degraded",
	UNHEALTHY = "unhealthy",
	UNKNOWN = "unknown",
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
	type:
		| "service_healthy"
		| "service_degraded"
		| "service_unhealthy"
		| "service_lost"
		| "recovery_attempted"
		| "recovery_successful";
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
export class HealthService implements IHealthService {
	readonly _serviceBrand: undefined;

	private config: HealthConfig;
	private monitoredServices: Map<string, ServiceHealth> = new Map();
	private eventListeners: Set<(event: HealthEvent) => void> = new Set();
	private heartbeatIntervalId: NodeJS.Timeout | null = null;
	private healthCheckIntervalId: NodeJS.Timeout | null = null;
	private errorCounts: Map<string, number> = new Map();
	private recoveryAttempts: Map<string, number> = new Map();

	constructor(config: Partial<HealthConfig> = {}) {
		this._serviceBrand = undefined;

		this.config = {
			heartbeatInterval: 5000,
			healthCheckInterval: 10000,
			timeoutThreshold: 30000,
			errorThreshold: 5,
			enableAutoRecovery: true,
			maxRetryAttempts: 3,
			...config,
		};

		console.log("[HealthService] Initializing health monitoring service");
	}

	/**
	 * Initialize health service
	 */
	async initialize(): Promise<void> {
		try {
			// Initialize core services
			await this.initializeCoreServices();

			// Start heartbeat monitoring
			this.startHeartbeatMonitoring();

			// Start health checks
			this.startHealthChecks();

			console.log(
				"[HealthService] Health monitoring service initialized",
			);
		} catch (error) {
			console.error("[HealthService] Failed to initialize:", error);
			this.emitEvent({
				type: "service_unhealthy",
				timestamp: Date.now(),
				service: "HealthService",
				error: `Initialization failed: ${error}`,
			});
		}
	}

	/**
	 * Initialize core services for monitoring
	 */
	private async initializeCoreServices(): Promise<void> {
		const coreServices = [
			{
				name: "MountainClientService",
				dependencies: [],
				initialStatus: HealthStatus.HEALTHY,
			},
			{
				name: "ExtensionHostService",
				dependencies: ["MountainClientService"],
				initialStatus: HealthStatus.HEALTHY,
			},
			{
				name: "ConfigurationService",
				dependencies: [],
				initialStatus: HealthStatus.HEALTHY,
			},
			{
				name: "GRPCServerService",
				dependencies: ["MountainClientService"],
				initialStatus: HealthStatus.HEALTHY,
			},
		];

		for (const service of coreServices) {
			const serviceHealth: ServiceHealth = {
				name: service.name,
				status: service.initialStatus,
				lastHeartbeat: Date.now(),
				uptime: 0,
				metrics: {
					responseTime: 0,
					errorRate: 0,
					throughput: 0,
					memoryUsage: 0,
					cpuUsage: 0,
					lastUpdated: Date.now(),
				},
				dependencies: service.dependencies,
				errorCount: 0,
				recoveryAttempts: 0,
			};

			this.monitoredServices.set(service.name, serviceHealth);
			this.errorCounts.set(service.name, 0);
			this.recoveryAttempts.set(service.name, 0);

			console.log(
				`[HealthService] Initialized monitoring for service: ${service.name}`,
			);
		}

		console.log(
			`[HealthService] Initialized ${this.monitoredServices.size} core services`,
		);
	}

	/**
	 * Start heartbeat monitoring
	 */
	private startHeartbeatMonitoring(): void {
		this.heartbeatIntervalId = setInterval(async () => {
			await this.checkServiceHeartbeats();
		}, this.config.heartbeatInterval);

		console.log("[HealthService] Heartbeat monitoring started");
	}

	/**
	 * Check service heartbeats
	 */
	private async checkServiceHeartbeats(): Promise<void> {
		const now = Date.now();

		for (const [
			serviceName,
			serviceHealth,
		] of this.monitoredServices.entries()) {
			const timeSinceHeartbeat = now - serviceHealth.lastHeartbeat;

			if (timeSinceHeartbeat > this.config.timeoutThreshold) {
				console.warn(
					`[HealthService] Service ${serviceName} heartbeat timeout`,
				);

				// Mark service as unhealthy
				serviceHealth.status = HealthStatus.UNHEALTHY;

				this.emitEvent({
					type: "service_lost",
					timestamp: now,
					service: serviceName,
					error: `Heartbeat timeout: ${timeSinceHeartbeat}ms`,
				});

				// Attempt recovery if enabled
				if (this.config.enableAutoRecovery) {
					await this.attemptServiceRecovery(serviceName);
				}
			}
		}
	}

	/**
	 * Start health checks
	 */
	private startHealthChecks(): void {
		this.healthCheckIntervalId = setInterval(async () => {
			await this.performHealthChecks();
		}, this.config.healthCheckInterval);

		console.log("[HealthService] Health checks started");
	}

	/**
	 * Perform comprehensive health checks
	 */
	private async performHealthChecks(): Promise<void> {
		console.log("[HealthService] Performing health checks");

		for (const [
			serviceName,
			serviceHealth,
		] of this.monitoredServices.entries()) {
			try {
				await this.checkServiceHealth(serviceName, serviceHealth);
			} catch (error) {
				console.error(
					`[HealthService] Health check failed for ${serviceName}:`,
					error,
				);

				// Increment error count
				const errorCount = (this.errorCounts.get(serviceName) || 0) + 1;
				this.errorCounts.set(serviceName, errorCount);

				// Update service status based on error threshold
				if (errorCount >= this.config.errorThreshold) {
					serviceHealth.status = HealthStatus.UNHEALTHY;

					this.emitEvent({
						type: "service_unhealthy",
						timestamp: Date.now(),
						service: serviceName,
						error: `Health check failed: ${error}`,
					});
				}
			}
		}
	}

	/**
	 * Check individual service health
	 */
	private async checkServiceHealth(
		serviceName: string,
		serviceHealth: ServiceHealth,
	): Promise<void> {
		try {
			// Simulate health check - in real implementation, this would check actual service status
			const isHealthy = await this.performServiceHealthCheck(serviceName);

			// Update service information
			serviceHealth.status = isHealthy
				? HealthStatus.HEALTHY
				: HealthStatus.UNHEALTHY;
			serviceHealth.lastHeartbeat = Date.now();
			serviceHealth.uptime = isHealthy
				? serviceHealth.uptime + 1
				: serviceHealth.uptime;

			// Update metrics
			serviceHealth.metrics = {
				...serviceHealth.metrics,
				responseTime: this.calculateResponseTime(serviceName),
				errorRate: this.calculateErrorRate(serviceName),
				throughput: this.calculateThroughput(serviceName),
				memoryUsage: this.getMemoryUsage(serviceName),
				cpuUsage: this.getCpuUsage(serviceName),
				lastUpdated: Date.now(),
			};

			// Reset error count on successful health check
			if (isHealthy) {
				this.errorCounts.set(serviceName, 0);
			}

			// Emit health status event
			if (serviceHealth.status === HealthStatus.HEALTHY) {
				this.emitEvent({
					type: "service_healthy",
					timestamp: Date.now(),
					service: serviceName,
					data: serviceHealth,
				});
			}

			console.log(
				`[HealthService] Service ${serviceName} health check: ${serviceHealth.status}`,
			);
		} catch (error) {
			console.error(
				`[HealthService] Failed to check health for ${serviceName}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Perform service-specific health check
	 */
	private async performServiceHealthCheck(
		serviceName: string,
	): Promise<boolean> {
		// Mock implementation - would perform actual service health checks
		switch (serviceName) {
			case "MountainClientService":
				// Check Mountain client connection
				return await this.checkMountainClientHealth();
			case "ExtensionHostService":
				// Check extension host status
				return await this.checkExtensionHostHealth();
			case "ConfigurationService":
				// Check configuration service status
				return await this.checkConfigurationServiceHealth();
			case "GRPCServerService":
				// Check gRPC server status
				return await this.checkGRPCServerHealth();
			default:
				return true; // Default to healthy for unknown services
		}
	}

	/**
	 * Check Mountain client health
	 */
	private async checkMountainClientHealth(): Promise<boolean> {
		// Mock implementation - would check actual Mountain client status
		return Math.random() > 0.1; // 90% success rate
	}

	/**
	 * Check extension host health
	 */
	private async checkExtensionHostHealth(): Promise<boolean> {
		// Mock implementation - would check actual extension host status
		return Math.random() > 0.15; // 85% success rate
	}

	/**
	 * Check configuration service health
	 */
	private async checkConfigurationServiceHealth(): Promise<boolean> {
		// Mock implementation - would check actual configuration service status
		return Math.random() > 0.02; // 98% success rate
	}

	/**
	 * Check gRPC server health
	 */
	private async checkGRPCServerHealth(): Promise<boolean> {
		// Mock implementation - would check actual gRPC server status
		return Math.random() > 0.08; // 92% success rate
	}

	/**
	 * Calculate response time for service
	 */
	private calculateResponseTime(serviceName: string): number {
		// Mock implementation - would use real metrics
		const baseTimes: Record<string, number> = {
			"MountainClientService": 50,
			"ExtensionHostService": 100,
			"ConfigurationService": 5,
			"GRPCServerService": 20,
		};

		return baseTimes[serviceName] || 30;
	}

	/**
	 * Calculate error rate for service
	 */
	private calculateErrorRate(serviceName: string): number {
		// Mock implementation - would use real metrics
		const baseRates: Record<string, number> = {
			"MountainClientService": 2.5,
			"ExtensionHostService": 5.0,
			"ConfigurationService": 0.1,
			"GRPCServerService": 1.5,
		};

		return baseRates[serviceName] || 3.0;
	}

	/**
	 * Calculate throughput for service
	 */
	private calculateThroughput(serviceName: string): number {
		// Mock implementation - would use real metrics
		const baseThroughput: Record<string, number> = {
			"MountainClientService": 500,
			"ExtensionHostService": 300,
			"ConfigurationService": 5000,
			"GRPCServerService": 1000,
		};

		return baseThroughput[serviceName] || 100;
	}

	/**
	 * Get memory usage for service
	 */
	private getMemoryUsage(serviceName: string): number {
		// Mock implementation - would use real metrics
		const baseMemory: Record<string, number> = {
			"MountainClientService": 256,
			"ExtensionHostService": 512,
			"ConfigurationService": 64,
			"GRPCServerService": 192,
		};

		return baseMemory[serviceName] || 100;
	}

	/**
	 * Get CPU usage for service
	 */
	private getCpuUsage(serviceName: string): number {
		// Mock implementation - would use real metrics
		const baseCpu: Record<string, number> = {
			"MountainClientService": 15,
			"ExtensionHostService": 25,
			"ConfigurationService": 2,
			"GRPCServerService": 10,
		};

		return baseCpu[serviceName] || 20;
	}

	/**
	 * Attempt service recovery
	 */
	private async attemptServiceRecovery(serviceName: string): Promise<void> {
		const currentAttempts = this.recoveryAttempts.get(serviceName) || 0;

		if (currentAttempts >= this.config.maxRetryAttempts) {
			console.warn(
				`[HealthService] Max recovery attempts reached for ${serviceName}`,
			);
			return;
		}

		console.log(
			`[HealthService] Attempting recovery for ${serviceName} (attempt ${currentAttempts + 1})`,
		);

		this.recoveryAttempts.set(serviceName, currentAttempts + 1);

		this.emitEvent({
			type: "recovery_attempted",
			timestamp: Date.now(),
			service: serviceName,
			data: { attempt: currentAttempts + 1 },
		});

		try {
			// Simulate recovery attempt
			await this.performServiceRecovery(serviceName);

			// Wait for service to come back online
			await this.waitForServiceRecovery(serviceName);

			// Reset recovery attempts on success
			this.recoveryAttempts.set(serviceName, 0);

			this.emitEvent({
				type: "recovery_successful",
				timestamp: Date.now(),
				service: serviceName,
				data: { attempt: currentAttempts + 1 },
			});

			console.log(
				`[HealthService] Recovery successful for ${serviceName}`,
			);
		} catch (error) {
			console.error(
				`[HealthService] Recovery failed for ${serviceName}:`,
				error,
			);

			this.emitEvent({
				type: "service_unhealthy",
				timestamp: Date.now(),
				service: serviceName,
				error: `Recovery failed: ${error}`,
			});
		}
	}

	/**
	 * Perform service-specific recovery
	 */
	private async performServiceRecovery(serviceName: string): Promise<void> {
		// Mock implementation - would perform actual service recovery
		console.log(`[HealthService] Performing recovery for ${serviceName}`);

		// Simulate recovery time
		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log(`[HealthService] Recovery completed for ${serviceName}`);
	}

	/**
	 * Wait for service recovery
	 */
	private async waitForServiceRecovery(serviceName: string): Promise<void> {
		const maxWaitTime = 30000; // 30 seconds
		const checkInterval = 1000; // 1 second
		const startTime = Date.now();

		while (Date.now() - startTime < maxWaitTime) {
			try {
				const isHealthy =
					await this.performServiceHealthCheck(serviceName);

				if (isHealthy) {
					console.log(
						`[HealthService] Service ${serviceName} recovered`,
					);
					return;
				}

				await new Promise((resolve) =>
					setTimeout(resolve, checkInterval),
				);
			} catch (error) {
				// Service not available yet, continue waiting
				await new Promise((resolve) =>
					setTimeout(resolve, checkInterval),
				);
			}
		}

		throw new Error(
			`Service ${serviceName} did not recover within ${maxWaitTime}ms`,
		);
	}

	/**
	 * Emit health event
	 */
	private emitEvent(event: HealthEvent): void {
		this.eventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				console.error(
					"[HealthService] Error in event listener:",
					error,
				);
			}
		});
	}

	/**
	 * Get service health
	 */
	async getServiceHealth(
		serviceName: string,
	): Promise<ServiceHealth | undefined> {
		return this.monitoredServices.get(serviceName);
	}

	/**
	 * Get overall system health
	 */
	async getSystemHealth(): Promise<{
		overallStatus: HealthStatus;
		healthyServices: number;
		totalServices: number;
		degradedServices: number;
		unhealthyServices: number;
	}> {
		const services = Array.from(this.monitoredServices.values());
		const healthyServices = services.filter(
			(s) => s.status === HealthStatus.HEALTHY,
		).length;
		const degradedServices = services.filter(
			(s) => s.status === HealthStatus.DEGRADED,
		).length;
		const unhealthyServices = services.filter(
			(s) => s.status === HealthStatus.UNHEALTHY,
		).length;

		let overallStatus = HealthStatus.HEALTHY;
		if (unhealthyServices > 0) {
			overallStatus = HealthStatus.UNHEALTHY;
		} else if (degradedServices > 0) {
			overallStatus = HealthStatus.DEGRADED;
		}

		return {
			overallStatus,
			healthyServices,
			totalServices: services.length,
			degradedServices,
			unhealthyServices,
		};
	}

	/**
	 * Trigger manual health check
	 */
	async triggerHealthCheck(): Promise<void> {
		await this.performHealthChecks();
	}

	/**
	 * Add event listener
	 */
	onHealthEvent(listener: (event: HealthEvent) => void): void {
		this.eventListeners.add(listener);
	}

	/**
	 * Remove event listener
	 */
	offHealthEvent(listener: (event: HealthEvent) => void): void {
		this.eventListeners.delete(listener);
	}

	/**
	 * Dispose health service
	 */
	dispose(): void {
		if (this.heartbeatIntervalId) {
			clearInterval(this.heartbeatIntervalId);
			this.heartbeatIntervalId = null;
		}

		if (this.healthCheckIntervalId) {
			clearInterval(this.healthCheckIntervalId);
			this.healthCheckIntervalId = null;
		}

		this.eventListeners.clear();
		this.monitoredServices.clear();
		this.errorCounts.clear();
		this.recoveryAttempts.clear();

		console.log("[HealthService] Health monitoring service disposed");
	}
}

/**
 * Service layer for HealthService
 */
export const HealthServiceLayer = Layer.succeed(
	IHealthService,
	new HealthService(),
);
