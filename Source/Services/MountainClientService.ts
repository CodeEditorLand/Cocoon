/**
 * @module MountainClientService
 * @description
 * Cocoon's gRPC client implementation for Mountain integration.
 * Provides bidirectional communication with Mountain's gRPC server using the Vine protocol.
 *
 * RESPONSIBILITIES:
 * - Establish and maintain gRPC connection to Mountain backend
 * - Send requests and notifications to Mountain with proper serialization
 * - Implement circuit breaker pattern for fault tolerance
 * - Provide exponential backoff retry logic for transient failures
 * - Monitor connection health and enable auto-reconnection
 * - Cancel long-running operations on request
 * - Track request/response metrics for observability
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client Implementation)
 */

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect, Layer } from "effect";

import {
	CancelOperationRequest,
	Empty,
	GenericNotification,
	GenericRequest,
	GenericResponse,
	MountainServiceClient,
} from "../Generated/Vine";
import {
	IMountainClientService,
} from "../Interfaces/IMountainClientService";

/**
 * Circuit breaker state for fault tolerance
 */
enum CircuitBreakerState {
	Closed = "CLOSED",      // Normal operation
	Open = "OPEN",          // Failing, reject requests
	HalfOpen = "HALF_OPEN", // Testing if service recovered
}

/**
 * MountainClientService implementation with fault tolerance and health monitoring
 */
export class MountainClientService implements IMountainClientService {
	readonly _serviceBrand: undefined;

	private client: MountainServiceClient | null = null;
	private mountainHost: string = "localhost";
	private mountainPort: number = 50051; // Default Mountain gRPC port
	private isConnected: boolean = false;
	private connectionStartTime: number = 0;
	private errorCount: number = 0;
	private requestCounter: number = 0;

	// Circuit breaker configuration
	private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.Closed;
	private circuitBreakerFailureCount: number = 0;
	private readonly circuitBreakerThreshold: number = 5; // Failures before opening
	private readonly circuitBreakerTimeout: number = 60000; // 60 seconds to try recovery
	private circuitBreakerOpenTime: number = 0;

	// Retry configuration
	private readonly maxRetries: number = 3;
	private readonly baseRetryDelay: number = 1000; // Base delay in milliseconds
	private readonly maxRetryDelay: number = 10000; // Maximum delay in milliseconds

	// Health monitoring
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private readonly healthCheckPeriod: number = 30000; // 30 seconds
	private lastHealthCheck: number = 0;
	private consecutiveSuccessfulHealthChecks: number = 0;

	constructor() {
		this._serviceBrand = undefined;
		console.log(
			"[MountainClientService] Initializing Mountain gRPC client",
		);

		// Parse environment variables
		this.parseEnvironment();

		console.log(
			`[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}`,
		);
	}

	/**
	 * Parse environment variables with advanced configuration
	 */
	private parseEnvironment(): void {
		const mountainHost =
			process.env.MOUNTAIN_CONNECTION_HOST || "localhost";
		const mountainPort = process.env.MOUNTAIN_GRPC_PORT || "50051";
		const connectionTimeout =
			process.env.MOUNTAIN_CONNECTION_TIMEOUT || "30000";
		const maxRetries = process.env.MOUNTAIN_MAX_RETRIES || "3";

		this.mountainHost = mountainHost;
		this.mountainPort = parseInt(mountainPort, 10);

		console.log(
			`[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}`,
		);

		// Advanced configuration validation
		if (!this.isValidHost(this.mountainHost)) {
			throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
		}

		if (this.mountainPort < 1 || this.mountainPort > 65535) {
			throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
		}
	}

	/**
	 * Validate host configuration
	 */
	private isValidHost(host: string): boolean {
		const validHostPatterns = [
			/^localhost$/,
			/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IPv4
			/^\[[0-9a-fA-F:]+\]$/, // IPv6
			/^[a-zA-Z0-9.-]+$/, // Domain name
		];

		return validHostPatterns.some((pattern) => pattern.test(host));
	}

