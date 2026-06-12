/**
 * @module MountainClientService
 * @description
 * Cocoon's outbound gRPC client to Mountain's `MountainService`, default
 * `localhost:50051` (overridable via `MOUNTAIN_CONNECTION_HOST` /
 * `MOUNTAIN_GRPC_PORT`).
 *
 * Connection contract:
 * - `waitForConnection` polls channel connectivity every 100ms with a 3s
 *   timeout (fast fail for bootstrap); `TRANSIENT_FAILURE` / `SHUTDOWN`
 *   reject immediately.
 * - Health monitoring runs every 30s (`MOUNTAIN_HEALTH_CHECK_PERIOD`) and
 *   checks channel connectivity only - Mountain has no `health.check` RPC -
 *   waiting up to 3s for the channel to reach `READY`.
 *
 * Request contract:
 * - Request ids come from a monotonic in-process counter
 *   (`generateRequestId`), sent as `uint64 RequestIdentifier`; parameters
 *   are JSON-serialized into the `Parameter` bytes field.
 * - `SendRequestWithRetry` issues callback-style `ProcessCocoonRequest`
 *   calls, up to `maxRetries` attempts (default 3, `MOUNTAIN_MAX_RETRIES`).
 *   Only transient errors retry (`UNAVAILABLE`, `DEADLINE_EXCEEDED`,
 *   `INTERNAL`, `RESOURCE_EXHAUSTED`, socket-level connection errors);
 *   backoff is `1000ms * 2^attempt` plus 10% jitter, capped at 10s.
 *   Non-transient errors throw immediately.
 *
 * Error contract:
 * - A `GenericResponse.error` (`RPCError { Code, Message, Data }`) rethrows
 *   as `Error("Mountain request failed: <Message>")` with `.code` and
 *   `.data` attached.
 * - The circuit breaker opens after 5 failures, recovers via half-open
 *   after 60s, and closes after 3 successes. Benign failures never feed
 *   it: `FileSystem.ReadFile/Stat/ReadDirectory` not-founds (Code `-32004`
 *   or a not-found message), `FileWatcher.Register` on a missing path,
 *   `Command.Execute` on an unregistered command, and `Unknown method:`
 *   routing misses. Unknown-method misses always log (code bug, not
 *   transport failure); all benign cases still reject the caller's
 *   Promise.
 *
 * Protocol: /Element/Mountain/Proto/Vine.proto
 * Generated Types: /Element/Cocoon/Source/Generated/Vine.ts
 */

import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect, Layer } from "effect";
import { v4 as uuidv4 } from "uuid";

import { IMountainClientService } from "../../../Interfaces/I/Mountain/Client/Service.js";
import { CocoonDevLog } from "../../Dev/Log.js";
import {
	CancelOperationRequest,
	Empty,
	GenericNotification,
	GenericRequest,
	GenericResponse,
	MountainServiceClient,
	RPCError,
} from "../Generated/Vine";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

/**
 * Circuit breaker state
 */
enum CircuitBreakerState {
	Closed = "CLOSED", // Normal operation

	Open = "OPEN", // Reject all requests

	HalfOpen = "HALF_OPEN", // Allow limited requests to test recovery
}

/**
 * Connection state
 */
enum ConnectionState {
	Disconnected = "DISCONNECTED",

	Connecting = "CONNECTING",

	Connected = "CONNECTED",

	Degraded = "DEGRADED",

	Failed = "FAILED",
}

/**
 * Cancellation token for VS Code compatibility. `onCancellationRequested`
 * follows the vscode.CancellationToken event shape: call it with a listener,
 * optionally receive a disposable back.
 */
interface CancellationToken {
	readonly isCancellationRequested: boolean;

	onCancellationRequested?: (
		Listener: () => void,
	) => { dispose(): void } | void;
}

/**
 * MountainClientService - gRPC client with circuit breaker, health monitoring,
 * and retry logic for Mountain integration.
 */
export class MountainClientService implements IMountainClientService {
	readonly _serviceBrand: undefined;

	// Core gRPC state
	private client: MountainServiceClient | null = null;

	private channel: grpc.Client | null = null;

	private mountainHost: string = "localhost";

	private mountainPort: number = 50051; // Default Mountain gRPC port

	private connectionState: ConnectionState = ConnectionState.Disconnected;

	private connectionStartTime: number = 0;

	private errorCount: number = 0;

	private requestCounter: number = 0;

	private activeRequests: Map<bigint, { method: string; startTime: number }> =
		new Map();

	// Circuit breaker
	private circuitBreakerState: CircuitBreakerState =
		CircuitBreakerState.Closed;

	private circuitBreakerFailureCount: number = 0;

	private circuitBreakerSuccessCount: number = 0;

	private readonly circuitBreakerThreshold: number = 5;

	private readonly circuitBreakerSuccessThreshold: number = 3;

	private readonly circuitBreakerTimeout: number = 60000; // 60s recovery timeout

	private circuitBreakerOpenTime: number = 0;

	private circuitBreakerHalfOpenAttempts: number = 0;

	// Retry config with exponential backoff
	private readonly maxRetries: number = 3;

	private readonly baseRetryDelay: number = 1000;

	private readonly maxRetryDelay: number = 10000;

	private readonly retryJitterFactor: number = 0.2;

	// Health monitoring
	private healthCheckInterval: NodeJS.Timeout | null = null;

	private readonly healthCheckPeriod: number = 30000;

	private lastHealthCheck: number = 0;

	private consecutiveSuccessfulHealthChecks: number = 0;

	private healthCheckFailures: number = 0;

	private lastHealthCheckError: Error | null = null;

	// Performance metrics
	private totalRequests: number = 0;

	private totalFailures: number = 0;

	private totalSuccesses: number = 0;

	private averageResponseTime: number = 0;

	private maxResponseTime: number = 0;

