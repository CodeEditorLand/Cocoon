/**
 * @module Effect/Bootstrap
 * @description
 * Lean async bootstrap orchestration for Cocoon Extension Host.
 * All stages are plain async functions - no Effect-TS machinery.
 */

import { createConnection } from "node:net";

import { CocoonDevLog } from "../Services/Dev/Log.js";

import LandFixLog from "../Utility/Land/Fix/Log.js";

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

	readonly run: (options?: BootstrapOptions) => Promise<BootstrapResult>;
}

// ============================================================================
// SERVICE TAG (plain marker - no Symbol)
// ============================================================================

export const BootstrapTag = { _tag: "Cocoon/Bootstrap" as const };

// ============================================================================
// TCP PROBE
// ============================================================================

const ProbeTcp = (
	Host: string,

	Port: number,

	TimeoutMs: number,
): Promise<boolean> =>
	new Promise((resolve) => {
		let Settled = false;

		const settle = (v: boolean) => {
			if (Settled) return;

			Settled = true;

			try {
				Socket.destroy(;
			} catch {}

			resolve(v;
		};

		const Socket = createConnection({ host: Host, port: Port };

		const Timer = setTimeout(() => settle(false), TimeoutMs;

		Socket.once("connect", () => {
			clearTimeout(Timer;

			settle(true;
		};

		Socket.once("error", () => {
			clearTimeout(Timer;

			settle(false;
		};
	};

// ============================================================================
// TUNING
// ============================================================================

const MountainProbeTimeoutMs = 300;

const MountainProbeMaxAttempts = 3;

const MountainProbeDelayMs = 100;

const MountainProbeBackoffFactor = 2;

const MountainProbeMaxDelayMs = 500;

const MountainConnectMaxAttempts = 5;

// ============================================================================
// STAGE FUNCTIONS
// ============================================================================

const stage1_Environment = async (): Promise<StageResult> => {
	const start = Date.now(;

	CocoonDevLog(
		"bootstrap-stage",

		"[Bootstrap] stage=Environment event=start",
	;

	const nodeVersion = process.version;

	const platform = process.platform;

	const arch = process.arch;

	CocoonDevLog(
		"bootstrap-stage",

		`[Bootstrap] stage=Environment event=ok node=${nodeVersion} platform=${platform}/${arch} duration_ms=${Date.now() - start}`,
	;

	return {
		stageName: "Environment",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage2_Configuration = async (): Promise<StageResult> => {
	const start = Date.now(;

	CocoonDevLog(
		"bootstrap-stage",

		"[Bootstrap] stage=Configuration event=start",
	;

	const ParsePort = (Raw: string | undefined, Fallback: number): number => {
		if (Raw === undefined) return Fallback;

		const Value = parseInt(Raw, 10;

		return Number.isFinite(Value) && Value > 0 && Value < 65536
			? Value
			: Fallback;
	};

	const ResolvedConfig = {
		MountainPort: ParsePort(process.env["MOUNTAIN_GRPC_PORT"], 50051),

		CocoonPort: ParsePort(process.env["COCOON_GRPC_PORT"], 50052),

		NodeEnv: process.env["NODE_ENV"] ?? "production",

		DevLog: process.env["Trace"] ?? "",

		DebugFlag: process.env["TAURI_ENV_DEBUG"] === "true",
	};

	(globalThis as any).__cocoonBootstrapConfig = ResolvedConfig;

	LandFixLog.Info(
		"Bootstrap",

		`Configuration resolved: MountainPort=${ResolvedConfig.MountainPort} CocoonPort=${ResolvedConfig.CocoonPort}`,
	;

	CocoonDevLog(
		"bootstrap-stage",

		`[Bootstrap] stage=Configuration event=ok duration_ms=${Date.now() - start}`,
	;

	return {
		stageName: "Configuration",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

// Import service singletons lazily to avoid circular deps
const getRPCServer = async () => (await import("./RPCServer.js")).RPCServerLive;

const getModuleInterceptor = async () =>
	(await import("./Module/Interceptor.js")).ModuleInterceptorLive;

const getMountainClient = async () =>
	(await import("./Mountain/Client.js")).MountainClientLive(;

const getHealth = async () => (await import("./Health.js")).HealthLive;

const stage5_RPCServer = async (): Promise<StageResult> => {
	const start = Date.now(;

	const CocoonPort = parseInt(process.env["COCOON_GRPC_PORT"] || "50052", 10;

	CocoonDevLog(
		"bootstrap",

		`[Cocoon Bootstrap] Stage 5: Starting gRPC on port ${CocoonPort}`,
	;

	const rpcServer = await getRPCServer(;

	await rpcServer.start({ host: "0.0.0.0", port: CocoonPort };

	process.stdout.write(`[LandFix:Bootstrap] Stage "RPCServer" OK\n`;

	return {
		stageName: "RPCServer",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage4_ModuleInterceptor = async (): Promise<StageResult> => {
	const start = Date.now(;

	const moduleInterceptor = await getModuleInterceptor(;

	await moduleInterceptor.initialize(;

	await moduleInterceptor.install(;

	return {
		stageName: "ModuleInterceptor",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage3_MountainConnection = async (): Promise<StageResult> => {
	const start = Date.now(;

	const mountainClient = await getMountainClient(;

	const MountainPort = parseInt(
		process.env["MOUNTAIN_GRPC_PORT"] || "50051",

		10,
	;

	const MountainHost = "localhost";

	let ProbeAttempt = 0,

		ProbeDelay = MountainProbeDelayMs,

		Listening = false;

	while (ProbeAttempt < MountainProbeMaxAttempts && !Listening) {
		ProbeAttempt++;

		Listening = await ProbeTcp(
			MountainHost,

			MountainPort,

			MountainProbeTimeoutMs,
		;

		if (Listening) {
			LandFixLog.Info(
				"Bootstrap",

				`Mountain TCP port listening after ${ProbeAttempt} probe(s)`,
			;

			break;
		}

		await new Promise((r) => setTimeout(r, ProbeDelay);

		ProbeDelay = Math.min(
			ProbeDelay * MountainProbeBackoffFactor,

			MountainProbeMaxDelayMs,
		;
	}

	const AttemptRef = { value: 0 };

	const connectWithRetry = async () => {
		let lastErr: Error | undefined;

		for (let attempt = 0; attempt < MountainConnectMaxAttempts; attempt++) {
			AttemptRef.value++;

			try {
				await mountainClient.connect({
					host: MountainHost,
					port: MountainPort,
				};

				return;
			} catch (e) {
				lastErr = e instanceof Error ? e : new Error(String(e);

				LandFixLog.Warn(
					"Bootstrap",

					`MountainConnection attempt ${AttemptRef.value}/${MountainConnectMaxAttempts} failed: ${lastErr.message}`,
				;

				await new Promise((r) =>
					setTimeout(r, Math.min(500 * Math.pow(2, attempt), 5000)),
				;
			}
		}

		throw lastErr ?? new Error("MountainConnection: max attempts exceeded";
	};

	await connectWithRetry(;

	const version = await mountainClient.version(;

	LandFixLog.Info(
		"Bootstrap",

		`MountainConnection OK (v${version}) after ${AttemptRef.value} attempt(s)`,
	;

	return {
		stageName: "MountainConnection",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage6_Extensions = async (): Promise<StageResult> => {
	const start = Date.now(;

	// Extension activation is driven solely by Mountain's $activateByEvent
	// gRPC path into the extension-host handler; activating here in parallel
	// risks double-activation with a stale context.
	CocoonDevLog(
		"bootstrap-stage",

		"[Bootstrap] stage=Extensions event=ok activation delegated to host",
	;

	return {
		stageName: "Extensions",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage7_HealthCheck = async (): Promise<StageResult> => {
	const start = Date.now(;

	const health = await getHealth(;

	const systemHealth = await health.checkAllServices(;

	// checkAllServices reports healthy when no services are registered;
	// enforce explicit floors: gRPC server bound + Mountain connection up.
	const FloorFailures: string[] = [];

	const ServerState = (await getRPCServer()).getState(;

	if (ServerState._tag !== "Running") {
		FloorFailures.push(`gRPC server not bound (state=${ServerState._tag})`;
	}

	const MountainState = await (await getMountainClient()).connectionState(;

	if (MountainState._tag !== "Connected") {
		FloorFailures.push(
			`Mountain connection not established (state=${MountainState._tag})`,
		;
	}

	if (FloorFailures.length > 0) {
		LandFixLog.Warn(
			"Bootstrap",

			`HealthCheck floor failed: ${FloorFailures.join("; ")}`,
		;
	}

	return {
		stageName: "HealthCheck",

		success:
			systemHealth.overallStatus !== "unhealthy" &&
			FloorFailures.length === 0,

		duration: Date.now() - start,

		error:
			FloorFailures.length > 0
				? new Error(`HealthCheck floor: ${FloorFailures.join("; ")}`)
				: undefined,
	};
};

// ============================================================================
// BOOTSTRAP IMPLEMENTATION
// ============================================================================

const runStage = async (
	StageName: string,

	stageFn: () => Promise<StageResult>,
): Promise<StageResult> => {
	const stageStart = Date.now(;

	try {
		const result = await stageFn(;

		process.stdout.write(
			`[LandFix:Bootstrap] Stage "${StageName}" OK in ${Date.now() - stageStart}ms\n`,
		;

		return { ...result, duration: Date.now() - stageStart };
	} catch (e) {
		const err = e instanceof Error ? e : new Error(String(e);

		process.stdout.write(
			`[LandFix:Bootstrap] Stage "${StageName}" failed: ${err.message}\n`,
		;

		return {
			stageName: StageName,

			success: false,

			duration: Date.now() - stageStart,

			error: err,
		};
	}
};

const makeBootstrap = (): BootstrapService => ({
	run: async (options?: BootstrapOptions): Promise<BootstrapResult> => {
		const startTime = Date.now(;

		const { skipHealthCheck = false } = options ?? {};

		const results: StageResult[] = [];

		results.push(await runStage("Environment", stage1_Environment);

		results.push(await runStage("Configuration", stage2_Configuration);

		// RPCServer ∥ ModuleInterceptor are independent. MountainConnection
		// needs only the RPCServer to be bound - chain it on that stage's
		// promise so the connect attempt starts the moment the server
		// settles instead of waiting for ModuleInterceptor too. Extension
		// activation is NOT gated on stage order: Mountain drives it via
		// `InitializeExtensionHost` / `$activateByEvent` over the gRPC
		// server (stage6 below only logs the delegation).
		const RpcServerPromise = runStage("RPCServer", stage5_RPCServer;

		// runStage never rejects (errors become `success: false`), so this
		// chain cannot produce an unhandled rejection.
		const MountainConnectionPromise: Promise<StageResult> =
			RpcServerPromise.then((RpcResult) =>
				RpcResult.success
					? runStage("MountainConnection", stage3_MountainConnection)
					: {
							stageName: "MountainConnection",

							success: false,

							duration: 0,

							error: new Error("Skipped: RPCServer stage failed"),
						},
			;

		const [RpcResult, InterceptorResult] = await Promise.all([
			RpcServerPromise,

			runStage("ModuleInterceptor", stage4_ModuleInterceptor),
		];

		results.push(RpcResult, InterceptorResult;

		// An unreachable gRPC server makes Cocoon an orphan Mountain
		// can never contact; exit instead of lingering degraded.
		if (!RpcResult.success) {
			CocoonDevLog(
				"bootstrap",

				`[Bootstrap] FATAL: RPCServer stage failed (${RpcResult.error?.message ?? "unknown error"}); exiting to avoid orphan Cocoon`,
			;

			process.stderr.write(
				`[LandFix:Bootstrap] FATAL: RPCServer stage failed (${RpcResult.error?.message ?? "unknown error"}); exiting\n`,
			;

			process.exit(1;
		}

		results.push(await MountainConnectionPromise;

		results.push(await runStage("Extensions", stage6_Extensions);

		if (!skipHealthCheck) {
			results.push(await runStage("HealthCheck", stage7_HealthCheck);
		}

		const allSuccess = results.every((r) => r.success;

		return {
			success: allSuccess,
			totalDuration: Date.now() - startTime,
			stages: results,
			error: allSuccess ? undefined : new Error("Bootstrap failed"),
		};
	},
};

// ============================================================================
// EXPORTS
// ============================================================================

export const BootstrapLive = makeBootstrap(;

export const runBootstrap = async (
	options?: BootstrapOptions,
): Promise<BootstrapResult> => BootstrapLive.run(options;

// Mock for testing
export const makeMockBootstrap = (): BootstrapService => ({
	run: async (options?) => ({
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
				stageName: "RPCServer",
				success: true,
				duration: 0,
				error: undefined,
			},
			{
				stageName: "ModuleInterceptor",
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
	}),
};

export const BootstrapMock = makeMockBootstrap(;
