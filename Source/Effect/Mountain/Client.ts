/**
 * @module Effect/MountainClient
 * @description
 * Mountain client service managing the gRPC client for Cocoon → Mountain communication.
 */

import { Context, Effect, Layer, Ref, SubscriptionRef } from "effect";

import { MountainClientService as RealMountainClient } from "../../Services/Mountain/Client/Service.js";
import { TelemetryTag } from "../Telemetry.js";

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

		readonly cause?: unknown,
	) {
		super(message);
	}
}

export class RPCError extends Error {
	readonly _tag = "RPCError";

	readonly method: string;

	constructor(
		readonly method: string,

		override readonly message: string,

		readonly cause?: unknown,
	) {
		super(message);
	}
}

export class DisconnectionError extends Error {
	readonly _tag = "DisconnectionError";

	constructor(
		override readonly message: string,

		readonly cause?: unknown,
	) {
		super(message);
	}
}

// ============================================================================
// MOUNTAIN CLIENT SERVICE INTERFACE
// ============================================================================

export interface MountainClientService {
	/** Connection state */
	readonly connectionState: Effect.Effect<ConnectionState, never>;

	/** State change stream */
	readonly connectionChanges: Effect.Effect<
		ReadonlyArray<ConnectionState>,
		never
	>;

	/** Connect to Mountain */
	readonly connect: (
		config?: ClientConfig,
	) => Effect.Effect<void, ConnectionError>;

	/** Disconnect from Mountain */
	readonly disconnect: Effect.Effect<void, DisconnectionError>;

	/** Execute RPC method */
	readonly rpc: <T>(
		method: string,
	) => (params?: Record<string, unknown>) => Effect.Effect<T, RPCError>;

	/** Get Mountain version */
	readonly version: Effect.Effect<string, ConnectionError>;

	/** Health check */
	readonly healthCheck: Effect.Effect<boolean, never>;

