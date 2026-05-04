/**
 * @module Effect/MountainClient
 * @description
 * Atomic Mountain client service for Cocoon Extension Host using Effect-TS.
 * Manages the gRPC client for Cocoon → Mountain communication.
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
	/** Current connection state */
	readonly connectionState: Effect.Effect<ConnectionState, never>;

	/** Stream of connection state changes */
	readonly connectionChanges: Effect.Effect<
		ReadonlyArray<ConnectionState>,
		never
	>;

	/** Connect to Mountain backend */
	readonly connect: (
		config?: ClientConfig,
	) => Effect.Effect<void, ConnectionError>;

	/** Disconnect from Mountain backend */
	readonly disconnect: Effect.Effect<void, DisconnectionError>;

	/** Execute RPC method */
	readonly rpc: <T>(
		method: string,
	) => (params?: Record<string, unknown>) => Effect.Effect<T, RPCError>;

	/** Get Mountain version */
	readonly version: Effect.Effect<string, ConnectionError>;

	/** Health check */
	readonly healthCheck: Effect.Effect<boolean, never>;

	/** Get client metrics */
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

		// Connection state as reactive ref
		const stateRef = yield* SubscriptionRef.make<ConnectionState>({
			_tag: "Disconnected",
		});

		// Real gRPC client (from MountainClientService)
		let realClient: RealMountainClient | undefined;

		// Client config
		let currentConfig: ClientConfig | undefined;

		// Metrics - use mutable let for tracking
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

		// Latency tracking
		const latencies: number[] = [];

		// Server version
		let serverVersion = "";

		// Atom: Connect to Mountain
		const connect = (config?: ClientConfig) =>
			Effect.gen(function* () {
				// Check if already connected
				const currentState = yield* stateRef.get;
				if (currentState._tag === "Connected") {
					telemetry.log(
						"warn",
						"[MountainClient] Already connected to Mountain",
					);
					return;
				}

				// Set config
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

				// Update state to connecting
				yield* Ref.set(stateRef, {
					_tag: "Connecting",
					attempt: 1,
				});

				// Connect real gRPC client to Mountain
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

				// Update state to connected
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

		// Atom: Disconnect from Mountain
		const disconnect = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			// Check if connected
			if (currentState._tag !== "Connected") {
				telemetry.log(
					"warn",
					"[MountainClient] Not connected to Mountain",
				);
				return;
			}

			// Update state to disconnecting
			yield* Ref.set(stateRef, {
				_tag: "Disconnecting",
			});

			telemetry.log(
				"info",
				"[MountainClient] Disconnecting from Mountain...",
			);

			// Disconnect real gRPC client
			if (realClient) {
				yield* Effect.promise(() => realClient!.disconnect());
				realClient = undefined;
			}

			// Update state to disconnected
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
			latencies.length = 0;

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

		// Atom: Execute RPC method
		const rpc =
			<T>(method: string) =>
			(params?: Record<string, unknown>) =>
				Effect.gen(function* () {
					const requestStartTime = Date.now();
					const currentState = yield* stateRef.get;

					// Check if connected
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

					// Update metrics
					metrics.totalRequests++;

					// Real gRPC call via MountainClientService
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
						latencies.push(processingTime);
						if (latencies.length > 100) latencies.shift();
						metrics.averageLatency =
							latencies.reduce((sum, lat) => sum + lat, 0) /
							latencies.length;
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

		// Atom: Get Mountain version
		const version = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			if (currentState._tag !== "Connected") {
				return yield* Effect.fail(
					new ConnectionError("Not connected to Mountain"),
				);
			}

			return currentState.serverVersion;
		});

		// Atom: Health check - fast local-state check followed by a real gRPC
		// round-trip against `FileSystem.Stat` (cheap, always routed). A
		// healthy connection must (a) be in the Connected state locally and
		// (b) respond to a stat of `/` within the timeout. A transport
		// failure flips the state to Error so the next request triggers
		// auto-reconnect; an application-level error (file missing etc.) is
		// still treated as healthy because it proves the server responds.
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
				// Distinguish transport failure from an application error. The
				// server is clearly responsive (it replied) - stay Connected.
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

		// Atom: Get metrics
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
