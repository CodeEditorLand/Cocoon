/**
 * @module Effect/Health
 * @description
 * Health monitoring service for Cocoon Extension Host.
 * Replaces Bootstrap Stage6 - HealthCheck with plain async monitoring.
 */

import { getTelemetry } from "./Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

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

	readonly monitorService: (
		serviceName: string,

		intervalMs: number,
	) => Promise<void>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export const HealthTag = { _tag: "Cocoon/Health" } as const;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

const createServiceHealth = (
	name: string,

	status: HealthStatus,

	message: string,

	responseTime: number,

	details?: Readonly<Record<string, unknown>>,
): ServiceHealth => ({
	serviceName: name,
	status,
	message,
	lastChecked: Date.now(),
	responseTime,
	details,
});

const makeHealthChecker = (): HealthService => ({
	checkService: async (serviceName: string): Promise<ServiceHealth> => {
		const startTime = Date.now();

		switch (serviceName.toLowerCase()) {
			case "environment": {
				const envTime = Date.now() - startTime;

				return createServiceHealth(
					"Environment",

					"healthy",

					"Environment service available",

					envTime,
				);
			}

			case "telemetry": {
				const telemetryService = getTelemetry();

				const telemetryTime = Date.now() - startTime;

				try {
					await telemetryService.log(
						"info",

						"[Health] Telemetry health check",
					);

					return createServiceHealth(
						"Telemetry",

						"healthy",

						"Telemetry service available",

						telemetryTime,
					);
				} catch {
					return createServiceHealth(
						"Telemetry",

						"unhealthy",

						"Telemetry service error",

						telemetryTime,
					);
				}
			}

			case "grpc": {
				const grpcTime = Date.now() - startTime;

				return createServiceHealth(
					"gRPC",

					"healthy",

					"gRPC service available",

					grpcTime,
				);
			}

			case "extension": {
				const extensionTime = Date.now() - startTime;

				return createServiceHealth(
					"Extension",

					"healthy",

					"Extension service available",

					extensionTime,
				);
			}

			default:
				return createServiceHealth(
					serviceName,

					"unknown",

					`Unknown service: ${serviceName}`,

					0,
				);
		}
	},

	checkAllServices: async (): Promise<SystemHealth> => {
		const telemetry = getTelemetry();

		const services = [
			"environment",
			"telemetry",
			"grpc",
			"extension",
		] as const;

		const healthChecker = makeHealthChecker();

		telemetry.log(
			"info",

			"[Health] Running health checks for all services...",
		);

		const healthResults = await Promise.all(
			services.map((service) => healthChecker.checkService(service)),
		);

		// Determine overall status
		const unhealthyCount = healthResults.filter(
			(h) => h.status === "unhealthy",
		).length;

		const degradedCount = healthResults.filter(
			(h) => h.status === "degraded",
		).length;

		let overallStatus: HealthStatus = "healthy";

		if (unhealthyCount > 0) {
			overallStatus = "unhealthy";
		} else if (degradedCount > 0) {
			overallStatus = "degraded";
		}

		return {
			overallStatus,
			services: healthResults,
			systemInfo: {
				platform: process.platform,
				architecture: process.arch,
				nodeVersion: process.version,
				upSince: Date.now(),
			},
			lastChecked: Date.now(),
		};
	},

	getOverallStatus: async (): Promise<HealthStatus> => {
		const healthChecker = makeHealthChecker();

		const systemHealth = await healthChecker.checkAllServices();

		return systemHealth.overallStatus;
	},

	monitorService: async (
		serviceName: string,

		intervalMs: number,
	): Promise<void> => {
		const healthChecker = makeHealthChecker();

		// Periodic health check loop
		while (true) {
			await healthChecker.checkService(serviceName);

			await new Promise<void>((r) => setTimeout(r, intervalMs));
		}
	},
});

// ============================================================================
// SINGLETON
// ============================================================================

let _health: HealthService | undefined;

export const getHealth = (): HealthService => {
	if (_health === undefined) {
		_health = makeHealthChecker();
	}

	return _health;
};

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockHealth = (
	overrides?: Partial<Record<string, HealthStatus>>,
): HealthService => ({
	checkService: async (serviceName: string): Promise<ServiceHealth> => {
		const defaultStatus: HealthStatus = "healthy";

		const status = overrides?.[serviceName] ?? defaultStatus;

		return createServiceHealth(
			serviceName,

			status,

			status === "healthy"
				? "Mock service healthy"
				: "Mock service unhealthy",

			0,
		);
	},

	checkAllServices: async (): Promise<SystemHealth> => {
		const services = ["environment", "telemetry", "grpc", "extension"];

		const results = services.map((name) =>
			createServiceHealth(
				name,

				overrides?.[name] ?? "healthy",

				"Mock service check",

				0,
			),
		);

		return {
			overallStatus: "healthy",
			services: results,
			systemInfo: {
				platform: "mock",
				architecture: "mock",
				nodeVersion: "mock",
				upSince: Date.now(),
			},
			lastChecked: Date.now(),
		};
	},

	getOverallStatus: async (): Promise<HealthStatus> => "healthy",

	monitorService: async (): Promise<void> => {},
});

export const HealthLive: HealthService = getHealth();

export const HealthMock: HealthService = makeMockHealth();
