/**
 * @module Effect/MountainClient
 * @description
 * Atomic Mountain client service for Cocoon Extension Host using Effect-TS.
 * Manages the gRPC client for Cocoon → Mountain communication.
 */

import { Context, Effect, Layer, Schedule, SubscriptionRef } from "effect";
import { TelemetryTag } from "./Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionState =
	| { readonly _tag: "Disconnected" }
	| { readonly _tag: "Connecting"; readonly attempt: number }
	| { readonly _tag: "Connected"; readonly serverVersion: string; readonly connectedAt: number }
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
	readonly connectionChanges: Effect.Effect<ReadonlyArray<ConnectionState>, never>;

	/** Connect to Mountain backend */
	readonly connect: (config?: ClientConfig) => Effect.Effect<void, ConnectionError>;

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
	readonly getMetrics: Effect.Effect<ClientMetrics, never>;{
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

		// Client config
		let currentConfig: ClientConfig | undefined;

		// Metrics
		let metrics: ClientMetrics = {
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
					telemetry.log("warn", "[MountainClient] Already connected to Mountain");
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
				yield* stateRef.set({
					_tag: "Connecting",
					attempt: 1,
				});

				// Simulate connection with retries (in production, this would create gRPC client)
				let connected = false;
				let lastError: unknown;

				for (let attempt = 1; attempt <= (currentConfig.maxRetries ?? 3); attempt++) {
					try {
						// Simulate connection delay
						yield* Effect.sleep(`${currentConfig.retryDelay ?? 1000 / (attempt * 2)} millis`);

						// Simulate successful connection
						connected = true;
						serverVersion = "1.0.0";
						break;
					} catch (error) {
						lastError = error;
						telemetry.log(
							"warn",
							`[MountainClient] Connection attempt ${attempt} failed: ${String(error)}`,
						);

						if (attempt < (currentConfig.maxRetries ?? 3)) {
							// Increment attempt number
							yield* stateRef.set({
								_tag: "Connecting",
								attempt: attempt + 1,
							});
						}
					}
				}

				if (!connected) {
					yield* stateRef.set({
						_tag: "Error",
						error: String(lastError),
					});

					telemetry.log("error", `[MountainClient] Failed to connect to Mountain: ${String(lastError)}`);

					return yield* Effect.fail(
						new ConnectionError("Failed to connect to Mountain backend", lastError),
					);
				}

				// Update state to connected
				yield* stateRef.set({
					_tag: "Connected",
					serverVersion,
					connectedAt: Date.now(),
				});

				telemetry.log("info", `[MountainClient] Connected to Mountain (v${serverVersion})`);
			});

		// Atom: Disconnect from Mountain
		const disconnect = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			// Check if connected
			if (currentState._tag !== "Connected") {
				telemetry.log("warn", "[MountainClient] Not connected to Mountain");
				return;
			}

			// Update state to disconnecting
			yield* stateRef.set({
				_tag: "Disconnecting",
			});

			telemetry.log("info", "[MountainClient] Disconnecting from Mountain...");

			// Simulate disconnection (in production, this would close gRPC client)
			yield* Effect.sleep("25 millis");

			// Update state to disconnected
			yield* stateRef.set({
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

			telemetry.log("info", "[MountainClient] Disconnected from Mountain");
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* stateRef.set({
						_tag: "Error",
						error: String(error),
					});

					telemetry.log("error", `[MountainClient] Failed to disconnect: ${String(error)}`);

					return yield* Effect.fail(new DisconnectionError("Failed to disconnect", error));
				}),
			),
		);

		// Atom: Execute RPC method
		const rpc = <T>(method: string) =>
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
					}{
					telemetry.log(
						"debug",
						`[MountainClient] RPC call: ${method}`,
						params,
					);

					// Update metrics
					metrics.totalRequests++;

					// Simulate RPC call (in production, this would make actual gRPC call)
					try {
						// Simulate processing time
						yield* Effect.sleep("10 millis");

						const processingTime = Date.now() - requestStartTime;

						// Update latency tracking
						latencies.push(processingTime);
						if (latencies.length > 100) {
							latencies.shift();
						}
						metrics.averageLatency =
							latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

						metrics.lastRequestTime = Date.now();
						metrics.successfulRequests++;

						telemetry.log(
							"debug",
							`[MountainClient] RPC success: ${method} (${processingTime}ms)`,
						);

						// Return mock response (in production, this would return actual data)
						return {
							success: true,
							data: {
								method,
								params,
								timestamp: Date.now(),
							},
						} as T;
					} catch (error) {
						metrics.failedRequests++;

						telemetry.log(
							"error",
							`[MountainClient] RPC failed: ${method} (${String(error)})`,
						);

						return yield* Effect.fail(
							new RPCError(method, `RPC call failed: ${String(error)}`, error),
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

		// Atom: Health check
		const healthCheck = Effect.gen(function* () {
			const currentState = yield* stateRef.get;
			return currentState._tag === "Connected";
		});

		// Atom: Get metrics
		const getMetrics = Effect.succeed(() => ({ ...metrics }));

		return {
			connectionState: stateRef.get,
			connection{
Changes: Effect.map(stateRef.get, (state) => [state]),
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
	const mockState: ConnectionState = { _tag: "Connected", serverVersion: "1.0.0", connectedAt: Date.now() };

	return {
		connectionState: Effect.succeed(mockState),
		connectionChanges: Effect.succeed([mockState]),
		connect: () => Effect.succeed(undefined),
		disconnect: () => Effect.succeed(undefined),
		rpc: <T>(method: string) =>
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
ENDOFFILE{
