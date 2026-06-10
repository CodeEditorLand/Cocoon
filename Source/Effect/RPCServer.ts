/**
 * @module Effect/RPCServer
 * @description
 * Atomic gRPC server service for Cocoon Extension Host.
 * Manages the gRPC server for Mountain ← Cocoon communication.
 */

import { CocoonDevLog } from "../Services/Dev/Log.js";
import { GRPCServerService } from "../Services/gRPC/Server/Service.js";
import { TelemetryLive } from "./Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

export type ServerState =
	| { readonly _tag: "Idle" }
	| { readonly _tag: "Starting"; readonly startTime: number }
	| {
			readonly _tag: "Running";

			readonly address: string;

			readonly port: number;

			readonly startedAt: number;
	  }
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
	getState(): ServerState;

	/** All recorded state transitions */
	getStateHistory(): ReadonlyArray<ServerState>;

	/** Start the gRPC server */
	start(config?: ServerConfig): Promise<void>;

	/** Stop the gRPC server */
	stop(): Promise<void>;

	/** Handle an RPC request */
	handleRequest(request: RPCRequest): Promise<RPCResponse>;

	/** Get server metrics */
	getMetrics(): ServerMetrics;
}

// ============================================================================
// SERVICE TAG (plain singleton descriptor)
// ============================================================================

export const RPCServer = { _tag: "Cocoon/RPCServer" } as const;

// Keep legacy alias so callers that imported RPCServerTag still resolve.
export const RPCServerTag = RPCServer;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

function makeRPCServer(): RPCServerService {
	const telemetry = TelemetryLive;

	let state: ServerState = { _tag: "Idle" };

	const stateHistory: ServerState[] = [state];

	let grpcServer: GRPCServerService | undefined;

	let currentConfig: ServerConfig | undefined;

	let metrics = {
		uptime: 0,

		connections: 0,

		requestsHandled: 0,

		errors: 0,

		averageLatency: 0,
	};

	let serverStartTime = 0;

	const latencies: number[] = [];

	function setState(next: ServerState): void {
		state = next;

		stateHistory.push(next);
	}

	const start = async (config?: ServerConfig): Promise<void> => {
		const startTimeMs = Date.now();

		if (state._tag === "Running") {
			telemetry.log("warn", "[RPCServer] Server already running");

			return;
		}

		// Mountain sets COCOON_GRPC_PORT when spawning Cocoon.
		// Must NOT be 50051 (Mountain's own gRPC server).
		const CocoonPort = parseInt(
			process.env["COCOON_GRPC_PORT"] || "50052",

			10,
		);

		currentConfig = config ?? {
			host: "0.0.0.0",

			port: CocoonPort,

			maxConnections: 100,

			enableCompression: true,

			enableTls: false,
		};

		setState({ _tag: "Starting", startTime: startTimeMs });

		CocoonDevLog(
			"grpc",

			`[RPCServer] Starting REAL gRPC server on ${currentConfig.host}:${currentConfig.port}...`,
		);

		telemetry.log(
			"info",

			`[RPCServer] Starting REAL gRPC server on ${currentConfig.host}:${currentConfig.port}...`,
		);

		try {
			grpcServer = new GRPCServerService();

			// Set port from config (GRPCServerService defaults to 50052)
			(grpcServer as any).port = currentConfig.port;

			await grpcServer.start();

			serverStartTime = Date.now();

			metrics = {
				uptime: 0,

				connections: 0,

				requestsHandled: 0,

				errors: 0,

				averageLatency: 0,
			};

			setState({
				_tag: "Running",
				address: currentConfig.host,
				port: currentConfig.port,
				startedAt: serverStartTime,
			});

			telemetry.log(
				"info",

				`[RPCServer] gRPC server started on ${currentConfig.host}:${currentConfig.port}`,
			);
		} catch (error) {
			setState({ _tag: "Error", error: String(error) });

			telemetry.log(
				"error",

				`[RPCServer] Failed to start gRPC server: ${String(error)}`,
			);

			throw new ServerStartError("Failed to start gRPC server", error);
		}
	};

	const stop = async (): Promise<void> => {
		if (state._tag !== "Running") {
			telemetry.log("warn", "[RPCServer] Server is not running");

			throw new ServerNotRunningError();
		}

		setState({ _tag: "Stopping" });

		telemetry.log("info", "[RPCServer] Stopping gRPC server...");

		if (grpcServer) {
			await grpcServer.stop();

			grpcServer = undefined;
		}

		setState({ _tag: "Stopped" });

		telemetry.log("info", "[RPCServer] Server stopped successfully");
	};

	const handleRequest = async (request: RPCRequest): Promise<RPCResponse> => {
		const requestStartTime = Date.now();

		if (state._tag !== "Running") {
			return {
				requestId: request.requestId,

				success: false,

				data: null,

				error: "Server not running",

				timestamp: Date.now(),
			};
		}

		telemetry.log(
			"debug",

			`[RPCServer] Handling request: ${request.method} (${request.requestId})`,
		);

		try {
			// Simulate request handling (in production, this routes to actual RPC handlers)
			metrics.requestsHandled = metrics.requestsHandled + 1;

			// Simulate processing time
			await new Promise<void>((r) => setTimeout(r, 5));

			const processingTime = Date.now() - requestStartTime;

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

			// Return mock response (in production, this calls actual handler)
			return {
				requestId: request.requestId,

				success: true,

				data: { method: request.method, result: "ok" },

				timestamp: Date.now(),
			};
		} catch (error) {
			metrics.errors = metrics.errors + 1;

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
			};
		}
	};

	const getMetrics = (): ServerMetrics => {
		if (state._tag !== "Running") {
			throw new ServerNotRunningError();
		}

		metrics.uptime = Date.now() - serverStartTime;

		return { ...metrics };
	};

	return {
		getState: () => state,

		getStateHistory: () => stateHistory as ReadonlyArray<ServerState>,

		start,

		stop,

		handleRequest,

		getMetrics,
	};
}

// Singleton instance
export const RPCServerLive: RPCServerService = makeRPCServer();

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockRPCServer = (): RPCServerService => {
	let mockState: ServerState = { _tag: "Idle" };

	const mockHistory: ServerState[] = [mockState];

	return {
		getState: () => mockState,

		getStateHistory: () => mockHistory as ReadonlyArray<ServerState>,

		start: async (_config?: ServerConfig): Promise<void> => {
			mockState = {
				_tag: "Running",

				address: "0.0.0.0",

				port: 50052,

				startedAt: Date.now(),
			};

			mockHistory.push(mockState);
		},

		stop: async (): Promise<void> => {
			mockState = { _tag: "Stopped" };

			mockHistory.push(mockState);
		},

		handleRequest: async (request: RPCRequest): Promise<RPCResponse> => ({
			requestId: request.requestId,
			success: true,
			data: { method: request.method, result: "mock" },
			timestamp: Date.now(),
		}),

		getMetrics: (): ServerMetrics => ({
			uptime: 0,
			connections: 0,
			requestsHandled: 0,
			errors: 0,
			averageLatency: 0,
		}),
	};
};

export const RPCServerMock: RPCServerService = makeMockRPCServer();
