/**
 * @module MountainClient
 * @description
 * High-level Mountain client wrapper that provides a simplified interface
 * for interacting with Mountain's gRPC services.
 *
 * This client wraps the MountainClientService and provides additional
 * convenience methods for common Mountain operations.
 */

import { IMountainClientService } from "../Interfaces/IMountainClientService";
import { MountainClientService } from "../Services/MountainClientService";

/**
 * MountainClient - High-level client for Mountain integration
 */
export class MountainClient {
	private clientService: IMountainClientService;
	private isInitialized: boolean = false;

	constructor() {
		this.clientService = new MountainClientService();
	}

	/**
	 * Initialize the Mountain client
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.warn("[MountainClient] Already initialized");
			return;
		}

		console.log("[MountainClient] Initializing Mountain client");

		try {
			await this.clientService.connect();
			this.isInitialized = true;
			console.log("[MountainClient] Successfully initialized");
		} catch (error) {
			console.error("[MountainClient] Failed to initialize:", error);
			throw error;
		}
	}

	/**
	 * Send a request to Mountain with simplified interface
	 */
	async request(method: string, data?: any): Promise<any> {
		if (!this.isInitialized) {
			throw new Error(
				"MountainClient not initialized. Call initialize() first.",
			);
		}

		console.log(`[MountainClient] Sending request: ${method}`);

		try {
			const response = await this.clientService.sendRequest(
				method,
				data || {},
			);
			console.log(
				`[MountainClient] Request ${method} completed successfully`,
			);
			return response;
		} catch (error) {
			console.error(`[MountainClient] Request ${method} failed:`, error);
			throw error;
		}
	}

	/**
	 * Send a notification to Mountain
	 */
	async notify(method: string, data?: any): Promise<void> {
		if (!this.isInitialized) {
			throw new Error(
				"MountainClient not initialized. Call initialize() first.",
			);
		}

		// Gated under `Trace=grpc-verbose` - see sibling comment in
		// `Services/MountainClientService.ts::sendNotification`. The quiet
		// default drops the per-call send/success pair; failures stay
		// logged unconditionally below.
		const TraceGrpcVerbose =
			typeof process !== "undefined" &&
			typeof process.env["Trace"] === "string" &&
			process.env["Trace"].includes("grpc-verbose");
		if (TraceGrpcVerbose) {
			console.log(`[MountainClient] Sending notification: ${method}`);
		}

		try {
			await this.clientService.sendNotification(method, data || {});
			if (TraceGrpcVerbose) {
				console.log(
					`[MountainClient] Notification ${method} sent successfully`,
				);
			}
		} catch (error) {
			console.error(
				`[MountainClient] Notification ${method} failed:`,
				error,
			);
			// Don't throw for notifications (fire-and-forget)
		}
	}

	/**
	 * Get client status
	 */
	getStatus() {
		return this.clientService.getStatus();
	}

	/**
	 * Check if client is connected
	 */
	isConnected(): boolean {
		const status = this.getStatus();
		return status.connected;
	}

	/**
	 * Disconnect from Mountain
	 */
	async disconnect(): Promise<void> {
		if (!this.isInitialized) {
			console.warn("[MountainClient] Not initialized");
			return;
		}

		console.log("[MountainClient] Disconnecting from Mountain");

		try {
			await this.clientService.disconnect();
			this.isInitialized = false;
			console.log("[MountainClient] Disconnected successfully");
		} catch (error) {
			console.error("[MountainClient] Disconnect failed:", error);
			throw error;
		}
	}

	/**
	 * Reconnect to Mountain
	 */
	async reconnect(): Promise<void> {
		console.log("[MountainClient] Reconnecting to Mountain");

		try {
			await this.disconnect();
			await this.initialize();
			console.log("[MountainClient] Reconnected successfully");
		} catch (error) {
			console.error("[MountainClient] Reconnect failed:", error);
			throw error;
		}
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<boolean> {
		if (!this.isInitialized) {
			return false;
		}

		try {
			const status = this.getStatus();
			return status.connected && status.errorCount === 0;
		} catch (error) {
			console.error("[MountainClient] Health check failed:", error);
			return false;
		}
	}

	/**
	 * Get error count
	 */
	getErrorCount(): number {
		const status = this.getStatus();
		return status.errorCount;
	}

	/**
	 * Reset error count
	 */
	resetErrorCount(): void {
		// Error count is managed internally by MountainClientService
		console.log("[MountainClient] Error count reset");
	}
}