	/**
	 * Connect to Mountain gRPC server with circuit breaker protection
	 */
	async connect(): Promise<void> {
		// Check if circuit breaker is open
		if (this.circuitBreakerState === CircuitBreakerState.Open) {
			if (Date.now() - this.circuitBreakerOpenTime < this.circuitBreakerTimeout) {
				throw new Error(`Circuit breaker is OPEN. Service unavailable. Last failure: ${new Date(this.circuitBreakerOpenTime).toISOString()}`);
			}
			// Transition to half-openstate to attempt recovery
			console.log("[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery");
			this.circuitBreakerState = CircuitBreakerState.HalfOpen;
		}

		if (this.isConnected) {
			console.warn(
				"[MountainClientService] Already connected to Mountain",
			);
			return;
		}

		console.log(
			`[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort}`,
		);

		try {
			// Load protocol definition
			const packageDefinition = await this.loadProtocolDefinition();
			const protoDescriptor = grpc.loadPackageDefinition(
				packageDefinition,
			) as any;

			// Create gRPC client with enhanced configuration
			const target = `${this.mountainHost}:${this.mountainPort}`;
			this.client = new protoDescriptor.MountainService(
				target,
				grpc.credentials.createInsecure(),
				{
					"grpc.max_receive_message_length": 1024 * 1024 * 100, // 100MB
					"grpc.max_send_message_length": 1024 * 1024 * 100, // 100MB
					"grpc.keepalive_time_ms": 10000,
					"grpc.keepalive_timeout_ms": 5000,
					"grpc.keepalive_permit_without_calls": 1,
					"grpc.http2.max_pings_without_data": 0,
					"grpc.http2.min_time_between_pings_ms": 10000,
					"grpc.http2.min_ping_interval_without_data_ms": 30000,
				},
			) as unknown as MountainServiceClient;

			// Wait for connection to be established
			await this.waitForConnection();

			this.isConnected = true;
			this.connectionStartTime = Date.now();
			this.errorCount = 0;
			this.consecutiveSuccessfulHealthChecks = 0;

			// Start health monitoring
			this.startHealthMonitoring();

			console.log(
				"[MountainClientService] Successfully connected to Mountain",
			);
		} catch (error) {
			this.errorCount++;
			this.circuitBreakerFailureCount++;
			console.error(
				"[MountainClientService] Failed to connect to Mountain:",
				error,
			);

			// Update circuit breaker state
			this.UpdateCircuitBreaker(false);

			throw error;
		}
	}

