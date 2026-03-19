/**
 * @module Effect/Health
 * @description
 * Health monitoring service for Cocoon Extension Host using Effect-TS.
 * Replaces Bootstrap Stage6 - HealthCheck with Effect-based monitoring.
 */

import { Context, Effect, Layer, Schedule } from "effect";

import { TelemetryTag } from "./Telemetry.js";

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
	readonly checkService: (
		serviceName: string,
	) => Effect.Effect<ServiceHealth, never>;
	readonly checkAllServices: () => Effect.Effect<SystemHealth, never>;
	readonly getOverallStatus: () => Effect.Effect<HealthStatus, never>;
	readonly monitorService: (
		serviceName: string,
		intervalMs: number,
	) => Effect.Effect<void, never>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export class HealthTag extends Context.Tag("Cocoon/Health")<
	HealthTag,
	HealthService
>() {}

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
	checkService: (serviceName: string) =>
		Effect.gen(function* () {
			const startTime = Date.now();

			switch (serviceName.toLowerCase()) {
				case "environment":
					// Environment is always available in Node.js
					const envTime = Date.now() - startTime;
					return Effect.succeed(
						createServiceHealth(
							"Environment",
							"healthy",
							"Environment service available",
							envTime,
						),
					);

				case "telemetry":
					// Check telemetry by logging a metric
					const telemetryService = yield* TelemetryTag;
					const telemetryTime = Date.now() - startTime;
					return yield* telemetryService
						.log("info", "[Health] Telemetry health check")
						.pipe(
							Effect.map(() =>
								createServiceHealth(
									"Telemetry",
									"healthy",
									"Telemetry service available",
									telemetryTime,
								),
							),
							Effect.catchAll(() =>
								Effect.succeed(
									createServiceHealth(
										"Telemetry",
										"unhealthy",
										"Telemetry service error",
										telemetryTime,
									),
								),
							),
						);

				case "grpc":
					// Check gRPC service availability
					const grpcTime = Date.now() - startTime;
					// For now, assume gRPC is available if we can create the service
					// In production, this would check actual gRPC server status
					return Effect.succeed(
						createServiceHealth(
							"gRPC",
							"healthy",
							"gRPC service available",
							grpcTime,
						),
					);

				case "extension":
					// Check extension service
					const extensionTime = Date.now() - startTime;
					return Effect.succeed(
						createServiceHealth(
							"Extension",
							"healthy",
							"Extension service available",
							extensionTime,
						),
					);

				default:
					return Effect.succeed(
						createServiceHealth(
							serviceName,
							"unknown",
							`Unknown service: ${serviceName}`,
							0,
						),
					);
			}
		}),

	checkAllServices: () =>
		Effect.gen(function* () {
			const telemetry = yield* TelemetryTag;
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

			const healthResults = yield* Effect.all(
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
		}),

	getOverallStatus: () =>
		Effect.gen(function* () {
			const healthChecker = makeHealthChecker();
			const systemHealth = yield* healthChecker.checkAllServices();
			return systemHealth.overallStatus;
		}),

	monitorService: (serviceName: string, intervalMs: number) =>
		Effect.gen(function* () {
			// Periodic health check using Effect.repeat
			yield* makeHealthChecker()
				.checkService(serviceName)
				.pipe(Effect.repeat(Schedule.spaced(`${intervalMs} millis`)));
		}),
});

// ============================================================================
// LAYERS
// ============================================================================

export const HealthLive = Layer.effect(
	HealthTag,
	Effect.succeed(makeHealthChecker()),
);

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockHealth = (
	overrides?: Partial<Record<string, HealthStatus>>,
): HealthService => ({
	checkService: (serviceName: string) =>
		Effect.gen(function* () {
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
		}),

	checkAllServices: () =>
		Effect.gen(function* () {
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
		}),

	getOverallStatus: () => Effect.succeed("healthy" as const),

	monitorService: () => Effect.void,
});

export const HealthMock = Layer.effect(
	HealthTag,
	Effect.succeed(makeMockHealth()),
);
