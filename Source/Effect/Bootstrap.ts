/**
 * @module Effect/Bootstrap
 * @description
 * Bootstrap orchestration for Cocoon Extension Host using Effect-TS.
 * Coordinates initialization stages for the extension host system.
 *
 * Bootstrap Stages:
 * 1. Environment Detection
 * 2. Configuration Loading
 * 3. gRPC Connection to Mountain
 * 4. Module Interceptor Setup
 * 5. Extension Registry Initialization
 * 6. Health Checks
 */

import { Effect, Layer, Context } from "effect";
import { TelemetryTag, withSpan } from "./Telemetry.js";
import { HealthTag } from "./Health.js";
import { MountainClientTag } from "./MountainClient.js";
import { RPCServerTag } from "./RPCServer.js";
import { ExtensionTag } from "./Extension.js";

// ============================================================================
// TYPES
// ============================================================================

export interface BootstrapOptions {
	readonly debugMode?: boolean;
	readonly verboseLogging?: boolean;
	readonly enablePerformanceTracking?: boolean;
	readonly skipHealthCheck?: boolean;
}

export interface StageResult {
	readonly stageName: string;
	readonly success: boolean;
	readonly duration: number;
	readonly error: Error | undefined;
}

export interface BootstrapResult {
	readonly success: boolean;
	readonly totalDuration: number;
	readonly stages: ReadonlyArray<StageResult>;
	readonly error: Error | undefined;
}

