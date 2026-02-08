/**
 * @module Effect/RPCServer
 * @description
 * Atomic gRPC server service for Cocoon Extension Host using Effect-TS.
 * Manages the gRPC server for Mountain ← Cocoon communication.
 */

import { Context, Effect, Layer, Schedule, SubscriptionRef } from "effect";
import { TelemetryTag } from "./Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

export type ServerState =
	| { readonly _tag: "Idle" }
	| { readonly _tag: "Starting"; readonly startTime: number }
	| { readonly _tag: "Running"; readonly address: string; readonly port: number; readonly startedAt: number }
	| { readonly _tag: "Stopping" }
	| { readonly _tag: "Stopped" }
	| { readonly _tag: "Error"; readonly error: string };

export interface ServerConfig {
	readonly host: string;
	readonly port: number;
	readonly maxConnections?: number;
	readonly enableCompression?: boolean;
	readonly enableTls?: boolean;
	readonly tlsCertPath?: string;
	readonly tlsKeyPath?: string;
}

export interface ServerMetrics {
	readonly uptime: number;
	readonly connections: number;
	readonly requestsHandled: number;
	readonly errors: number;
	readonly averageLatency: number;
}

export interface RPCRequest {
	readonly method: string;
	readonly params: Readonly<Record<string, unknown>>;
	readonly requestId: string;
	readonly timestamp: number;
}

export interface RPCResponse {
	readonly requestId: string;
	readonly success: boolean;
	readonly data: unknown;
	readonly error?: string;
	readonly timestamp: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ServerStartError extends Error {
	readonly _tag = "ServerStartError";
	constructor(
		override readonly message: string,
		readonly cause?: unknown,
	) {
		super(message);
	}
}

export class ServerStopError extends Error {
	readonly _tag = "ServerStopError";
	constructor(
		override readonly message: string,
		readonly cause?: unknown,
	) {
		super(message);
	}
}

export class ServerNotRunningError extends Error {
	readonly _tag = "ServerNotRunningError";
	constructor() {
		super("Server is not running");
	}
}

// ============================================================================
// RPC SERVER SERVICE INTERFACE
// ============================================================================

export interface RPCServerService {
	/** Current server state */
	readonly state: Effect.Effect<ServerState, never>;

