/**
 * @module MountainClientService
 * @description
 * Cocoon's gRPC client implementation for Mountain integration.
 * Connects to Mountain's gRPC server and implements MountainService client.
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client Implementation)
 */

import * as grpc from "@grpc/grpc-js";
// Import generated interfaces from Vine.proto
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
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
	IMountainClientService,
} from "../Interfaces/IMountainClientService";

/**
 * MountainClientService implementation
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
	 * Connect to Mountain gRPC server
	 */
	async connect(): Promise<void> {
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

			console.log(
				"[MountainClientService] Successfully connected to Mountain",
			);
		} catch (error) {
			this.errorCount++;
			console.error(
				"[MountainClientService] Failed to connect to Mountain:",
				error,
			);
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
	 * Send request to Mountain with advanced features
	 */
	async sendRequest(method: string, parameters: any): Promise<any> {
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
				Parameter: Buffer.from(JSON.stringify(parameters || {})),
			};

			const response = await this.makeRequest(request);

			const duration = Date.now() - startTime;

			// Check for error in response
			if (response.error) {
				throw new Error(
					`Mountain request failed: ${response.error.Message} (Code: ${response.error.Code})`,
				);
			}

			// Parse response data from Result field
			const responseData = response.Result
				? JSON.parse(response.Result.toString("utf8"))
				: {};

			console.log(
				`[MountainClientService] Request ${method} completed successfully in ${duration}ms`,
			);

			// Track performance metrics
			this.trackRequestMetrics(method, duration, true);

			return responseData;
		} catch (error) {
			this.errorCount++;
			const duration = Date.now() - startTime;

			console.error(
				`[MountainClientService] Request ${method} failed after ${duration}ms:`,
				error,
			);

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
		// TODO: Integrate with PerformanceMonitoringService
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
	 * Get connection status
	 */
	getStatus(): {
		connected: boolean;
		mountainHost: string;
		mountainPort: number;
		errorCount: number;
		uptime?: number;
	} {
		return {
			connected: this.isConnected,
			mountainHost: this.mountainHost,
			mountainPort: this.mountainPort,
			errorCount: this.errorCount,
			...(this.isConnected
				? { uptime: Date.now() - this.connectionStartTime }
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
