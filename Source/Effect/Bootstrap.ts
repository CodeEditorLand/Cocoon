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

import { createConnection } from "node:net";

import { Context, Duration, Effect, Layer, Schedule } from "effect";

import LandFixLog from "../Utility/LandFixLog.js";
import { ExtensionTag } from "./Extension.js";
import { HealthTag } from "./Health.js";
import { ModuleInterceptorTag } from "./ModuleInterceptor.js";
import { MountainClientTag } from "./MountainClient.js";
import { RPCServerTag } from "./RPCServer.js";
import { TelemetryTag, withSpan } from "./Telemetry.js";

/**
 * Fast TCP port probe — returns true if a client socket can ESTABLISH (not
 * just send SYN) inside `TimeoutMs`. Used as Stage 3's pre-flight so we only
 * attempt the expensive gRPC handshake once Mountain's listener is live.
 * Cheap: one socket, one timeout, no retries.
 */
const ProbeTcp = (
	Host: string,
	Port: number,
	TimeoutMs: number,
): Effect.Effect<boolean, never> =>
	Effect.async<boolean, never>((Resume) => {
		let Settled = false;
		const Settle = (Value: boolean) => {
			if (Settled) return;
			Settled = true;
			try {
				Socket.destroy();
			} catch {}
			Resume(Effect.succeed(Value));
		};
		const Socket = createConnection({ host: Host, port: Port });
		const Timer = setTimeout(() => Settle(false), TimeoutMs);
		Socket.once("connect", () => {
			clearTimeout(Timer);
			Settle(true);
		});
		Socket.once("error", () => {
			clearTimeout(Timer);
			Settle(false);
		});
		return Effect.sync(() => {
			clearTimeout(Timer);
			try {
				Socket.destroy();
			} catch {}
		});
	});

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
	readonly run: (
		options?: BootstrapOptions,
	) => Effect.Effect<BootstrapResult, never>;
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

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 1: Detecting environment...",
		);

		const nodeVersion = process.version;
		const platform = process.platform;
		const arch = process.arch;

		telemetry.log(
			"info",
			`[Cocoon Bootstrap] Node.js ${nodeVersion} on ${platform}/${arch}`,
		);

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

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 2: Loading configuration...",
		);

		// Real bootstrap configuration comes in through the environment —
		// Mountain spawns Cocoon with `MOUNTAIN_GRPC_PORT`, `COCOON_GRPC_PORT`,
		// `LAND_DEV_LOG`, `NODE_ENV`, etc. Extension-host settings arrive later
		// via `InitializeExtensionHost`. Here we:
		//   (a) parse + validate the bootstrap env vars once,
		//   (b) report each resolved value via telemetry so a pasted log makes
		//       misconfiguration obvious, and
		//   (c) attach the parsed block to `globalThis.__cocoonBootstrapConfig`
		//       so downstream stages / handlers can read without re-parsing.
		const ParsePort = (
			Raw: string | undefined,
			Fallback: number,
		): number => {
			if (Raw === undefined) return Fallback;
			const Value = parseInt(Raw, 10);
			return Number.isFinite(Value) && Value > 0 && Value < 65536
				? Value
				: Fallback;
		};

		const ResolvedConfig = {
			MountainPort: ParsePort(process.env["MOUNTAIN_GRPC_PORT"], 50051),
			CocoonPort: ParsePort(process.env["COCOON_GRPC_PORT"], 50052),
			NodeEnv: process.env["NODE_ENV"] ?? "production",
			DevLog: process.env["LAND_DEV_LOG"] ?? "",
			DebugFlag: process.env["TAURI_ENV_DEBUG"] === "true",
		};

		(
			globalThis as unknown as {
				__cocoonBootstrapConfig?: typeof ResolvedConfig;
			}
		).__cocoonBootstrapConfig = ResolvedConfig;

		LandFixLog.Info(
			"Bootstrap",
			`Configuration resolved: MountainPort=${ResolvedConfig.MountainPort} CocoonPort=${ResolvedConfig.CocoonPort} NodeEnv=${ResolvedConfig.NodeEnv} DevLog=${ResolvedConfig.DevLog || "<unset>"} TauriDebug=${ResolvedConfig.DebugFlag}`,
		);
		telemetry.log("info", "[Cocoon Bootstrap] Configuration loaded");

		return {
			stageName: "Configuration",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

/**
 * Stage 3 tuning — exposed as constants so a future test harness can override.
 * Total worst-case duration before we give up: probe 15× + connect retry up to
 * `MountainConnectMaxAttempts`. With 250 ms probe + 500 ms initial backoff
 * doubling to 5 s cap, 15 attempts covers the 5–8 s Mountain startup window
 * observed in every rebuild so far with generous headroom.
 */
const MountainProbeTimeoutMs = 250;
const MountainProbeMaxAttempts = 15;
const MountainProbeDelayMs = 200;
const MountainConnectMaxAttempts = 20;

const stage3_MountainConnection = withSpan(
	"stage3_mountain_connection",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const mountainClient = yield* MountainClientTag;

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 3: Connecting to Mountain...",
		);

		// Connect to Mountain's gRPC server (MountainService on port 50051).
		// Mountain sets MOUNTAIN_GRPC_PORT env var when spawning Cocoon.
		const MountainPort = parseInt(
			process.env["MOUNTAIN_GRPC_PORT"] || "50051",
			10,
		);
		const MountainHost = "localhost";

		// Pre-flight: wait for the TCP listener to come up before attempting
		// the gRPC handshake. Without this, the first `mountainClient.connect`
		// attempt races Mountain's boot and reports a hard ConnectionError
		// before the in-client retry loop (SendRequestWithRetry) can recover.
		let ProbeAttempt = 0;
		let Listening = false;
		while (ProbeAttempt < MountainProbeMaxAttempts && !Listening) {
			ProbeAttempt++;
			Listening = yield* ProbeTcp(
				MountainHost,
				MountainPort,
				MountainProbeTimeoutMs,
			);
			if (Listening) {
				LandFixLog.Info(
					"Bootstrap",
					`Mountain TCP port ${MountainHost}:${MountainPort} listening after ${ProbeAttempt} probe(s)`,
				);
				break;
			}
			yield* Effect.sleep(Duration.millis(MountainProbeDelayMs));
		}
		if (!Listening) {
			LandFixLog.Warn(
				"Bootstrap",
				`Mountain TCP port ${MountainHost}:${MountainPort} unreachable after ${MountainProbeMaxAttempts} probes; attempting connect anyway`,
			);
		}

		// Attempt the gRPC connect with exponential backoff. Schedule.exponential
		// doubles each delay from 500 ms; Schedule.recurs caps total attempts.
		// On every recur, log the failure so a pasted terminal log surfaces the
		// cause without having to re-run with a verbose flag.
		const AttemptRef = { value: 0 };
		const Connect = Effect.gen(function* () {
			AttemptRef.value++;
			yield* mountainClient.connect({
				host: MountainHost,
				port: MountainPort,
			});
		}).pipe(
			Effect.tapError((Failure) =>
				Effect.sync(() => {
					const Message =
						Failure instanceof Error
							? Failure.message
							: String(Failure);
					LandFixLog.Warn(
						"Bootstrap",
						`MountainConnection attempt ${AttemptRef.value}/${MountainConnectMaxAttempts} failed: ${Message}`,
					);
				}),
			),
			Effect.retry(
				Schedule.exponential(Duration.millis(500)).pipe(
					Schedule.union(Schedule.spaced(Duration.seconds(5))),
					Schedule.intersect(
						Schedule.recurs(MountainConnectMaxAttempts - 1),
					),
				),
			),
		);

		yield* Connect;

		const version = yield* mountainClient.version;

		LandFixLog.Info(
			"Bootstrap",
			`MountainConnection OK (v${version}) after ${AttemptRef.value} attempt(s), probe settled after ${ProbeAttempt}`,
		);
		telemetry.log(
			"info",
			`[Cocoon Bootstrap] Connected to Mountain (v${version})`,
		);

		return {
			stageName: "MountainConnection",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage4_ModuleInterceptor = withSpan(
	"stage4_module_interceptor",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const moduleInterceptor = yield* ModuleInterceptorTag;

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 4: Setting up module interceptor...",
		);

		// Initialize module interceptor service
		yield* moduleInterceptor.initialize;

		// Install module interceptor into Node.js module system
		yield* moduleInterceptor.install;

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Module interceptor installed successfully",
		);

		return {
			stageName: "ModuleInterceptor",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage5_RPCServer = withSpan(
	"stage5_rpc_server",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const rpcServer = yield* RPCServerTag;

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 5: Starting gRPC server...",
		);

		// Start gRPC server for Mountain ← Cocoon communication.
		// Port from env var (set by Mountain) or default 50052.
		const CocoonPort = parseInt(
			process.env["COCOON_GRPC_PORT"] || "50052",
			10,
		);
		console.log(
			`[Cocoon Bootstrap] Stage 5: Starting gRPC on port ${CocoonPort}`,
		);
		yield* rpcServer.start({
			host: "0.0.0.0",
			port: CocoonPort,
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

const stage6_Extensions = withSpan(
	"stage6_extensions",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const extension = yield* ExtensionTag;

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 6: Initializing extensions...",
		);

		// Get all extensions
		const extensions = yield* extension.getAll;
		telemetry.log(
			"info",
			`[Cocoon Bootstrap] Found ${extensions.length} extensions`,
		);

		// Parallel activation with bounded concurrency (8) and per-extension
		// error isolation — one bad activate must not abort the stage. Sequential
		// for-loops used to serialise activations behind any slow I/O inside an
		// extension's activate callback (file reads, LSP launches). Effect.forEach
		// runs up to 8 concurrently and collects all successes; failures log and
		// fall through.
		const EligibleExtensions = extensions.filter(
			(Ext) => Ext.manifest.enabled,
		);
		const ActivationAttempts = yield* Effect.forEach(
			EligibleExtensions,
			(Ext) =>
				extension.activate(Ext.id).pipe(
					Effect.map(() => ({ Id: Ext.id, Ok: true as const })),
					Effect.catchAll((Failure) => {
						const Message =
							Failure instanceof Error
								? Failure.message
								: String(Failure);
						telemetry.log(
							"warn",
							`[Cocoon Bootstrap] Extension ${Ext.id} activation failed: ${Message}`,
						);
						return Effect.succeed({
							Id: Ext.id,
							Ok: false as const,
							Error: Message,
						});
					}),
				),
			{ concurrency: 8 },
		);
		const Successful = ActivationAttempts.filter((R) => R.Ok).length;
		const FailedCount = ActivationAttempts.length - Successful;

		const activeCount = yield* extension.getActiveCount;
		telemetry.log(
			"info",
			`[Cocoon Bootstrap] Activated ${activeCount} extensions (${Successful} this stage, ${FailedCount} failed)`,
		);

		return {
			stageName: "Extensions",
			success: true as boolean,
			duration: 0,
			error: undefined,
		} satisfies StageResult;
	}),
);

const stage7_HealthCheck = withSpan(
	"stage7_healthcheck",
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;
		const health = yield* HealthTag;

		telemetry.log(
			"info",
			"[Cocoon Bootstrap] Stage 7: Running health checks...",
		);

		const systemHealth = yield* health.checkAllServices();

		telemetry.log(
			"info",
			`[Cocoon Bootstrap] Health check result: ${systemHealth.overallStatus}`,
		);

		if (systemHealth.overallStatus === "unhealthy") {
			telemetry.log(
				"error",
				"[Cocoon Bootstrap] Some services are unhealthy!",
			);
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
			const { skipHealthCheck = false, debugMode = false } =
				options ?? {};

			telemetry.log(
				"info",
				"[Cocoon Bootstrap] ===============================================",
			);
			telemetry.log(
				"info",
				"[Cocoon Bootstrap] Cocoon Extension Host Bootstrap",
			);
			telemetry.log(
				"info",
				`[Cocoon Bootstrap] Debug mode: ${debugMode}`,
			);
			telemetry.log(
				"info",
				"[Cocoon Bootstrap] ===============================================",
			);

			const stages: Array<[string, unknown]> = [
				["Environment", stage1_Environment],
				["Configuration", stage2_Configuration],
				["MountainConnection", stage3_MountainConnection],
				["ModuleInterceptor", stage4_ModuleInterceptor],
				["RPCServer", stage5_RPCServer],
				["Extensions", stage6_Extensions],
				...(skipHealthCheck
					? []
					: ([["HealthCheck", stage7_HealthCheck]] as Array<
							[string, unknown]
						>)),
			];

			const results: StageResult[] = [];

			for (const [StageName, stage] of stages) {
				const stageStartTime = Date.now();
				// Wrap each stage in Effect.catchAllCause to survive fiber failures.
				// JavaScript try/catch does NOT catch Effect fiber failures.
				const SafeStage = Effect.suspend(() => stage as any).pipe(
					Effect.catchAllCause((Cause) => {
						const Message = String(Cause).slice(0, 300);
						process.stdout.write(
							`[LandFix:Bootstrap] Stage "${StageName}" failed (continuing): ${Message}\n`,
						);
						return Effect.succeed({
							stageName: StageName,
							success: false as boolean,
							duration: Date.now() - stageStartTime,
							error: new Error(Message),
						} satisfies StageResult);
					}),
				);
				const result = yield* SafeStage as any;
				if (result?.success === false) {
					process.stdout.write(
						`[LandFix:Bootstrap] Stage "${StageName}" reported failure: ${(result as { error?: { message?: string } }).error?.message ?? "<no message>"}\n`,
					);
				} else {
					process.stdout.write(
						`[LandFix:Bootstrap] Stage "${StageName}" OK in ${Date.now() - stageStartTime}ms\n`,
					);
				}
				results.push({
					...result,
					duration: Date.now() - stageStartTime,
				});
			}

			const endTime = Date.now();
			const totalDuration = endTime - startTime;
			const allSuccess = results.every((r) => r.success);

			telemetry.log(
				"info",
				"[Cocoon Bootstrap] ===============================================",
			);
			telemetry.log(
				"info",
				`[Cocoon Bootstrap] ${allSuccess ? "✓ Bootstrap completed successfully" : "✗ Bootstrap failed"}`,
			);
			telemetry.log(
				"info",
				`[Cocoon Bootstrap] Total duration: ${totalDuration}ms`,
			);
			telemetry.log(
				"info",
				"[Cocoon Bootstrap] ===============================================",
			);

			if (!allSuccess) {
				const failedStages = results.filter((r) => !r.success);
				telemetry.log("error", "[Cocoon Bootstrap] Failed stages:");
				for (const failed of failedStages) {
					telemetry.log(
						"error",
						`[Cocoon Bootstrap]   - ${failed.stageName}: ${failed.error?.message || "Unknown error"}`,
					);
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
					{
						stageName: "Environment",
						success: true,
						duration: 0,
						error: undefined,
					},
					{
						stageName: "Configuration",
						success: true,
						duration: 0,
						error: undefined,
					},
					{
						stageName: "MountainConnection",
						success: true,
						duration: 0,
						error: undefined,
					},
					{
						stageName: "RPCServer",
						success: true,
						duration: 0,
						error: undefined,
					},
					{
						stageName: "Extensions",
						success: true,
						duration: 0,
						error: undefined,
					},
					...(options?.skipHealthCheck
						? []
						: [
								{
									stageName: "HealthCheck",
									success: true,
									duration: 0,
									error: undefined,
								},
							]),
				],
				error: undefined,
			} satisfies BootstrapResult;
		}),
});

export const BootstrapMock = Layer.effect(
	BootstrapTag,
	Effect.succeed(makeMockBootstrap()),
);

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const runBootstrap = (options?: BootstrapOptions) =>
	Effect.gen(function* () {
		const bootstrap = yield* BootstrapTag;
		return yield* bootstrap.run(options);
	}).pipe(Effect.provide(BootstrapLive));