	private minResponseTime: number = Infinity;

	// Connection metadata
	private clientVersion: string = "1.0.0";

	private clientId: string = uuidv4();

	private sessionId: string = uuidv4();

	constructor() {
		this._serviceBrand = undefined;

		CocoonDevLog(
			"mountain-client",

			`[MountainClientService] Initializing Mountain gRPC client (ID: ${this.clientId})`,
		);

		this.parseEnvironment();

		CocoonDevLog(
			"mountain-client",

			`[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}, Session: ${this.sessionId}`,
		);

		this.registerShutdownHandlers();
	}

	/**
	 * Parse environment variables
	 */
	private parseEnvironment(): void {
		const mountainHost =
			process.env.MOUNTAIN_CONNECTION_HOST || "localhost";

		const mountainPort = process.env.MOUNTAIN_GRPC_PORT || "50051";

		const connectionTimeout =
			process.env.MOUNTAIN_CONNECTION_TIMEOUT || "30000";

		const maxRetries = process.env.MOUNTAIN_MAX_RETRIES || "3";

		const enableTLS = process.env.MOUNTAIN_ENABLE_TLS || "false";

		const healthCheckPeriod =
			process.env.MOUNTAIN_HEALTH_CHECK_PERIOD || "30000";

		this.mountainHost = mountainHost;

		this.mountainPort = parseInt(mountainPort, 10);

		if (maxRetries) {
			this.maxRetries = parseInt(maxRetries, 10);
		}

		if (healthCheckPeriod) {
			this.healthCheckPeriod = parseInt(healthCheckPeriod, 10);
		}

		CocoonDevLog(
			"mountain-client",

			`[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}, MAX_RETRIES=${this.maxRetries}`,
		);

		// Validate configuration
		if (!this.isValidHost(this.mountainHost)) {
			throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
		}

		if (this.mountainPort < 1 || this.mountainPort > 65535) {
			throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
		}

		if (this.maxRetries < 0 || this.maxRetries > 10) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Invalid max retries: ${this.maxRetries}, using default: 3`,
			);

			this.maxRetries = 3;
		}

		if (this.healthCheckPeriod < 5000 || this.healthCheckPeriod > 120000) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Invalid health check period: ${this.healthCheckPeriod}ms, using default: 30000ms`,
			);

