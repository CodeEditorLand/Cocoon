/**
 * @module MountainClientService
 * @description
 * Cocoon's gRPC client implementation for Mountain integration.
 * Provides bidirectional communication with Mountain's gRPC server using the Vine protocol.
 *
 * RESPONSIBILITIES:
 * - Establish and maintain gRPC connection to Mountain backend with proper channel management
 * - Send requests and notifications to Mountain with Vine protocol serialization
 * - Implement comprehensive circuit breaker pattern with exponential backoff retry logic
 * - Monitor connection health with proactive health checks and auto-reconnection
 * - Cancel long-running operations with proper request identifier tracking
 * - Track request/response metrics for observability and performance monitoring
 * - Implement defensive coding practices with comprehensive error handling
 * - Support VS Code extension patterns and cancellation tokens
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client Implementation)
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
import { IMountainClientService } from "../Interfaces/IMountainClientService";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Circuit breaker state for fault tolerance with comprehensive state management
 */
enum CircuitBreakerState {
	Closed = "CLOSED", // Normal operation - requests flow freely
	Open = "OPEN", // Failing - reject all requests immediately
	HalfOpen = "HALF_OPEN", // Testing - allow limited requests to test recovery
}

/**
 * Connection state tracking with detailed status information
 */
enum ConnectionState {
	Disconnected = "DISCONNECTED",
	Connecting = "CONNECTING",
	Connected = "CONNECTED",
	Degraded = "DEGRADED",
	Failed = "FAILED",
}

/**
 * Request cancellation token interface for VS Code compatibility
 */
interface CancellationToken {
	readonly isCancellationRequested: boolean;
	onCancellationRequested?: () => void;
}

/**
 * MountainClientService implementation with comprehensive fault tolerance,
 * health monitoring, and VS Code extension compatibility
 */
export class MountainClientService implements IMountainClientService {
	readonly _serviceBrand: undefined;

	// Core gRPC client and connection state
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

	// Circuit breaker configuration with enhanced tracking
	private circuitBreakerState: CircuitBreakerState =
		CircuitBreakerState.Closed;
	private circuitBreakerFailureCount: number = 0;
	private circuitBreakerSuccessCount: number = 0;
	private readonly circuitBreakerThreshold: number = 5; // Consecutive failures before opening
	private readonly circuitBreakerSuccessThreshold: number = 3; // Consecutive successes to close
	private readonly circuitBreakerTimeout: number = 60000; // 60 seconds recovery timeout
	private circuitBreakerOpenTime: number = 0;
	private circuitBreakerHalfOpenAttempts: number = 0;

	// Retry configuration with exponential backoff and jitter
	private readonly maxRetries: number = 3;
	private readonly baseRetryDelay: number = 1000; // Base delay in milliseconds
	private readonly maxRetryDelay: number = 10000; // Maximum delay in milliseconds
	private readonly retryJitterFactor: number = 0.2; // 20% jitter

	// Health monitoring with comprehensive tracking
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private readonly healthCheckPeriod: number = 30000; // 30 seconds
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

		console.log(
			`[MountainClientService] Initializing Mountain gRPC client (ID: ${this.clientId})`,
		);

		// Parse environment variables with validation
		this.parseEnvironment();

		console.log(
			`[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}, Session: ${this.sessionId}`,
		);

