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
// SERVICE TAG (plain marker - no Context.Tag)
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
				Socket.destroy();
			} catch {}

			resolve(v);
		};

		const Socket = createConnection({ host: Host, port: Port });

		const Timer = setTimeout(() => settle(false), TimeoutMs);

		Socket.once("connect", () => {
			clearTimeout(Timer);

			settle(true);
		});

		Socket.once("error", () => {
			clearTimeout(Timer);

			settle(false);
		});
	});

// ============================================================================
// CONCURRENT RUNNER
// ============================================================================

async function runConcurrent<T, R>(
	items: ReadonlyArray<T>,

	fn: (item: T) => Promise<R>,

	concurrency: number,
): Promise<Array<R | { error: unknown }>> {
	const results: Array<R | { error: unknown }> = [];

	let i = 0;

	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },

		async () => {
			while (i < items.length) {
				const item = items[i++]!;

				results.push(await fn(item).catch((e) => ({ error: e })));
			}
		},
	);

	await Promise.all(workers);

	return results;
}

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
	const start = Date.now();

	CocoonDevLog(
		"bootstrap-stage",

		"[Bootstrap] stage=Environment event=start",
	);

	const nodeVersion = process.version;

	const platform = process.platform;

	const arch = process.arch;

	CocoonDevLog(
		"bootstrap-stage",

		`[Bootstrap] stage=Environment event=ok node=${nodeVersion} platform=${platform}/${arch} duration_ms=${Date.now() - start}`,
	);

	return {
		stageName: "Environment",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage2_Configuration = async (): Promise<StageResult> => {
	const start = Date.now();

	CocoonDevLog(
		"bootstrap-stage",

		"[Bootstrap] stage=Configuration event=start",
	);

	const ParsePort = (Raw: string | undefined, Fallback: number): number => {
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

		DevLog: process.env["Trace"] ?? "",

		DebugFlag: process.env["TAURI_ENV_DEBUG"] === "true",
	};

	(globalThis as any).__cocoonBootstrapConfig = ResolvedConfig;

	LandFixLog.Info(
		"Bootstrap",

		`Configuration resolved: MountainPort=${ResolvedConfig.MountainPort} CocoonPort=${ResolvedConfig.CocoonPort}`,
	);

	CocoonDevLog(
		"bootstrap-stage",

		`[Bootstrap] stage=Configuration event=ok duration_ms=${Date.now() - start}`,
	);

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
	(await import("./Mountain/Client.js")).MountainClientLive();

const getExtension = async () =>
	(await import("./Extension.js")).ExtensionLive.build();

const getHealth = async () => (await import("./Health.js")).HealthLive;

const stage5_RPCServer = async (): Promise<StageResult> => {
	const start = Date.now();

	const CocoonPort = parseInt(process.env["COCOON_GRPC_PORT"] || "50052", 10);

	CocoonDevLog(
		"bootstrap",

		`[Cocoon Bootstrap] Stage 5: Starting gRPC on port ${CocoonPort}`,
	);

	const rpcServer = await getRPCServer();

	await rpcServer.start({ host: "0.0.0.0", port: CocoonPort });

	process.stdout.write(`[LandFix:Bootstrap] Stage "RPCServer" OK\n`);

	return {
		stageName: "RPCServer",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage4_ModuleInterceptor = async (): Promise<StageResult> => {
	const start = Date.now();

	const moduleInterceptor = await getModuleInterceptor();

	await moduleInterceptor.initialize();

	await moduleInterceptor.install();

	return {
		stageName: "ModuleInterceptor",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage3_MountainConnection = async (): Promise<StageResult> => {
	const start = Date.now();

	const mountainClient = await getMountainClient();

	const MountainPort = parseInt(
		process.env["MOUNTAIN_GRPC_PORT"] || "50051",

		10,
	);

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
		);

		if (Listening) {
			LandFixLog.Info(
				"Bootstrap",

				`Mountain TCP port listening after ${ProbeAttempt} probe(s)`,
			);

			break;
		}

		await new Promise((r) => setTimeout(r, ProbeDelay));

		ProbeDelay = Math.min(
			ProbeDelay * MountainProbeBackoffFactor,

			MountainProbeMaxDelayMs,
		);
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
				});

				return;
			} catch (e) {
				lastErr = e instanceof Error ? e : new Error(String(e));

				LandFixLog.Warn(
					"Bootstrap",

					`MountainConnection attempt ${AttemptRef.value}/${MountainConnectMaxAttempts} failed: ${lastErr.message}`,
				);

				await new Promise((r) =>
					setTimeout(r, Math.min(500 * Math.pow(2, attempt), 5000)),
				);
			}
		}

		throw lastErr ?? new Error("MountainConnection: max attempts exceeded");
	};

	await connectWithRetry();

	const version = await mountainClient.version();

	LandFixLog.Info(
		"Bootstrap",

		`MountainConnection OK (v${version}) after ${AttemptRef.value} attempt(s)`,
	);

	return {
		stageName: "MountainConnection",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage6_Extensions = async (): Promise<StageResult> => {
	const start = Date.now();

	const extension = await getExtension();

	let extensions = await extension.getAll();

	// Mountain populates the installed-extensions list asynchronously; an
	// empty list here may be a not-yet-populated race, not a real absence.
	for (let Retry = 0; Retry < 3 && extensions.length === 0; Retry++) {
		await new Promise((r) => setTimeout(r, 300));

		extensions = await extension.getAll();

		if (extensions.length > 0) {
			LandFixLog.Info(
				"Bootstrap",

				`Extensions list populated after ${Retry + 1} retry probe(s)`,
			);
		}
	}

	const EligibleExtensions = extensions.filter(
		(Ext: any) => Ext.manifest?.enabled,
	);

	const results = await runConcurrent(
		EligibleExtensions,

		async (Ext: any) => {
			try {
				await extension.activate(Ext.id);

				return { Id: Ext.id, Ok: true };
			} catch (e) {
				return { Id: Ext.id, Ok: false, Error: String(e) };
			}
		},

		8,
	);

	void results.filter((r: any) => r.Ok).length;

	return {
		stageName: "Extensions",

		success: true,

		duration: Date.now() - start,

		error: undefined,
	};
};

const stage7_HealthCheck = async (): Promise<StageResult> => {
	const start = Date.now();

	const health = await getHealth();

	const systemHealth = await health.checkAllServices();

	// checkAllServices reports healthy when no services are registered;
	// enforce explicit floors: gRPC server bound + Mountain connection up.
	const FloorFailures: string[] = [];

	const ServerState = (await getRPCServer()).getState();

	if (ServerState._tag !== "Running") {
		FloorFailures.push(`gRPC server not bound (state=${ServerState._tag})`);
	}

	const MountainState = await (await getMountainClient()).connectionState();

	if (MountainState._tag !== "Connected") {
		FloorFailures.push(
			`Mountain connection not established (state=${MountainState._tag})`,
		);
	}

	if (FloorFailures.length > 0) {
		LandFixLog.Warn(
			"Bootstrap",

			`HealthCheck floor failed: ${FloorFailures.join("; ")}`,
		);
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

const makeBootstrap = (): BootstrapService => ({
	run: async (options?: BootstrapOptions): Promise<BootstrapResult> => {
		const startTime = Date.now();

		const { skipHealthCheck = false } = options ?? {};

		const stages: Array<[string, () => Promise<StageResult>]> = [
			["Environment", stage1_Environment],
			["Configuration", stage2_Configuration],
			["RPCServer", stage5_RPCServer],
			["ModuleInterceptor", stage4_ModuleInterceptor],
			["MountainConnection", stage3_MountainConnection],
			["Extensions", stage6_Extensions],
			...(skipHealthCheck
				? []
				: [
						["HealthCheck", stage7_HealthCheck] as [
							string,

							() => Promise<StageResult>,
						],
					]),
		];

		const results: StageResult[] = [];

		for (const [StageName, stageFn] of stages) {
			const stageStart = Date.now();

			try {
				const result = await stageFn();

				results.push({ ...result, duration: Date.now() - stageStart });

				process.stdout.write(
					`[LandFix:Bootstrap] Stage "${StageName}" OK in ${Date.now() - stageStart}ms\n`,
				);
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));

				process.stdout.write(
					`[LandFix:Bootstrap] Stage "${StageName}" failed: ${err.message}\n`,
				);

				results.push({
					stageName: StageName,
					success: false,
					duration: Date.now() - stageStart,
					error: err,
				});
			}
		}

		const allSuccess = results.every((r) => r.success);

		return {
			success: allSuccess,
			totalDuration: Date.now() - startTime,
			stages: results,
			error: allSuccess ? undefined : new Error("Bootstrap failed"),
		};
	},
});

// ============================================================================
// EXPORTS
// ============================================================================

export const BootstrapLive = makeBootstrap();

export const runBootstrap = async (
	options?: BootstrapOptions,
): Promise<BootstrapResult> => BootstrapLive.run(options);

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
});

export const BootstrapMock = makeMockBootstrap();