			this.healthCheckPeriod = 30000;
		}
	}

	/**
	 * Validate host configuration
	 */
	private isValidHost(host: string): boolean {
		if (!host || host.trim().length === 0) {
			return false;
		}

		const validHostPatterns = [
			/^localhost$/, // localhost

			/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IPv4

			/^\[[0-9a-fA-F:]+\]$/, // IPv6 (bracketed)

			/^[0-9a-fA-F:]+$/, // IPv6 (unbracketed)

			/^[a-zA-Z0-9.-]+$/, // Domain name

			/^[a-zA-Z0-9_-]+$/, // Simple hostname

			/^unix:[\/\\].+$/, // Unix domain socket
		];

		return validHostPatterns.some((pattern) => pattern.test(host));
	}

	/**
	 * Register shutdown handlers
	 */
	private registerShutdownHandlers(): void {
		process.on("SIGTERM", () => {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Received SIGTERM, shutting down gracefully",
			);

			this.disconnect().catch((error) => {
				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Graceful shutdown failed:",

					error,
				);
			});
		});

		process.on("SIGINT", () => {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Received SIGINT, shutting down gracefully",
			);

			this.disconnect().catch((error) => {
				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Graceful shutdown failed:",

					error,
				);
			});
		});

		// Handle VS Code extension shutdown
		if (
			typeof process !== "undefined" &&
			process.env &&
			process.env.VSCODE_PID
		) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Running in VS Code extension context",
			);
		}
	}

	/**
	 * Connect to Mountain gRPC server
	 */
	async connect(): Promise<void> {
		this.CheckCircuitBreaker();

		if (
			this.connectionState === ConnectionState.Connected ||
			this.connectionState === ConnectionState.Connecting
		) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Already ${this.connectionState.toLowerCase()} to Mountain`,
			);

			return;
		}

		CocoonDevLog(
			"mountain-client",

			`[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort} (Session: ${this.sessionId})`,
		);

		this.connectionState = ConnectionState.Connecting;

		try {
			// Load protocol definition
			const packageDefinition = await this.loadProtocolDefinition();

			const protoDescriptor = grpc.loadPackageDefinition(
				packageDefinition,
			) as any;

			// Create gRPC client with comprehensive configuration
			const target = `${this.mountainHost}:${this.mountainPort}`;

			// Use proper gRPC channel configuration for VS Code extension compatibility
			const channelOptions: grpc.ChannelOptions = {
				"grpc.max_receive_message_length": 1024 * 1024 * 100, // 100MB max message size

				"grpc.max_send_message_length": 1024 * 1024 * 100, // 100MB max message size

				"grpc.keepalive_time_ms": 10000, // 10s keepalive ping

				"grpc.keepalive_timeout_ms": 5000, // 5s keepalive timeout

				"grpc.keepalive_permit_without_calls": 1, // Allow keepalive without calls

				"grpc.http2.max_pings_without_data": 0, // No pings without data

				"grpc.http2.min_time_between_pings_ms": 10000, // 10s min between pings

				"grpc.http2.min_ping_interval_without_data_ms": 30000, // 30s min ping interval

				"grpc.enable_retries": 1, // Enable gRPC built-in retries

				"grpc.max_retry_attempts": 3, // Max retry attempts

				"grpc.initial_reconnect_backoff_ms": 1000, // Initial reconnect backoff

				"grpc.max_reconnect_backoff_ms": 30000, // Max reconnect backoff

				"grpc.enable_channelz": 0, // Disable channelz for perf
			};

			this.client = new (
				protoDescriptor.Vine?.MountainService ||
				protoDescriptor.MountainService
			)(
				target,

				grpc.credentials.createInsecure(),

				channelOptions,
			) as unknown as MountainServiceClient;

			// Wait for connection to be established with proper timeout
			await this.waitForConnection();

			this.connectionState = ConnectionState.Connected;

			this.connectionStartTime = Date.now();

			this.errorCount = 0;

			this.consecutiveSuccessfulHealthChecks = 0;

			this.healthCheckFailures = 0;

			// Start comprehensive health monitoring
			this.startHealthMonitoring();

			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Successfully connected to Mountain (Session: ${this.sessionId})`,
			);

			// Update circuit breaker on successful connection
			this.UpdateCircuitBreaker(true);
		} catch (error) {
			this.connectionState = ConnectionState.Failed;

			this.errorCount++;

			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Failed to connect to Mountain:`,

				error,
			);

			// Update circuit breaker state with detailed error information
			this.UpdateCircuitBreaker(false, error);

			throw new Error(
				`Failed to connect to Mountain: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Load protocol definition with fallback strategies
	 */
	private async loadProtocolDefinition(): Promise<protoLoader.PackageDefinition> {
		CocoonDevLog(
			"mountain-client",

			"[MountainClientService] Loading Vine.proto protocol definition",
		);

		try {
			const fs = require("fs");

			const path = require("path");

			// Search multiple paths for Mountain's Proto directory.
			// Cocoon source/bundle lives at Land/Element/Cocoon/{Source,Target}/Services/.
			// From __dirname, ../../../../Mountain/... lands in Land/Element/Mountain/.
			// From cwd=Land/, Element/Mountain/... is correct.
			// From cwd=Land/Element/Cocoon/, ../Mountain/... is correct.
			// Never re-add an "Element/" prefix after going up past Land/Element/ -
			// that produces a bogus Land/Element/Element/Mountain/... path.
			const SearchPaths = [
				path.resolve(
					__dirname,

					"../../../../Mountain/Proto/Vine.proto",
				),

				path.resolve(
					process.cwd(),

					"Element/Mountain/Proto/Vine.proto",
				),

				path.resolve(process.cwd(), "../Mountain/Proto/Vine.proto"),
			];

			let vineProtoPath: string | null = null;

			for (const P of SearchPaths) {
				if (fs.existsSync(P)) {
					vineProtoPath = P;

					break;
				}
			}

			if (vineProtoPath) {
				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Found Vine.proto at: ${vineProtoPath}`,
				);

				// Load with comprehensive options matching Vine.proto specification
				return protoLoader.loadSync(vineProtoPath, {
					keepCase: true, // Preserve field names
					longs: String, // Use String for uint64 compatibility
					enums: String, // Use String for enum compatibility
					defaults: true, // Include default values
					oneofs: true, // Support oneof fields
					includeDirs: [path.dirname(vineProtoPath)], // Include proto directory
					arrays: true, // Support repeated fields
					objects: true, // Support message objects
					bytes: Buffer, // Use Buffer for bytes fields
				});
			} else {
				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Vine.proto not found at:",

					vineProtoPath,
				);

				// Fallback to inline protocol definition exactly matching the actual Vine.proto
				const fallbackProtoContent = `syntax = "proto3";

package Vine;

service MountainService {

    rpc ProcessCocoonRequest(GenericRequest) returns (GenericResponse);

    rpc SendCocoonNotification(GenericNotification) returns (Empty);

    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

service CocoonService {

    rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);

    rpc SendMountainNotification(GenericNotification) returns (Empty);

    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

message GenericRequest {

    uint64 RequestIdentifier = 1;

    string Method = 2;

    bytes Parameter = 3;
}

message GenericResponse {

    uint64 RequestIdentifier = 1;

    bytes Result = 2;

    optional RPCError error = 3;
}

message GenericNotification {

    string Method = 1;

    bytes Parameter = 2;
}

message RPCError {

    int32 Code = 1;

    string Message = 2;

    bytes Data = 3;
}

message CancelOperationRequest {

    uint64 RequestIdentifierToCancel = 1;
}

message Empty {}

message RPCDataPayload {

    bytes Data = 1;
}`;

				// Create temporary file with proper permissions
				const tempDir = require("os").tmpdir();

				const tempProtoPath = path.join(tempDir, "vine_fallback.proto");

				fs.writeFileSync(tempProtoPath, fallbackProtoContent);

				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Using fallback protocol at: ${tempProtoPath}`,
				);

				return protoLoader.loadSync(tempProtoPath, {
					keepCase: true,
					longs: String,
					enums: String,
					defaults: true,
					oneofs: true,
					arrays: true,
					objects: true,
					bytes: Buffer,
				});
			}
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Failed to load protocol definition:",

				error,
			);

			throw new Error(
				`Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Wait for connection with timeout
	 */
	private waitForConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.client) {
				reject(new Error("Client not initialized"));

				return;
			}

			// Use gRPC's built-in channel state monitoring
			const startTime = Date.now();

			const timeout = 3000; // 3 second connection timeout (fast fail for bootstrap)

			const checkConnection = () => {
				const channel = (this.client as any).getChannel();

				if (channel) {
					// Pass true to trigger connection attempt (false just returns IDLE without connecting)
					const state = channel.getConnectivityState(true);

					if (state === grpc.connectivityState.READY) {
						CocoonDevLog(
							"mountain-client",

							"[MountainClientService] Connection established and ready",
						);

						resolve();

						return;
					} else if (
						state === grpc.connectivityState.TRANSIENT_FAILURE ||
						state === grpc.connectivityState.SHUTDOWN
					) {
						reject(
							new Error(
								`Connection failed with state: ${grpc.connectivityState[state]}`,
							),
						);

						return;
					}
				}

				if (Date.now() - startTime > timeout) {
					reject(new Error("Connection timeout exceeded"));

					return;
				}

				// Check again after short delay
				setTimeout(checkConnection, 100);
			};

			// Start checking connection state
			setTimeout(checkConnection, 100);
		});
	}

	/**
	 * Send request to Mountain with circuit breaker and retry logic
	 */
	async sendRequest(
		method: string,

		parameters: any,

		cancellationToken?: CancellationToken,
	): Promise<any> {
		// Check circuit breaker state before proceeding
		this.CheckCircuitBreaker();

		// Validate connection state
		if (
			this.connectionState !== ConnectionState.Connected ||
			!this.client
		) {
			throw new Error("Not connected to Mountain");
		}

		const requestIdentifier = this.generateRequestId();

		const startTime = Date.now();

		// Track active request for cancellation support
		this.activeRequests.set(BigInt(requestIdentifier), {
			method,
			startTime,
		});

		// Propagate caller-side cancellation to Mountain: the wire
		// RequestIdentifier set on this GenericRequest is the same key
		// Mountain's process_cocoon_request registers in ActiveOperations,
		// so MountainService.CancelOperation aborts the in-flight dispatch.
		// Best-effort - failures to deliver the cancel are swallowed.
		let CancelSubscription: { dispose(): void } | undefined;

		if (typeof cancellationToken?.onCancellationRequested === "function") {
			const Subscription = cancellationToken.onCancellationRequested(
				() => {
					void this.cancelOperation(
						requestIdentifier,

						`CancellationToken fired for ${method}`,
					).catch(() => {});
				},
			);

			if (Subscription && typeof Subscription.dispose === "function") {
				CancelSubscription = Subscription;
			}
		}

		// Request send-log is also per-call spam (FileSystem.ReadFile alone
		// fires 14k+ times during svelte/extension activation). Gate behind
		// `grpc-verbose`. Failures / cancellations still log unconditionally
		// via the existing catch / timeout paths.
		if (
			typeof process !== "undefined" &&
			typeof process.env["Trace"] === "string" &&
			process.env["Trace"].includes("grpc-verbose")
		) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`,
			);
		}

		try {
			// Check for cancellation before making the request
			if (cancellationToken?.isCancellationRequested) {
				throw new Error("Request cancelled before execution");
			}

			// Create request matching Vine.proto structure with proper serialization
			const request: GenericRequest = {
				RequestIdentifier: BigInt(requestIdentifier),

				Method: method,

				Parameter: this.SerializeParameters(parameters),
			};

			// BATCH-16 latency instrumentation: monotonic ns stamp at the
			// wire-send boundary. Mountain logs matching stamps on receive
			// and on final registration; diffing surfaces whether the
			// 700 ms observed in debug-electron boots is spent in gRPC
			// transport, Track dispatch, or inside the provider body.
			// Scoped to tree.register and gated under `tree-latency` so
			// regular runs don't print one line per tree view.
			if (
				method === "tree.register" &&
				typeof process !== "undefined" &&
				process.env["Trace"]?.includes("tree-latency")
			) {
				try {
					const Timestamp = process.hrtime.bigint().toString();

					const Correlation =
						(parameters?.[0] as { viewId?: string } | undefined)
							?.viewId ?? `req-${requestIdentifier}`;

					process.stdout.write(
						`[LandFix:Tree] wire-send method=${method} correlation=${Correlation} t=${Timestamp}\n`,
					);
				} catch {}
			}

			// Execute with comprehensive retry logic and cancellation support
			const response = await this.SendRequestWithRetry(
				request,

				cancellationToken,
			);

			const duration = Date.now() - startTime;

			// Check for error in response with proper RPC error handling
			if (response.error) {
				const rpcError = response.error;

				// Benign 404s on FileSystem.* reads (missing first-run cache
				// files, optional config probes, etc.) MUST NOT count against
				// the circuit breaker. Otherwise a handful of expected
				// not-founds at startup trips the breaker open and blocks
				// every downstream read for 60s - cascading unhandled
				// rejections in extensions that then treat "circuit open" as
				// a fatal I/O error.
				const RpcMessage = String(rpcError.Message ?? "");

				const RpcCode = Number(rpcError.Code ?? 0);

				const IsFileSystemMethod =
					method === "FileSystem.ReadFile" ||
					method === "FileSystem.Stat" ||
					method === "FileSystem.ReadDirectory";

				// FileWatcher.Register on a path that doesn't exist yet
				// (extension probing for an optional config dir) is a normal
				// case in stock VS Code; the watch silently no-ops until the
				// dir appears. Counting it against the breaker trips it
				// during boot.
				const IsFileWatcherBenign =
					method === "FileWatcher.Register" &&
					/no path was found|no such file or directory|entity not found|path not found|os error 2|enoent/i.test(
						RpcMessage,
					);

				// Mountain stamps -32004 for benign 404s; the regex is a
				// belt-and-suspenders fallback for older Mountain builds.
				const IsBenignNotFound =
					(IsFileSystemMethod &&
						(RpcCode === -32004 ||
							/resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
								RpcMessage,
							))) ||
					IsFileWatcherBenign;

				if (!IsBenignNotFound) {
					this.UpdateCircuitBreaker(
						false,

						new Error(
							`RPC Error: ${rpcError.Message} (Code: ${rpcError.Code})`,
						),
					);
				}

				// Create structured error for better error handling
				const error = new Error(
					`Mountain request failed: ${rpcError.Message}`,
				);

				(error as any).code = rpcError.Code;

				(error as any).data = rpcError.Data
					? this.DeserializeResponse(rpcError.Data)
					: undefined;

				throw error;
			}

			// Parse response data from Result field with validation
			const responseData = this.DeserializeResponse(response.Result);

			// Success completion is per-call and FileSystem.ReadFile alone
			// fires 14k+ times in a long session. Gate the success line
			// behind `Trace=grpc-verbose`; errors / timeouts still
			// log unconditionally via the catch block below.
			if (
				typeof process !== "undefined" &&
				typeof process.env["Trace"] === "string" &&
				process.env["Trace"].includes("grpc-verbose")
			) {
				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Request ${method} completed successfully in ${duration}ms`,
				);
			}

			// Track comprehensive performance metrics
			this.trackRequestMetrics(method, duration, true);

			// Update circuit breaker on success
			this.UpdateCircuitBreaker(true);

			return responseData;
		} catch (error) {
			const duration = Date.now() - startTime;

			this.errorCount++;

			// Benign 404s on `FileSystem.*` reads are very common - every
			// extension that probes for an optional cache file (terminal-
			// suggest, json-language-features schema associations, …) hits
			// this path. Downgrade to `info` so the error log stays focused
			// on genuine failures. The downstream `readFile` shim converts
			// the throw into `vscode.FileSystemError.FileNotFound` and
			// extensions handle it via their own try/catch.
			//
			// Crucially, these benign 404s MUST NOT count against the
			// circuit breaker. Counting them trips the breaker open after
			// 6-8 startup probes and blocks every subsequent read for 60s,
			// cascading into extension-activation failures (redhat.vscode-
			// yaml, terminal-suggest, schemas-associations).
			const ErrorMessage =
				error instanceof Error ? error.message : String(error);

			const ErrorCode = Number(
				(error as { code?: number | string } | null)?.code ?? 0,
			);

			const IsCatchBenignFsMethod =
				method === "FileSystem.ReadFile" ||
				method === "FileSystem.Stat" ||
				method === "FileSystem.ReadDirectory";

			const IsCatchBenignFileWatcher =
				method === "FileWatcher.Register" &&
				/no path was found|no such file or directory|entity not found|path not found|os error 2|enoent/i.test(
					ErrorMessage,
				);

			const IsBenignNotFound =
				(IsCatchBenignFsMethod &&
					(ErrorCode === -32004 ||
						/resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
							ErrorMessage,
						))) ||
				IsCatchBenignFileWatcher;

			// `Command.Execute` rejections for extension-registered commands
			// that were never registered are equally benign - the
			// `CommandsNamespace.executeCommand` catch converts them to
			// `undefined`, matching extensions' expectations for optional
			// cross-extension dependencies (Shopify.ruby-lsp probing
			// `getTelemetrySenderObject`, TypeScript plugin probing
			// `_typescript.configurePlugin`, roo-cline probing its own
			// `activationCompleted`, etc.). Counting these against the
			// breaker would trip it and block real commands.
			const IsBenignMissingCommand =
				method === "Command.Execute" &&
				/Command '[^']+' not found/i.test(ErrorMessage);

			// `Unknown method: <name>` is a routing-level mismatch, not a
			// transport failure. Mountain is alive and answering; it just
			// doesn't recognise the method name. Counting these against the
			// breaker means a single Cocoon→Mountain name drift (e.g.
			// `storage:getItems` vs `Storage.GetItems`) trips the breaker
			// after 3 calls and then blocks every other extension's
			// legitimate requests for 60s. Treat as benign so real
			// transport failures (timeouts, connection drops) are the only
			// thing that opens the circuit. The error still surfaces to
			// the caller via the rejected Promise.
			const IsBenignUnknownMethod = /Unknown method:/i.test(ErrorMessage);

			// Benign-404 and benign-missing-command both fire per-call
			// (65+ hits per session from extensions probing for optional
			// files / cross-extension commands). The fact that they're
			// benign is now settled; gate behind `mountain-client-verbose`
			// so the default log stays clean. Real failures take the
			// `else` branch and log unconditionally.
			const TraceMountainClient = process.env["Trace"]?.includes(
				"mountain-client-verbose",
			);

			if (IsBenignNotFound) {
				if (TraceMountainClient) {
					process.stdout.write(
						`[LandFix:MountainClient] ${method} 404 after ${duration}ms (benign) - ${ErrorMessage}\n`,
					);
				}
			} else if (IsBenignMissingCommand) {
				if (TraceMountainClient) {
					process.stdout.write(
						`[LandFix:MountainClient] ${method} missing-command after ${duration}ms (benign) - ${ErrorMessage}\n`,
					);
				}
			} else if (IsBenignUnknownMethod) {
				// Surface unknown-method drift loudly (always log) but do
				// not feed the circuit breaker - the route mismatch is a
				// code bug, not a transport failure.
				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] ${method} routing miss after ${duration}ms (Mountain has no handler): ${ErrorMessage}`,
				);
			} else {
				this.UpdateCircuitBreaker(false, error);

				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Request ${method} failed after ${duration}ms:`,

					error,
				);
			}

			// Handle cancellation specifically
			if (cancellationToken?.isCancellationRequested) {
				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Request ${requestIdentifier} was cancelled`,
				);

				throw new Error(`Request ${requestIdentifier} was cancelled`);
			}

			// Auto-reconnect on connection errors with exponential backoff
			if (this.isConnectionError(error)) {
				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Connection error detected, attempting auto-reconnect",
				);

				try {
					await this.reconnect();

					CocoonDevLog(
						"mountain-client",

						"[MountainClientService] Auto-reconnect successful, retrying request",
					);

					return this.sendRequest(
						method,

						parameters,

						cancellationToken,
					);
				} catch (reconnectError) {
					CocoonDevLog(
						"mountain-client",

						"[MountainClientService] Auto-reconnect failed:",

						reconnectError,
					);
				}
			}

			throw error;
		} finally {
			// Clean up request tracking
			this.activeRequests.delete(BigInt(requestIdentifier));

			CancelSubscription?.dispose();
		}
	}

	/**
	 * Track request metrics
	 */
	private trackRequestMetrics(
		method: string,

		duration: number,

		success: boolean,
	): void {
		this.totalRequests++;

		if (success) {
			this.totalSuccesses++;
		} else {
			this.totalFailures++;
		}

		// Update response time statistics
		this.averageResponseTime =
			(this.averageResponseTime * (this.totalRequests - 1) + duration) /
			this.totalRequests;

		this.maxResponseTime = Math.max(this.maxResponseTime, duration);

		this.minResponseTime = Math.min(this.minResponseTime, duration);

		// Metrics line fires once per completed request - 14k+ hits in
		// long sessions alongside the completion banner above. Gate
		// behind `grpc-verbose`; the aggregate metrics (avg/max/min
		// response time) still accumulate on `this.*` so in-memory
		// diagnostics via a debug command still see them.
		if (
			typeof process !== "undefined" &&
			typeof process.env["Trace"] === "string" &&
			process.env["Trace"].includes("grpc-verbose")
		) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`,
			);
		}

		// TODO: FUTURE: Integrate with PerformanceMonitoringService for distributed tracing
		// Specification: MOUNTAIN-MONITORING.md (Metrics Integration)
		// Implementation: Push metrics to centralized monitoring system using OpenTelemetry
		// Dependencies: PerformanceMonitoringService, telemetry pipeline
		// Validation: Verify metrics appear in monitoring dashboard within 30 seconds
		// Error Handling: Graceful degradation if monitoring service is unavailable
		// Security: Ensure no sensitive data is included in telemetry

		// TODO: FUTURE: Add request/response size tracking for bandwidth monitoring
		// TODO: FUTURE: Implement request rate limiting and quota management
		// TODO: FUTURE: Add support for custom metrics tags and dimensions
		// TODO: FUTURE: Integrate with VS Code's built-in telemetry system
	}

	/**
	 * Check if error is a connection error
	 */
	private isConnectionError(error: any): boolean {
		if (!error) return false;

		const connectionErrorPatterns = [
			// gRPC error codes
			error.code === "UNAVAILABLE",

			error.code === "DEADLINE_EXCEEDED",

			error.code === "CANCELLED",

			error.code === "UNKNOWN",

			// Numeric gRPC error codes
			error.code === 14, // UNAVAILABLE

			error.code === 4, // DEADLINE_EXCEEDED

			error.code === 1, // CANCELLED

			error.code === 2, // UNKNOWN

			// Error message patterns
			error.message?.includes("connect"),

			error.message?.includes("connection"),

			error.message?.includes("socket"),

			error.message?.includes("network"),

			error.message?.includes("ECONN"),

			error.message?.includes("ENOTFOUND"),

			error.message?.includes("ETIMEDOUT"),

			error.message?.includes("refused"),

			error.message?.includes("timeout"),

			error.message?.includes("channel"),

			// Node.js error codes
			error.code === "ECONNREFUSED",

			error.code === "ECONNRESET",

			error.code === "ETIMEDOUT",

			error.code === "ENOTFOUND",
		];

		return connectionErrorPatterns.some((pattern) => pattern === true);
	}

	/**
	 * Send request with exponential backoff retry
	 */
	private async SendRequestWithRetry(
		request: GenericRequest,
	): Promise<GenericResponse> {
		if (!this.client) {
			throw new Error("Client not initialized");
		}

		let lastError: Error | null = null;

		for (let attempt = 0; attempt < this.maxRetries; attempt++) {
			try {
				// @grpc/grpc-js proto-loaded clients use callback style, not promises
				const response = await new Promise<GenericResponse>(
					(resolve, reject) => {
						this.client!.ProcessCocoonRequest(
							request,

							(error: any, response: any) => {
								if (error) reject(error);
								else resolve(response);
							},
						);
					},
				);

				return response;
			} catch (error) {
				lastError = error as Error;

				// Don't retry on non-transient errors
				if (!this.isTransientError(error)) {
					throw error;
				}

				if (attempt < this.maxRetries - 1) {
					const delay = this.CalculateRetryDelay(attempt);

					CocoonDevLog(
						"mountain-client",

						`[MountainClientService] Request ${request.RequestIdentifier} failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms:`,

						error,
					);

					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error("Max retry attempts exceeded");
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	private CalculateRetryDelay(attempt: number): number {
		const exponentialDelay = this.baseRetryDelay * Math.pow(2, attempt);

		const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter

		return Math.min(exponentialDelay + jitter, this.maxRetryDelay);
	}

	/**
	 * Check if error is transient and should be retried
	 */
	private isTransientError(error: any): boolean {
		const transientCodes = [
			"UNAVAILABLE",

			"DEADLINE_EXCEEDED",

			"INTERNAL",

			"RESOURCE_EXHAUSTED",
		];

		return (
			error &&
			(transientCodes.includes(error.code) ||
				error.code === 14 || // UNAVAILABLE
				error.code === 4 || // DEADLINE_EXCEEDED
				this.isConnectionError(error))
		);
	}

	/**
	 * Serialize parameters to buffer with validation
	 */
	private SerializeParameters(parameters: any): Buffer {
		try {
			// Validate parameters before serialization
			if (parameters === null || parameters === undefined) {
				return Buffer.from(JSON.stringify({}));
			}

			const serialized = JSON.stringify(parameters);

			return Buffer.from(serialized, "utf8");
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Failed to serialize parameters:",

				error,
			);

			throw new Error(
				`Parameter serialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Deserialize response buffer with error handling
	 */
	private DeserializeResponse(buffer?: Buffer): any {
		try {
			if (!buffer || buffer.length === 0) {
				return {};
			}

			const serialized = buffer.toString("utf8");

			return JSON.parse(serialized);
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Failed to deserialize response:",

				error,
			);

			// Return empty object on deserialization error to avoid breaking the caller
			return {};
		}
	}

	/**
	 * Update circuit breaker state based on operation result
	 */
	private UpdateCircuitBreaker(success: boolean): void {
		if (success) {
			this.circuitBreakerFailureCount = 0;

			// If in half-openstate, transition to closed
			if (this.circuitBreakerState === CircuitBreakerState.HalfOpen) {
				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)",
				);

				CocoonDevLog(
					"breaker",

					`[Breaker] transition from=HalfOpen to=Closed reason=service-recovered`,
				);

				this.circuitBreakerState = CircuitBreakerState.Closed;
			}
		} else {
			// Once Open, in-flight requests can still resolve with errors
			// (their CheckCircuitBreaker happened before the breaker tripped).
			// Don't double-count those - the counter is meant to track
			// "consecutive failures while Closed/HalfOpen" only. Recovery
			// happens via CheckCircuitBreaker's timeout → HalfOpen path,
			// not via more failures piling up here. Without this guard,
			// every in-flight request that completes after trip appends
			// a `[Breaker] transition from=OPEN to=Open failures=N` line
			// to the dev log (seen at N≥19 in the 2026-05-25 panel-debug
			// run) while doing nothing useful.
			if (this.circuitBreakerState === CircuitBreakerState.Open) {
				CocoonDevLog(
					"breaker",

					`[Breaker] in-flight failure while Open - not counted (count stays at ${this.circuitBreakerFailureCount})`,
				);

				return;
			}

			this.circuitBreakerFailureCount++;

			// Open circuit breaker if threshold reached
			if (
				this.circuitBreakerFailureCount >= this.circuitBreakerThreshold
			) {
				const PriorState = this.circuitBreakerState;

				this.circuitBreakerState = CircuitBreakerState.Open;

				this.circuitBreakerOpenTime = Date.now();

				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Circuit breaker OPENED after ${this.circuitBreakerFailureCount} failures`,
				);

				CocoonDevLog(
					"breaker",

					`[Breaker] transition from=${PriorState} to=Open failures=${this.circuitBreakerFailureCount} threshold=${this.circuitBreakerThreshold}`,
				);
			}
		}
	}

	/**
	 * Check circuit breaker state and throw if open
	 */
	private CheckCircuitBreaker(): void {
		if (this.circuitBreakerState === CircuitBreakerState.Open) {
			if (
				Date.now() - this.circuitBreakerOpenTime >=
				this.circuitBreakerTimeout
			) {
				// Transition to half-openstate to attempt recovery
				this.circuitBreakerState = CircuitBreakerState.HalfOpen;

				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery",
				);

				CocoonDevLog(
					"breaker",

					`[Breaker] transition from=Open to=HalfOpen reason=timeout-elapsed`,
				);
			} else {
				throw new Error(
					`Circuit breaker is OPEN. Service unavailable. Time remaining until half-open: ${Math.round((this.circuitBreakerTimeout - (Date.now() - this.circuitBreakerOpenTime)) / 1000)}s`,
				);
			}
		}
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			return; // Already started
		}

		this.lastHealthCheck = Date.now();

		this.healthCheckInterval = setInterval(() => {
			this.performHealthCheck();
		}, this.healthCheckPeriod);

		CocoonDevLog(
			"mountain-client",

			`[MountainClientService] Health monitoring started (interval: ${this.healthCheckPeriod}ms)`,
		);
	}

	/**
	 * Stop health monitoring
	 */
	private stopHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);

			this.healthCheckInterval = null;

			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Health monitoring stopped",
			);
		}
	}

	/**
	 * Perform health check
	 */
	private async performHealthCheck(): Promise<void> {
		this.lastHealthCheck = Date.now();

		try {
			// Check gRPC channel connectivity state instead of sending an RPC
			// (Mountain doesn't implement a health.check handler)
			const channel = (this.client as any)?.getChannel?.();

			if (channel) {
				const state = channel.getConnectivityState(true);

				if (state !== grpc.connectivityState.READY) {
					// Channel isn't ready - wait for up to 3s for it to become READY
					// (getConnectivityState(true) triggers a connection attempt if IDLE
					// but returns immediately; the background handshake takes time)
					await new Promise<void>((resolve, reject) => {
						const deadline = Date.now() + 3000;

						const poll = () => {
							const st = channel.getConnectivityState(false);

							if (st === grpc.connectivityState.READY) {
								resolve();
							} else if (
								st ===
									grpc.connectivityState.TRANSIENT_FAILURE ||
								st === grpc.connectivityState.SHUTDOWN
							) {
								reject(
									new Error(
										`Channel in terminal state: ${grpc.connectivityState[st]}`,
									),
								);
							} else if (Date.now() >= deadline) {
								reject(
									new Error(
										`Channel not ready after 3s (state: ${st})`,
									),
								);
							} else {
								setTimeout(poll, 100);
							}
						};

						setTimeout(poll, 100);
					});
				}
			}

			this.consecutiveSuccessfulHealthChecks++;

			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Health check passed (consecutive successes: ${this.consecutiveSuccessfulHealthChecks})`,
			);

			// Reset circuit breaker on repeated success
			if (
				this.consecutiveSuccessfulHealthChecks >= 3 &&
				this.circuitBreakerState === CircuitBreakerState.HalfOpen
			) {
				this.UpdateCircuitBreaker(true);
			}
		} catch (error) {
			this.consecutiveSuccessfulHealthChecks = 0;

			this.errorCount++;

			this.UpdateCircuitBreaker(false);

			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Health check failed:",

				error,
			);

			// Trigger reconnection if not connected
			if (this.connectionState !== ConnectionState.Connected) {
				CocoonDevLog(
					"mountain-client",

					"[MountainClientService] Connection lost, attempting reconnect",
				);

				this.reconnect().catch((err) => {
					CocoonDevLog(
						"mountain-client",

						"[MountainClientService] Auto-reconnect failed:",

						err,
					);
				});
			}
		}
	}

	/**
	 * Send notification to Mountain
	 */
	async sendNotification(method: string, parameters: any): Promise<void> {
		if (
			this.connectionState !== ConnectionState.Connected ||
			!this.client
		) {
			throw new Error("Not connected to Mountain");
		}

		// Noise control: the send/success pair runs per-notification (e.g.
		// `progress.report` fires hundreds of times during a single
		// activation pass), flooding the log with no diagnostic value
		// unless a notification *fails*. Gate both under
		// `Trace=grpc-verbose` so the quiet path is silent and the
		// noisy path is one env var away. The existing failure `console.error`
		// below stays unconditional.
		const TraceGrpcVerbose =
			typeof process !== "undefined" &&
			typeof process.env["Trace"] === "string" &&
			process.env["Trace"].includes("grpc-verbose");

		if (TraceGrpcVerbose) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Sending notification to Mountain: ${method}`,
			);
		}

		try {
			const notification: GenericNotification = {
				Method: method,

				Parameter: Buffer.from(JSON.stringify(parameters)),
			};

			await this.makeNotification(notification);

			if (TraceGrpcVerbose) {
				CocoonDevLog(
					"mountain-client",

					`[MountainClientService] Notification ${method} sent successfully`,
				);
			}
		} catch (error) {
			this.errorCount++;

			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Notification ${method} failed:`,

				error,
			);

			// Don't throw for notifications (they're fire-and-forget)
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Notification ${method} failed, but continuing (fire-and-forget)`,
			);
		}
	}

	/**
	 * Make gRPC notification with promise interface
	 */
	private async makeNotification(
		notification: GenericNotification,
	): Promise<void> {
		if (!this.client) {
			throw new Error("Client not initialized");
		}

		try {
			// @grpc/grpc-js proto-loaded clients use callback style, not promises
			await new Promise<void>((resolve, reject) => {
				this.client!.SendCocoonNotification(
					notification,

					(error: any) => {
						if (error) reject(error);
						else resolve();
					},
				);
			});
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Cancel operation
	 */
	async cancelOperation(
		requestIdentifier: number,

		reason: string,
	): Promise<void> {
		if (
			this.connectionState !== ConnectionState.Connected ||
			!this.client
		) {
			throw new Error("Not connected to Mountain");
		}

		CocoonDevLog(
			"mountain-client",

			`[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`,
		);

		try {
			const cancelRequest: CancelOperationRequest = {
				RequestIdentifierToCancel: BigInt(requestIdentifier), // Use BigInt for uint64 compatibility
			};

			await this.makeCancelRequest(cancelRequest);

			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Operation ${requestIdentifier} canceled`,
			);
		} catch (error) {
			this.errorCount++;

			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Cancel operation ${requestIdentifier} failed:`,

				error,
			);

			// Don't throw for cancellation failures (best effort)
			CocoonDevLog(
				"mountain-client",

				`[MountainClientService] Cancel operation ${requestIdentifier} failed, but continuing`,
			);
		}
	}

	/**
	 * Make gRPC cancel request with promise interface
	 */
	private async makeCancelRequest(
		cancelRequest: CancelOperationRequest,
	): Promise<void> {
		if (!this.client) {
			throw new Error("Client not initialized");
		}

		try {
			// @grpc/grpc-js proto-loaded clients use callback style, not promises
			await new Promise<void>((resolve, reject) => {
				this.client!.CancelOperation(cancelRequest, (error: any) => {
					if (error) reject(error);
					else resolve();
				});
			});
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Generate unique request identifier
	 */
	private generateRequestId(): number {
		return ++this.requestCounter;
	}

	/**
	 * Disconnect from Mountain
	 */
	async disconnect(): Promise<void> {
		if (
			this.connectionState !== ConnectionState.Connected ||
			!this.client
		) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClientService] Not connected to Mountain (already disconnected)",
			);

			return;
		}

		CocoonDevLog(
			"mountain-client",

			"[MountainClientService] Disconnecting from Mountain",
		);

		// Stop health monitoring
		this.stopHealthMonitoring();

		this.client = null;

		this.connectionState = ConnectionState.Disconnected;

		CocoonDevLog(
			"mountain-client",

			"[MountainClientService] Disconnected from Mountain",
		);
	}

	/**
	 * Reconnect to Mountain
	 */
	async reconnect(): Promise<void> {
		CocoonDevLog(
			"mountain-client",

			"[MountainClientService] Reconnecting to Mountain",
		);

		await this.disconnect();

		await this.connect();

		CocoonDevLog(
			"mountain-client",

			"[MountainClientService] Reconnected to Mountain",
		);
	}

	/**
	 * Get connection status with circuit breaker information
	 */
	getStatus(): {
		connected: boolean;

		mountainHost: string;

		mountainPort: number;

		errorCount: number;

		uptime?: number;

		circuitBreakerState: string;

		circuitBreakerFailureCount: number;

		lastHealthCheck?: Date;
	} {
		const IsConnected = this.connectionState === ConnectionState.Connected;

		return {
			connected: IsConnected,

			mountainHost: this.mountainHost,

			mountainPort: this.mountainPort,

			errorCount: this.errorCount,
			...(IsConnected
				? { uptime: Date.now() - this.connectionStartTime }
				: {}),

			circuitBreakerState: this.circuitBreakerState,

			circuitBreakerFailureCount: this.circuitBreakerFailureCount,
			...(this.lastHealthCheck
				? { lastHealthCheck: new Date(this.lastHealthCheck) }
				: {}),
		};
	}
}

/**
 * Service layer for MountainClientService
 */
export const MountainClientServiceLayer =
	IMountainClientService.Default as Layer.Layer<
		IMountainClientService,
		never,
		never
	>;
