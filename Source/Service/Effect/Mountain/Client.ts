/**
 * @module Effect/MountainClient
 * @description
 * Mountain client service managing the gRPC client for Cocoon → Mountain communication.
 */

import { MountainClientService as RealMountainClient } from "../../Services/Mountain/Client/Service.js";

import { TelemetryLive } from "../Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionState =
	| { readonly _tag: "Disconnected" }

	| { readonly _tag: "Connecting"; readonly attempt: number }

	| {

			readonly _tag: "Connected";

			readonly serverVersion: string;

			readonly connectedAt: number;
	  }

	| { readonly _tag: "Disconnecting" }

	| { readonly _tag: "Error"; readonly error: string };

export interface ClientConfig {

	readonly host: string;

	readonly port: number;

	readonly timeout?: number;

	readonly maxRetries?: number;

	readonly retryDelay?: number;

	readonly enableCompression?: boolean;

	readonly enableMetrics?: boolean;
}

export interface ClientMetrics {

	readonly totalRequests: number;

	readonly successfulRequests: number;

	readonly failedRequests: number;

	readonly averageLatency: number;

	readonly lastRequestTime: number;
}

export interface RPCResponse<T = unknown> {

	readonly success: boolean;

	readonly data: T;

	readonly error?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ConnectionError extends Error {

	readonly _tag = "ConnectionError";

	constructor(
		override readonly message: string,

		override readonly cause?: unknown,
	) {
		super(message;
	}
}

export class RPCError extends Error {
	readonly _tag = "RPCError";

	constructor(
		readonly method: string,

		override readonly message: string,

		override readonly cause?: unknown,
	) {
		super(message;
	}
}

export class DisconnectionError extends Error {
	readonly _tag = "DisconnectionError";

	constructor(
		override readonly message: string,

		override readonly cause?: unknown,
	) {
		super(message;
	}
}

// ============================================================================
// MOUNTAIN CLIENT SERVICE INTERFACE
// ============================================================================

export interface MountainClientService {
	/** Connection state */
	readonly connectionState: () => Promise<ConnectionState>;

	/** State change stream */
	readonly connectionChanges: () => Promise<ReadonlyArray<ConnectionState>>;

	/** Connect to Mountain */
	readonly connect: (config?: ClientConfig) => Promise<void>;

	/** Disconnect from Mountain */
	readonly disconnect: () => Promise<void>;

	/** Execute RPC method */
	readonly rpc: <T>(
		method: string,
	) => (params?: Record<string, unknown>) => Promise<T>;

	/** Get Mountain version */
	readonly version: () => Promise<string>;

	/** Health check */
	readonly healthCheck: () => Promise<boolean>;

	/** Client metrics */
	readonly getMetrics: () => Promise<ClientMetrics>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export const MountainClientTag = { _tag: "Cocoon/MountainClient" } as const;

export const MountainClient = MountainClientTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

async function makeMountainClientLive(): Promise<MountainClientService> {
	const telemetry = TelemetryLive;

	// Reactive connection state
	let state: ConnectionState = { _tag: "Disconnected" };

	// Real gRPC client
	let realClient: RealMountainClient | undefined;

	// Client config
	let currentConfig: ClientConfig | undefined;

	// Mutable tracking
	let metrics = {
		totalRequests: 0,

		successfulRequests: 0,

		failedRequests: 0,

		averageLatency: 0,

		lastRequestTime: 0,
	};

	// EMA for latency: O(1) per request, no array ops. Alpha=0.1 ≈ 10-sample window.
	const LatencyEmaAlpha = 0.1;

	let latencyEma = 0;

	let latencyEmaInitialized = false;

	// Server version
	let serverVersion = "";

	// Connect
	const connect = async (config?: ClientConfig): Promise<void> => {
		// Already connected? short-circuit
		if (state._tag === "Connected") {
			telemetry.log(
				"warn",

				"[MountainClient] Already connected to Mountain",
			;

			return;
		}

		// Build config
		currentConfig = config ?? {
			host: "localhost",

			port: 50052,

			timeout: 5000,

			maxRetries: 3,

			retryDelay: 1000,

			enableCompression: true,

			enableMetrics: true,
		};

		telemetry.log(
			"info",

			`[MountainClient] Connecting to Mountain at ${currentConfig.host}:${currentConfig.port}...`,
		;

		// State: Connecting
		state = { _tag: "Connecting", attempt: 1 };

		// Connect real client
		try {
			realClient = new RealMountainClient(;

			(realClient as any).mountainHost = currentConfig.host;

			(realClient as any).mountainPort = currentConfig.port;

			await realClient.connect(;

			serverVersion = "1.0.0";
		} catch (error) {
			state = { _tag: "Error", error: String(error) };

			telemetry.log(
				"error",

				`[MountainClient] Failed to connect to Mountain: ${String(error)}`,
			;

			throw new ConnectionError(
				"Failed to connect to Mountain backend",

				error,
			;
		}

		// State: Connected
		state = { _tag: "Connected", serverVersion, connectedAt: Date.now() };

		telemetry.log(
			"info",

			`[MountainClient] Connected to Mountain (v${serverVersion})`,
		;
	};

	// Disconnect
	const disconnect = async (): Promise<void> => {
		try {
			// Not connected? short-circuit
			if (state._tag !== "Connected") {
				telemetry.log(
					"warn",

					"[MountainClient] Not connected to Mountain",
				;

				return;
			}

			// State: Disconnecting
			state = { _tag: "Disconnecting" };

			telemetry.log(
				"info",

				"[MountainClient] Disconnecting from Mountain...",
			;

			// Disconnect real client
			if (realClient) {
				await realClient.disconnect(;

				realClient = undefined;
			}

			// State: Disconnected
			state = { _tag: "Disconnected" };

			// Reset metrics
			metrics = {
				totalRequests: 0,

				successfulRequests: 0,

				failedRequests: 0,

				averageLatency: 0,

				lastRequestTime: 0,
			};

			// Reset EMA
			latencyEma = 0;

			latencyEmaInitialized = false;

			telemetry.log(
				"info",

				"[MountainClient] Disconnected from Mountain",
			;
		} catch (error) {
			state = { _tag: "Error", error: String(error) };

			telemetry.log(
				"error",

				`[MountainClient] Failed to disconnect: ${String(error)}`,
			;

			throw new DisconnectionError("Failed to disconnect", error;
		}
	};

	// RPC
	const rpc =
		<T>(method: string) =>
		async (params?: Record<string, unknown>): Promise<T> => {
			const requestStartTime = Date.now(;

			// Connected? short-circuit
			if (state._tag !== "Connected") {
				metrics.failedRequests++;

				throw new RPCError(method, "Not connected to Mountain";
			}

			telemetry.log(
				"debug",

				`[MountainClient] RPC call: ${method}`,

				params,
			;

			// Increment metrics
			metrics.totalRequests++;

			// gRPC call
			try {
				if (!realClient) {
					throw new RPCError(method, "Not connected to Mountain";
				}

				const Result = await realClient.sendRequest(method, params;

				const processingTime = Date.now() - requestStartTime;

				// EMA update O(1)
				if (latencyEmaInitialized) {
					latencyEma =
						processingTime * LatencyEmaAlpha +
						latencyEma * (1 - LatencyEmaAlpha;
				} else {
					latencyEma = processingTime;

					latencyEmaInitialized = true;
				}

				metrics.averageLatency = latencyEma;

				metrics.lastRequestTime = Date.now(;

				metrics.successfulRequests++;

				telemetry.log(
					"debug",

					`[MountainClient] RPC success: ${method} (${processingTime}ms)`,
				;

				return Result as T;
			} catch (error) {
				metrics.failedRequests++;

				telemetry.log(
					"error",

					`[MountainClient] RPC failed: ${method} (${String(error)})`,
				;

				if (error instanceof RPCError) throw error;

				throw new RPCError(
					method,

					`RPC call failed: ${String(error)}`,

					error,
				;
			}
		};

	// Version
	const version = async (): Promise<string> => {
		if (state._tag !== "Connected") {
			throw new ConnectionError("Not connected to Mountain";
		}

		return state.serverVersion;
	};

	// Health check: Connected state + gRPC round-trip (stat `/`). Transport failure → Error → auto-reconnect. App errors are healthy.
	const HealthCheckTimeoutMs = 1_000;

	const healthCheck = async (): Promise<boolean> => {
		if (state._tag !== "Connected") return false;

		if (!realClient) return false;

		const Outcome = await Promise.race([
			realClient
				.sendRequest("FileSystem.Stat", ["/"])
				.then(() => ({ Kind: "ok" as const }))
				.catch((Err: unknown) => ({
					Kind: "app-error" as const,
					Message: Err instanceof Error ? Err.message : String(Err),
				})),

			new Promise<{ Kind: "timeout" }>((Resolve) =>
				setTimeout(
					() => Resolve({ Kind: "timeout" as const }),

					HealthCheckTimeoutMs,
				),
			),
		];

		if (Outcome.Kind === "timeout") {
			state = {
				_tag: "Error",

				error: `Health check timed out after ${HealthCheckTimeoutMs}ms`,
			};

			telemetry.log(
				"warn",

				`[MountainClient] Health check timed out; marking connection as Error state for auto-reconnect`,
			;

			return false;
		}

		if (Outcome.Kind === "app-error") {
			// Transport vs app error: server replied → stay Connected
			const LooksLikeTransport =
				/UNAVAILABLE|transport|disconnect|ECONNREFUSED|ECONNRESET|NOT_FOUND service/i.test(
					Outcome.Message,
				;

			if (LooksLikeTransport) {
				state = { _tag: "Error", error: Outcome.Message };

				telemetry.log(
					"warn",

					`[MountainClient] Health check hit transport failure (${Outcome.Message}); marking Error state`,
				;

				return false;
			}
		}

		return true;
	};

	// Get metrics
	const getMetrics = async (): Promise<ClientMetrics> => ({ ...metrics };

	return {
		connectionState: async () => state,

		connectionChanges: async () => [state],

		connect,

		disconnect,

		rpc,

		version,

		healthCheck,

		getMetrics,
	} satisfies MountainClientService;
}

// Singleton instance
let _instance: MountainClientService | undefined;

export async function getMountainClient(): Promise<MountainClientService> {
	if (!_instance) {
		_instance = await makeMountainClientLive(;
	}

	return _instance;
}

export const MountainClientLive = getMountainClient;

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockMountainClient = (): MountainClientService => {
	const mockState: ConnectionState = {
		_tag: "Connected",

		serverVersion: "1.0.0",

		connectedAt: Date.now(),
	};

	return {
		connectionState: async () => mockState,

		connectionChanges: async () => [mockState],

		connect: async () => undefined,

		disconnect: async () => undefined,

		rpc:
			<T>(method: string) =>
			async (params?: Record<string, unknown>) =>
				({
					success: true,
					data: { method, params, mock: true },
				}) as T,

		version: async () => "1.0.0",

		healthCheck: async () => true,

		getMetrics: async () => ({
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageLatency: 0,
			lastRequestTime: 0,
		}),
	};
};

export const MountainClientMock: MountainClientService =
	makeMockMountainClient(;