	/** Client metrics */
	readonly getMetrics: Effect.Effect<ClientMetrics, never>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export class MountainClientTag extends Context.Tag("Cocoon/MountainClient")<
	MountainClientTag,
	MountainClientService
>() {}

export const MountainClient = MountainClientTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export const MountainClientLive = Layer.effect(
	MountainClient,

	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;

		// Reactive connection state ref
		const stateRef = yield* SubscriptionRef.make<ConnectionState>({
			_tag: "Disconnected",
		});

		// Real gRPC client
		let realClient: RealMountainClient | undefined;

		// Client config
		let currentConfig: ClientConfig | undefined;

		// Mutable tracking
		let metrics: {
			totalRequests: number;

			successfulRequests: number;

			failedRequests: number;

			averageLatency: number;

			lastRequestTime: number;
		} = {
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
		const connect = (config?: ClientConfig) =>
			Effect.gen(function* () {
				// Already connected? short-circuit
				const currentState = yield* stateRef.get;

				if (currentState._tag === "Connected") {
					telemetry.log(
						"warn",

						"[MountainClient] Already connected to Mountain",
					);

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
				);

				// State: Connecting
				yield* Ref.set(stateRef, {
					_tag: "Connecting",
					attempt: 1,
				});

				// Connect real client
				try {
					realClient = new RealMountainClient();

					(realClient as any).mountainHost = currentConfig.host;

					(realClient as any).mountainPort = currentConfig.port;

					yield* Effect.promise(() => realClient!.connect());

					serverVersion = "1.0.0";
				} catch (error) {
					yield* Ref.set(stateRef, {
						_tag: "Error",
						error: String(error),
					});

					telemetry.log(
						"error",

						`[MountainClient] Failed to connect to Mountain: ${String(error)}`,
					);

					return yield* Effect.fail(
						new ConnectionError(
							"Failed to connect to Mountain backend",

							error,
						),
					);
				}

				// State: Connected
				yield* Ref.set(stateRef, {
					_tag: "Connected",
					serverVersion,
					connectedAt: Date.now(),
				});

				telemetry.log(
					"info",

					`[MountainClient] Connected to Mountain (v${serverVersion})`,
				);
			});

		// Disconnect
		const disconnect = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			// Connected? short-circuit
			if (currentState._tag !== "Connected") {
				telemetry.log(
					"warn",

					"[MountainClient] Not connected to Mountain",
				);

				return;
			}

			// State: Disconnecting
			yield* Ref.set(stateRef, {
				_tag: "Disconnecting",
			});

			telemetry.log(
				"info",

				"[MountainClient] Disconnecting from Mountain...",
			);

			// Disconnect real client
			if (realClient) {
				yield* Effect.promise(() => realClient!.disconnect());

				realClient = undefined;
			}

			// State: Disconnected
			yield* Ref.set(stateRef, {
				_tag: "Disconnected",
			});

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
			);
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* Ref.set(stateRef, {
						_tag: "Error",
						error: String(error),
					});

					telemetry.log(
						"error",

						`[MountainClient] Failed to disconnect: ${String(error)}`,
					);

					return yield* Effect.fail(
						new DisconnectionError("Failed to disconnect", error),
					);
				}),
			),
		);

		// RPC
		const rpc =
			<T>(method: string) =>
			(params?: Record<string, unknown>) =>
				Effect.gen(function* () {
					const requestStartTime = Date.now();

					const currentState = yield* stateRef.get;

					// Connected? short-circuit
					if (currentState._tag !== "Connected") {
						metrics.failedRequests++;

						return yield* Effect.fail(
							new RPCError(method, "Not connected to Mountain"),
						);
					}

					telemetry.log(
						"debug",

						`[MountainClient] RPC call: ${method}`,

						params,
					);

					// Increment metrics
					metrics.totalRequests++;

					// gRPC call
					try {
						if (!realClient) {
							return yield* Effect.fail(
								new RPCError(
									method,

									"Not connected to Mountain",
								),
							);
						}

						const Result = yield* Effect.promise(() =>
							realClient!.sendRequest(method, params),
						);

						const processingTime = Date.now() - requestStartTime;

						// EMA update O(1)
						if (latencyEmaInitialized) {
							latencyEma =
								processingTime * LatencyEmaAlpha +
								latencyEma * (1 - LatencyEmaAlpha);
						} else {
							latencyEma = processingTime;

							latencyEmaInitialized = true;
						}

						metrics.averageLatency = latencyEma;

						metrics.lastRequestTime = Date.now();

						metrics.successfulRequests++;

						telemetry.log(
							"debug",

							`[MountainClient] RPC success: ${method} (${processingTime}ms)`,
						);

						return Result as T;
					} catch (error) {
						metrics.failedRequests++;

						telemetry.log(
							"error",

							`[MountainClient] RPC failed: ${method} (${String(error)})`,
						);

						return yield* Effect.fail(
							new RPCError(
								method,

								`RPC call failed: ${String(error)}`,

								error,
							),
						);
					}
				});

		// Version
		const version = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			if (currentState._tag !== "Connected") {
				return yield* Effect.fail(
					new ConnectionError("Not connected to Mountain"),
				);
			}

			return currentState.serverVersion;
		});

		// Health check: Connected state + gRPC round-trip (stat `/`). Transport failure → Error → auto-reconnect. App errors are healthy.
		const HealthCheckTimeoutMs = 1_000;

		const healthCheck = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			if (currentState._tag !== "Connected") return false;

			if (!realClient) return false;

			const Outcome = yield* Effect.promise(() =>
				Promise.race([
					realClient!
						.sendRequest("FileSystem.Stat", ["/"])
						.then(() => ({ Kind: "ok" as const }))
						.catch((Err: unknown) => ({
							Kind: "app-error" as const,
							Message:
								Err instanceof Error
									? Err.message
									: String(Err),
						})),

					new Promise<{ Kind: "timeout" }>((Resolve) =>
						setTimeout(
							() => Resolve({ Kind: "timeout" as const }),

							HealthCheckTimeoutMs,
						),
					),
				]),
			);

			if (Outcome.Kind === "timeout") {
				yield* Ref.set(stateRef, {
					_tag: "Error",
					error: `Health check timed out after ${HealthCheckTimeoutMs}ms`,
				});

				telemetry.log(
					"warn",

					`[MountainClient] Health check timed out; marking connection as Error state for auto-reconnect`,
				);

				return false;
			}

			if (Outcome.Kind === "app-error") {
				// Transport vs app error: server replied → stay Connected
				const LooksLikeTransport =
					/UNAVAILABLE|transport|disconnect|ECONNREFUSED|ECONNRESET|NOT_FOUND service/i.test(
						Outcome.Message,
					);

				if (LooksLikeTransport) {
					yield* Ref.set(stateRef, {
						_tag: "Error",
						error: Outcome.Message,
					});

					telemetry.log(
						"warn",

						`[MountainClient] Health check hit transport failure (${Outcome.Message}); marking Error state`,
					);

					return false;
				}
			}

			return true;
		});

		// Get metrics
		const getMetrics = Effect.succeed({ ...metrics } as ClientMetrics);

		return {
			connectionState: stateRef.get,
			connectionChanges: Effect.map(stateRef.get, (state) => [state]),
			connect,
			disconnect,
			rpc,
			version,
			healthCheck,
			getMetrics,
		} satisfies MountainClientService;
	}),
);

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
		connectionState: Effect.succeed(mockState),

		connectionChanges: Effect.succeed([mockState]),

		connect: () => Effect.succeed(undefined),

		disconnect: () => Effect.succeed(undefined),

		rpc:
			<T>(method: string) =>
			(params?: Record<string, unknown>) =>
				Effect.succeed({
					success: true,
					data: { method, params, mock: true },
				} as T),

		version: Effect.succeed("1.0.0"),

		healthCheck: Effect.succeed(true),

		getMetrics: Effect.succeed({
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageLatency: 0,
			lastRequestTime: 0,
		}),
	};
};

export const MountainClientMock = Layer.effect(
	MountainClient,

	Effect.succeed(makeMockMountainClient()),
);