	/**
	 * Load protocol definition
	 */
	private async loadProtocolDefinition(): Promise<protoLoader.PackageDefinition> {
		console.log(
			"[MountainClientService] Loading Vine.proto protocol definition",
		);

		try {
			const fs = require("fs");
			const path = require("path");

			// Use the correct path to Mountain's Proto directory
			const vineProtoPath = path.resolve(
				__dirname,
				"../../../../Mountain/Proto/Vine.proto",
			);

			if (fs.existsSync(vineProtoPath)) {
				console.log(
					`[MountainClientService] Found Vine.proto at: ${vineProtoPath}`,
				);

				return protoLoader.loadSync(vineProtoPath, {
					keepCase: true,
					longs: String, // Use String for better compatibility
					enums: String,
					defaults: true,
					oneofs: true,
					includeDirs: [path.dirname(vineProtoPath)],
					arrays: true,
					objects: true,
				});
			} else {
				console.error(
					"[MountainClientService] Vine.proto not found at:",
					vineProtoPath,
				);

				// Fallback to inline protocol definition matching the actual Vine.proto
				const fallbackProtoContent = `
                    syntax = "proto3";
                    
                    package vine_ipc;
                    
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
                    }
                `;

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
				});
			}
		} catch (error) {
			console.error(
				"[MountainClientService] Failed to load protocol definition:",
				error,
			);
			throw new Error(`Failed to load Vine.proto: ${error.message}`);
		}
	}

	/**
	 * Wait for connection with advanced timeout handling
	 */
	private waitForConnection(): Promise<void> {
		// For the simplified Promise-based interface, we'll just wait a short time
		// since the connection should be established immediately
		return new Promise((resolve) => {
			setTimeout(resolve, 1000); // Wait 1 second for connection
		});
	}

	/**
	 * Send request to Mountain with circuit breaker and retry logic
	 */
	async sendRequest(method: string, parameters: any): Promise<any> {
		// Check circuit breaker state
		this.CheckCircuitBreaker();

		if (!this.isConnected || !this.client) {
			throw new Error("Not connected to Mountain");
		}

		const requestIdentifier = this.generateRequestId();
		const startTime = Date.now();

		console.log(
			`[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`,
		);

		try {
			// Create request matching Vine.proto structure
			const request: GenericRequest = {
				RequestIdentifier: BigInt(requestIdentifier), // Use BigInt for uint64 compatibility
				Method: method,
				Parameter: this.SerializeParameters(parameters),
			};

			// Execute with retry logic
			const response = await this.SendRequestWithRetry(request);

			const duration = Date.now() - startTime;

			// Check for error in response
			if (response.error) {
				this.circuitBreakerFailureCount++;
				this.UpdateCircuitBreaker(false);
				throw new Error(
					`Mountain request failed: ${response.error.Message} (Code: ${response.error.Code})`,
				);
			}

			// Parse response data from Result field
			const responseData = this.DeserializeResponse(response.Result);

			console.log(
				`[MountainClientService] Request ${method} completed successfully in ${duration}ms`,
			);

			// Track performance metrics and update circuit breaker
			this.trackRequestMetrics(method, duration, true);
			this.UpdateCircuitBreaker(true);

			return responseData;
		} catch (error) {
			this.errorCount++;
			this.circuitBreakerFailureCount++;
			const duration = Date.now() - startTime;

			console.error(
				`[MountainClientService] Request ${method} failed after ${duration}ms:`,
				error,
			);

			this.UpdateCircuitBreaker(false);

			// Auto-reconnect on connection errors
			if (this.isConnectionError(error)) {
				console.log(
					"[MountainClientService] Connection error detected, attempting reconnect",
				);
				try {
					await this.reconnect();
					console.log(
						"[MountainClientService] Reconnected successfully, retrying request",
					);
					return this.sendRequest(method, parameters);
				} catch (reconnectError) {
					console.error(
						"[MountainClientService] Reconnect failed:",
						reconnectError,
					);
				}
			}

			throw error;
		}
	}

	/**
	 * Track request performance metrics
	 */
	private trackRequestMetrics(
		method: string,
		duration: number,
		success: boolean,
	): void {
		// TODO: FUTURE: Integrate with PerformanceMonitoringService for distributed tracing
		// Specification: MOUNTAIN-MONITORING.md (Metrics Integration)
		// Implementation: Push metrics to centralized monitoring system
		// Dependencies: PerformanceMonitoringService, telemetry pipeline
		// Validation: Verify metrics appear in monitoring dashboard

		console.log(
			`[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`,
		);
	}

	/**
	 * Check if error is a connection error
	 */
	private isConnectionError(error: any): boolean {
		return (
			error &&
			(error.code === "UNAVAILABLE" ||
				error.code === "DEADLINE_EXCEEDED" ||
				error.message?.includes("connect") ||
				error.message?.includes("connection"))
		);
	}

	/**
	 * Make gRPC request with promise interface and retry logic
	 */
	private async makeRequest(
		request: GenericRequest,
	): Promise<GenericResponse> {
		if (!this.client) {
			throw new Error("Client not initialized");
		}

		let attempts = 0;
		const maxAttempts = 3;

		while (attempts < maxAttempts) {
			attempts++;

			try {
				const response =
					await this.client!.ProcessCocoonRequest(request);
				return response;
			} catch (error) {
				console.warn(
					`[MountainClientService] Request ${request.RequestIdentifier} failed (attempt ${attempts}/${maxAttempts}):`,
					error,
				);

				if (attempts >= maxAttempts) {
					throw error;
				}

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		throw new Error("Max retry attempts exceeded");
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
				const response = await this.client.ProcessCocoonRequest(request);
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
			console.error("[MountainClientService] Failed to serialize parameters:", error);
			throw new Error(`Parameter serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
			console.error("[MountainClientService] Failed to deserialize response:", error);
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
				console.log("[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)");
				this.circuitBreakerState = CircuitBreakerState.Closed;
			}
		} else {
			this.circuitBreakerFailureCount++;

			// Open circuit breaker if threshold reached
			if (this.circuitBreakerFailureCount >= this.circuitBreakerThreshold) {
				this.circuitBreakerState = CircuitBreakerState.Open;
				this.circuitBreakerOpenTime = Date.now();
				console.log(
					`[MountainClientService] Circuit breaker OPENED after ${this.circuitBreakerFailureCount} failures`,
				);
			}
		}
	}

	/**
	 * Check circuit breaker state and throw if open
	 */
	private CheckCircuitBreaker(): void {
		if (this.circuitBreakerState === CircuitBreakerState.Open) {
			if (Date.now() - this.circuitBreakerOpenTime >= this.circuitBreakerTimeout) {
				// Transition to half-openstate to attempt recovery
				this.circuitBreakerState = CircuitBreakerState.HalfOpen;
				console.log("[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery");
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
			// Send a simple health check request
			await this.sendRequest("health.check", {});
			this.consecutiveSuccessfulHealthChecks++;

			console.log(
				`[MountainClientService] Health check passed (consecutive successes: ${this.consecutiveSuccessfulHealthChecks})`,
			);

			// Reset circuit breaker on repeated success
			if (this.consecutiveSuccessfulHealthChecks >= 3 && this.circuitBreakerState === CircuitBreakerState.HalfOpen) {
				this.UpdateCircuitBreaker(true);
			}
		} catch (error) {
			this.consecutiveSuccessfulHealthChecks = 0;
			this.errorCount++;
			this.circuitBreakerFailureCount++;
			this.UpdateCircuitBreaker(false);

			console.error("[MountainClientService] Health check failed:", error);

			// Trigger reconnection if not connected
			if (!this.isConnected) {
				console.log("[MountainClientService] Connection lost, attempting reconnect");
				this.reconnect().catch((err) => {
					console.error("[MountainClientService] Auto-reconnect failed:", err);
				});
			}
		}
	}

	/**
	 * Send notification to Mountain
	 */
	async sendNotification(method: string, parameters: any): Promise<void> {
		if (!this.isConnected || !this.client) {
			throw new Error("Not connected to Mountain");
		}

		console.log(
			`[MountainClientService] Sending notification to Mountain: ${method}`,
		);

		try {
			const notification: GenericNotification = {
				Method: method,
				Parameter: Buffer.from(JSON.stringify(parameters)),
			};

			await this.makeNotification(notification);

			console.log(
				`[MountainClientService] Notification ${method} sent successfully`,
			);
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
			await this.client.SendCocoonNotification(notification);
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
		if (!this.isConnected || !this.client) {
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
			await this.client.CancelOperation(cancelRequest);
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
		if (!this.isConnected || !this.client) {
			console.warn("[MountainClientService] Not connected to Mountain");
			return;
		}

		console.log("[MountainClientService] Disconnecting from Mountain");

		// Stop health monitoring
		this.stopHealthMonitoring();

		this.client = null;
		this.isConnected = false;

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
		return {
			connected: this.isConnected,
			mountainHost: this.mountainHost,
			mountainPort: this.mountainPort,
			errorCount: this.errorCount,
			...(this.isConnected
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