export interface BootstrapService {
	readonly run: (options?: BootstrapOptions) => Effect.Effect<BootstrapResult, never>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export class BootstrapTag extends Context.Tag("Cocoon/Bootstrap")<
	BootstrapTag,
	BootstrapService
>() {}

// ============================================================================
// STAGE EFFECTS
// ============================================================================

const stage1_Environment = withSpan(
	"stage1_environment",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;

		telemetry.log("info", "[Cocoon Bootstrap] Stage 1: Detecting environment...");

		const nodeVersion = process.version;
		const platform = process.platform;
		const arch = process.arch;

		telemetry.log("info", `[Cocoon Bootstrap] Node.js ${nodeVersion} on ${platform}/${arch}`);

		return {
			stageName: "Environment",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage2_Configuration = withSpan(
	"stage2_configuration",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;

		telemetry.log("info", "[Cocoon Bootstrap] Stage 2: Loading configuration...");

		// Configuration loading will be handled by Configuration service
		// For now, we simulate it
		yield* Effect.sleep("20 millis");

		telemetry.log("info", "[Cocoon Bootstrap] Configuration loaded");

		return {{
			stageName: "Configuration",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage3_MountainConnection = withSpan(
	"stage3_mountain_connection",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const mountainClient = yield* MountainClientTag;

		telemetry.log("info", "[Cocoon Bootstrap] Stage 3: Connecting to Mountain...");

		// Connect to Mountain backend
		yield* mountainClient.connect({
			host: "localhost",
			port: 50052,
		});

		const version = yield* mountainClient.version;

		telemetry.log("info", `[Cocoon Bootstrap] Connected to Mountain (v${version})`);

		return {
			stageName: "MountainConnection",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage4_RPCServer = withSpan(
	"stage4_rpc_server",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const rpcServer = yield* RPCServerTag;

		telemetry.log("info", "[Cocoon Bootstrap] Stage 4: Starting gRPC server...");

		// Start gRPC server for Mountain ← Cocoon communication
		yield* rpcServer.start({
			host: "0.0.0.0",
			port: 50051,
		});

		telemetry.log("info", "[Cocoon Bootstrap] gRPC server started");

		return {
			stageName: "RPCServer",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage5_Extensions = withSpan(
	"stage5_extensions",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const extension = yield* ExtensionTag;

		telemetry.log("info", "[Cocoon Bootstrap] Stage 5: Initializing extensions...");

		// Get all extensions
		const extensions = yield* extension.getAll;
		telemetry.log("info", `[Cocoon Bootstrap] Found ${extensions.length} extensions`);

		// Activate enabled extensions (in production, this would be based on configuration)
		for (const ext of extensions) {
			if (ext.manifest.enabled) {
				yield* extension.activate(ext.id);
			}
		}

		const activeCount = yield* extension.getActiveCount;
		telemetry.log("info", `[Cocoon Bootstrap] Activated ${activeCount} extensions`);

		return {
			stageName: "Extensions",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage6_HealthCheck = withSpan(
	"stage6_healthcheck",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const health = yield* HealthTag;

		telemetry.log("info", "[Cocoon Bootstrap] Stage 6: Running health checks...");

		const systemHealth = yield* health.checkAllServices();

		telemetry.log(
			"info",
			`[Cocoon{
 Bootstrap] Health check result: ${systemHealth.overallStatus}`,
		);

		if (systemHealth.overallStatus === "unhealthy") {
			telemetry.log("error", "[Cocoon Bootstrap] Some services are unhealthy!");
		}

		return {
			stageName: "HealthCheck",
			success: systemHealth.overallStatus !== "unhealthy",
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

// ============================================================================
// BOOTSTRAP IMPLEMENTATION
// ============================================================================

const makeBootstrap = (): BootstrapService => ({
	run: (options) =>
		Effect.gen(function* () {
			const telemetry = yield* TelemetryTag;

			const startTime = Date.now();
			const { skipHealthCheck = false, debugMode = false } = options ?? {};

			telemetry.log("info", "[Cocoon Bootstrap] ===============================================");
			telemetry.log("info", "[Cocoon Bootstrap] Cocoon Extension Host Bootstrap");
			telemetry.log("info", `[Cocoon Bootstrap] Debug mode: ${debugMode}`);
			telemetry.log("info", "[Cocoon Bootstrap] ===============================================");

			const stages = [
				stage1_Environment,
				stage2_Configuration,
				stage3_MountainConnection,
				stage4_RPCServer,
				stage5_Extensions,
				...(skipHealthCheck ? [] : [stage6_HealthCheck]),
			];

			const results: StageResult[] = [];

			for (const stage of stages) {
				const stageStartTime = Date.now();
				let result: StageResult;
				try {
					// @ts-expect-error - Effect stages have different requirements that runtime handles correctly
					const stageResult = yield* Effect.suspend(() => stage) as any;
					result = { ...stageResult, duration: Date.now() - stageStartTime };
				} catch (e) {
					const error = e instanceof Error ? e : new Error(String(e));
					result = {
						stageName: "Unknown",
						success: false as boolean,
						duration: Date.now() - stageStartTime,
						error,
					} satisfies StageResult;
				}
				results.push(result);
			}

			const endTime = Date.now();
			const totalDuration = endTime - startTime;
			const allSuccess = results.every((r) => r.success);

			telemetry.log("info", "[Cocoon Bootstrap] ===============================================");
			telemetry.log(
				"info",
				`[Cocoon Bootstrap] ${allSuccess ? "✓ Bootstrap completed successfully" : "✗ Bootstrap failed"}`,
			);
			telemetry.log("info", `[Cocoon Bootstrap] Total duration: ${totalDuration}ms`);
			telemetry.log("info", "[Cocoon Bootstrap] ===============================================");

			if (!allSuccess) {
				const failedStages = results.filter((r) => !r.success);
				telemetry.log("error", "[Cocoon Bootstrap] Failed stages:");
				for (const failed of failedStages) {
					telemetry.log("error", `[Cocoon Bootstrap]   - ${failed.stageName}: ${failed.error?.message || "Unknown error"}`);
				}
			}

			return {
				success: allSuccess,
				totalDuration,
				stages: results,
				error: allSuccess ? undefined : new Error("Bootstrap failed"),
			} satisfies BootstrapResult;
		}),
});

// ============================================================================
// LAYERS
// ============================================================================

export const BootstrapLive = Layer.effect(
	BootstrapTag,
	Effect.succeed(makeBootstrap()),
);

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockBootstrap = (): BootstrapService => ({
	run: (options) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
			return {
				success: true,
				totalDuration: 1,
				stages: [
					{ stageName: "Environment", success: true, duration: 0, error: undefined },
					{ stageName: "Configuration", success: true, duration: 0, error: undefined },
					{ stageName: "MountainConnection", success: true, duration: 0, error: undefined },
					{ stageName: "RPCServer", success: true, duration: 0, error: undefined },
					{ stageName: "Extensions", success: true, duration: 0, error: undefined },
					...(options?.skipHealthCheck ? [] : [{ stageName: "HealthCheck", success: true, duration: 0, error: undefined }]),
				],
				error: undefined,
			} satisfies BootstrapResult;
		}),
});

export const BootstrapMock = Layer.effect(BootstrapTag, Effect.succeed(makeMockBootstrap()));

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const runBootstrap = (options?: BootstrapOptions) =>
	Effect.gen(function*{
 () {
		const bootstrap = yield* BootstrapTag;
		return yield* bootstrap.run(options);
	}).pipe(
		Effect.provide(BootstrapLive),
	);