	/** Stream of state changes */
	readonly stateChanges: Effect.Effect<Read{
onlyArray<ServerState>, never>;

	/** Start the gRPC server */
	readonly start: (config?: ServerConfig) => Effect.Effect<void, ServerStartError>;

	/** Stop the gRPC server */
	readonly stop: Effect.Effect<void, ServerStopError | ServerNotRunningError>;

	/** Handle an RPC request */
	readonly handleRequest: (request: RPCRequest) => Effect.Effect<RPCResponse, never>;

	/** Get server metrics */
	readonly getMetrics: Effect.Effect<ServerMetrics, ServerNotRunningError>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export class RPCServerTag extends Context.Tag("Cocoon/RPCServer")<
	RPCServerTag,
	RPCServerService
>() {}

export const RPCServer = RPCServerTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export const RPCServerLive = Layer.effect(
	RPCServer,
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;

		// Server state as reactive ref
		const stateRef = yield* SubscriptionRef.make<ServerState>({
			_tag: "Idle",
		});

		// Server config
		let currentConfig: ServerConfig | undefined;

		// Metrics
		let metrics: ServerMetrics = {
			uptime: 0,
			connections: 0,
			requestsHandled: 0,
			errors: 0,
			averageLatency: 0,
		};

		// Start time for uptime calculation
		let startTime = 0;

		// Latency tracking
		const latencies: number[] = [];

		// Atom: Start server
		const start = (config?: ServerConfig) =>
			Effect.gen(function* () {
				const startTimeMs = Date.now();

				// Check if already running
				const currentState = yield* stateRef.get;
				if (currentState._tag === "Running") {
					telemetry.log("warn", "[RPCServer] Server already running");
					return;
				}

				// Set config
				currentConfig = config ?? {
					host: "0.0.0.0",
					port: 50051,
					maxConnections: 100,
					enableCompression: true,
					enableTls: false,
				};

				// Update state to starting
				yield* stateRef.set({
					_tag: "Starting",
					startTime: startTimeMs,
				});

				telemetry.log("info", `[RPCServer] Starting server on ${currentConfig.host}:${currentConfig.port}...`);

				// Simulate server startup (in production, this would create gRPC server)
				yield* Effect.sleep("50 millis");

				try {
					// Initialize metrics
					startTime = Date.now();
					metrics = {
						uptime: 0,
						connections: 0,
						requestsHandled: 0,
						errors: 0,
						averageLatency: 0,
					};

					// Update state to running
					yield* stateRef.set({
						_tag: "Running",
						address: currentConfig.host,
						port: currentConfig.port,
						startedAt: startTime,
					});

					telemetry.log(
						"info",
						`[RPCServer] Server started successfully on ${currentConfig.host}:${currentConfig.port}`,
					);
				} catch (error) {
					yield* stateRef.set({
						_tag: "Error",
						error: String(error),
					});

					telemetry.log("error", `[RPCServer] Failed to start server: ${String(error)}`);

					return yield* Effect.fail(
						new ServerStartError("Failed to start gRPC server", error),
					);
				}
			});

		// Atom: Stop server
		const stop = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			// Check if running
			if (currentState._tag !== "Running") {
				telemetry.log("warn", "[RPCServer] Server is not running");
				return yield* Effect.fail(new ServerNotRunningError());
			}

			// Update state to stopping
			yield* stateRef.set({
				_tag: "Stopping",
			});

			telemetry.log("info", "[RPCServer] Stopping server...");

			// Simulate server shutdown (in production, this would gracefully shutdown gRPC server)
			yield* Effect.sleep("25 millis");

			// Update state to stopped
			yield* stateRef.set({
				_tag: "Stopped",
			});

			telemetry.log("info", "[RPCServer] Server stopped successfully");
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* stateRef.set({
						_tag: "Error",
						error: String(error),
					});

					telemetry.log("error", `[RPCServer] Failed to stop server: ${String(error)}`);

					return yield* Effect.fail(new ServerStopError("Failed to stop gRPC server", error));
				}),
			),
		);

		// Atom: Handle request
		const handleRequest = (request: RPCRequest) =>
			Effect.gen(function* () {
				const requestStartTime = Date.now();
				const currentState = yield* stateRef.get;

				// Check if server is running
				if (currentState._tag !== "Running") {
					return {
						requestId: request.requestId,
						success: false,
						data: null,
						error: "Server not running",
						timestamp: Date.now(),
					} satisfies RPCResponse;
				}

				telemetry.log(
					"debug",
					`[RPCServer] Handling request: ${request.method} (${request.requestId})`,
				);

				// Simulate request handling (in production, this would route to actual RPC handlers)
				metrics.requestsHandled++;

				// Simulate processing time
				yield* Effect.sleep("5 millis");

				const processingTime = Date.now() - requestStartTime;

				// Update latency tracking
				latencies.push(processingTime);
				if (latencies.length > 100) {
					latencies.shift();
				}
				metrics.averageLatency =
					latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

				telemetry.log(
					"debug",
					`[RPCServer] Request completed: ${request.method} (${processingTime}ms)`,
				);

				// Return mock response (in production, this would call actual handler)
				return {
					requestId: request.requestId,
					success: true,
					data: {
						method: request.method,
						result: "ok",
					},
					timestamp: Date.now(),
				} satisfies RPCResponse;
			}).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						metrics.errors++;

						telemetry.log(
							"error",
							`[RPCServer] Request failed: ${request.method} (${error})`,
						);

						return {
							requestId: request.requestId,
							success: false,
							data: null,
							error: String(error),
							timestamp: Date.now(),
						} satisfies RPCResponse;
					}),
				),
			);

		// Atom: Get metrics
		const getMetrics = Effect.gen(function* () {
			const currentState = yield* stateRef.get;

			if (currentState._tag !== "Running") {
				return yield* Effect.fail(new ServerNotRunningError());
			}

			// Update uptime
			metrics.uptime = Date.now() - startTime;

			return { ...metrics };
		});

		return {
			state: stateRef.get,
			stateChanges: Effect.map(stateRef.get, (state) => [state]),
			start,
			stop,
			handleRequest,
			getMetrics,
		} satisfies RPCServerService;
	}),
);

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockRPCServer = (): RPCServerService => {
	const mockStateRef: ServerState = { _tag: "Idle" };

	return {
		state: Effect.succeed(mockStateRef),
		stateChanges: Effect.succeed([mockStateRef]),
		start: () => Effect.succeed(undefined),
		stop: () => Effect.succeed(undefined),
		handleRequest: (request: RPCRequest) =>
			Effect.succeed({
				requestId: request.requestId,
				success: true,
				data: { method: request.method, result: "mock" },
				timestamp: Date.now(),
			}),
		getMetrics: () =>
			Effect.succeed({
				uptime: 0,{
				connections: 0,
				requestsHandled: 0,
				errors: 0,
				averageLatency: 0,
			}),
	};
};

export const RPCServerMock = Layer.effect(
	RPCServer,
	Effect.succeed(makeMockRPCServer()),
);