		// Register graceful shutdown handlers
		this.registerShutdownHandlers();
	}

	/**
	 * Parse environment variables with comprehensive configuration validation
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

		// Update retry configuration if provided
		if (maxRetries) {
			this.maxRetries = parseInt(maxRetries, 10);
		}

		// Update health check period if provided
		if (healthCheckPeriod) {
			this.healthCheckPeriod = parseInt(healthCheckPeriod, 10);
		}

		console.log(
			`[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}, MAX_RETRIES=${this.maxRetries}`,
		);

		// Comprehensive configuration validation
		if (!this.isValidHost(this.mountainHost)) {
			throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
		}

		if (this.mountainPort < 1 || this.mountainPort > 65535) {
			throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
		}

		if (this.maxRetries < 0 || this.maxRetries > 10) {
			console.warn(
				`[MountainClientService] Invalid max retries: ${this.maxRetries}, using default: 3`,
			);
			this.maxRetries = 3;
		}

		if (this.healthCheckPeriod < 5000 || this.healthCheckPeriod > 120000) {
			console.warn(
				`[MountainClientService] Invalid health check period: ${this.healthCheckPeriod}ms, using default: 30000ms`,
			);
			this.healthCheckPeriod = 30000;
		}
	}

	/**
	 * Validate host configuration with comprehensive pattern matching
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
	 * Register graceful shutdown handlers for VS Code extension compatibility
	 */
	private registerShutdownHandlers(): void {
		// Handle process termination gracefully
		process.on("SIGTERM", () => {
			console.log(
				"[MountainClientService] Received SIGTERM, shutting down gracefully",
			);
			this.disconnect().catch((error) => {
				console.error(
					"[MountainClientService] Graceful shutdown failed:",
					error,
				);
			});
		});

		process.on("SIGINT", () => {
			console.log(
				"[MountainClientService] Received SIGINT, shutting down gracefully",
			);
			this.disconnect().catch((error) => {
				console.error(
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
			console.log(
				"[MountainClientService] Running in VS Code extension context",
			);
		}
	}

	/**
	 * Connect to Mountain gRPC server with comprehensive circuit breaker protection
	 * and proper gRPC channel management
	 */
	async connect(): Promise<void> {
		// Check circuit breaker state before attempting connection
		this.CheckCircuitBreaker();

		if (
			this.connectionState === ConnectionState.Connected ||
			this.connectionState === ConnectionState.Connecting
		) {
			console.warn(
				`[MountainClientService] Already ${this.connectionState.toLowerCase()} to Mountain`,
			);
			return;
		}

		console.log(
			`[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort} (Session: ${this.sessionId})`,
		);

		this.connectionState = ConnectionState.Connecting;

		try {
			// Load protocol definition with proper error handling
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

			console.log(
				`[MountainClientService] Successfully connected to Mountain (Session: ${this.sessionId})`,
			);

			// Update circuit breaker on successful connection
			this.UpdateCircuitBreaker(true);
		} catch (error) {
			this.connectionState = ConnectionState.Failed;
			this.errorCount++;
			this.circuitBreakerFailureCount++;

			console.error(
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
	 * Load protocol definition with comprehensive error handling and fallback strategies
	 */
	private async loadProtocolDefinition(): Promise<protoLoader.PackageDefinition> {
		console.log(
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
				console.log(
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
				console.warn(
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

				console.log(
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
			console.error(
				"[MountainClientService] Failed to load protocol definition:",
				error,
			);
			throw new Error(
				`Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Wait for connection with comprehensive timeout and readiness checking
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
						console.log(
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
	 * Send request to Mountain with comprehensive circuit breaker, retry logic,
	 * cancellation support, and VS Code extension compatibility
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

		// Request send-log is also per-call spam (FileSystem.ReadFile alone
		// fires 14k+ times during svelte/extension activation). Gate behind
		// `grpc-verbose`. Failures / cancellations still log unconditionally
		// via the existing catch / timeout paths.
		if (
			typeof process !== "undefined" &&
			typeof process.env["Trace"] === "string" &&
			process.env["Trace"].includes("grpc-verbose")
		) {
			console.log(
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
					this.circuitBreakerFailureCount++;
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
				console.log(
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
			} else {
				this.circuitBreakerFailureCount++;
				this.UpdateCircuitBreaker(false, error);
				console.error(
					`[MountainClientService] Request ${method} failed after ${duration}ms:`,
					error,
				);
			}

			// Handle cancellation specifically
			if (cancellationToken?.isCancellationRequested) {
				console.log(
					`[MountainClientService] Request ${requestIdentifier} was cancelled`,
				);
				throw new Error(`Request ${requestIdentifier} was cancelled`);
			}

			// Auto-reconnect on connection errors with exponential backoff
			if (this.isConnectionError(error)) {
				console.log(
					"[MountainClientService] Connection error detected, attempting auto-reconnect",
				);
				try {
					await this.reconnect();
					console.log(
						"[MountainClientService] Auto-reconnect successful, retrying request",
					);
					return this.sendRequest(
						method,
						parameters,
						cancellationToken,
					);
				} catch (reconnectError) {
					console.error(
						"[MountainClientService] Auto-reconnect failed:",
						reconnectError,
					);
				}
			}

			throw error;
		} finally {
			// Clean up request tracking
			this.activeRequests.delete(BigInt(requestIdentifier));
		}
	}

	/**
	 * Track comprehensive request performance metrics for observability
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
			console.log(
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
	 * Check if error is a connection error with comprehensive pattern matching
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
	 * Send request with exponential backoff retry logic
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
					console.warn(
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
			console.error(
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
			console.error(
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
				console.log(
					"[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)",
				);
				CocoonDevLog(
					"breaker",
					`[Breaker] transition from=HalfOpen to=Closed reason=service-recovered`,
				);
				this.circuitBreakerState = CircuitBreakerState.Closed;
			}
		} else {
			this.circuitBreakerFailureCount++;

			// Open circuit breaker if threshold reached
			if (
				this.circuitBreakerFailureCount >= this.circuitBreakerThreshold
			) {
				const PriorState = this.circuitBreakerState;
				this.circuitBreakerState = CircuitBreakerState.Open;
				this.circuitBreakerOpenTime = Date.now();
				console.log(
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
				console.log(
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

		console.log(
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
			console.log("[MountainClientService] Health monitoring stopped");
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
				const state = channel.getConnectivityState(false);
				if (state !== 2 /* READY */) {
					throw new Error(`Channel not ready (state: ${state})`);
				}
			}
			this.consecutiveSuccessfulHealthChecks++;

			console.log(
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
			this.circuitBreakerFailureCount++;
			this.UpdateCircuitBreaker(false);

			console.error(
				"[MountainClientService] Health check failed:",
				error,
			);

			// Trigger reconnection if not connected
			if (this.connectionState !== ConnectionState.Connected) {
				console.log(
					"[MountainClientService] Connection lost, attempting reconnect",
				);
				this.reconnect().catch((err) => {
					console.error(
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
			console.log(
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
				console.log(
					`[MountainClientService] Notification ${method} sent successfully`,
				);
			}
		} catch (error) {
			this.errorCount++;
			console.error(
				`[MountainClientService] Notification ${method} failed:`,
				error,
			);

			// Don't throw for notifications (they're fire-and-forget)
			console.warn(
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

		console.log(
			`[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`,
		);

		try {
			const cancelRequest: CancelOperationRequest = {
				RequestIdentifierToCancel: BigInt(requestIdentifier), // Use BigInt for uint64 compatibility
			};
			await this.makeCancelRequest(cancelRequest);

			console.log(
				`[MountainClientService] Operation ${requestIdentifier} canceled`,
			);
		} catch (error) {
			this.errorCount++;
			console.error(
				`[MountainClientService] Cancel operation ${requestIdentifier} failed:`,
				error,
			);

			// Don't throw for cancellation failures (best effort)
			console.warn(
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
			console.warn(
				"[MountainClientService] Not connected to Mountain (already disconnected)",
			);
			return;
		}

		console.log("[MountainClientService] Disconnecting from Mountain");

		// Stop health monitoring
		this.stopHealthMonitoring();

		this.client = null;
		this.connectionState = ConnectionState.Disconnected;

		console.log("[MountainClientService] Disconnected from Mountain");
	}

	/**
	 * Reconnect to Mountain
	 */
	async reconnect(): Promise<void> {
		console.log("[MountainClientService] Reconnecting to Mountain");

		await this.disconnect();
		await this.connect();

		console.log("[MountainClientService] Reconnected to Mountain");
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
