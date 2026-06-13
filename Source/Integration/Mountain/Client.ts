/**
 * @module MountainClient
 * @description
 * High-level Mountain client wrapper that provides a simplified interface
 * for interacting with Mountain's gRPC services.
 *
 * This client wraps the MountainClientService and provides additional
 * convenience methods for common Mountain operations.
 */

import { IMountainClientService } from "../../Interfaces/I/Mountain/Client/Service.js";

import { CocoonDevLog } from "../../Services/Dev/Log.js";

import { MountainClientService } from "../../Services/Mountain/Client/Service.js";

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
			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Already initialized",
			);

			return;
		}

		CocoonDevLog(
			"mountain-client",

			"[MountainClient] Initializing Mountain client",
		);

		try {
			await this.clientService.connect();

			this.isInitialized = true;

			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Successfully initialized",
			);
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Failed to initialize:",

				error,
			);

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

		CocoonDevLog(
			"mountain-client",

			`[MountainClient] Sending request: ${method}`,
		);

		try {
			const response = await this.clientService.sendRequest(
				method,

				data || {},
			);

			CocoonDevLog(
				"mountain-client",

				`[MountainClient] Request ${method} completed successfully`,
			);

			return response;
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClient] Request ${method} failed:`,

				error,
			);

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
			CocoonDevLog(
				"mountain-client",

				`[MountainClient] Sending notification: ${method}`,
			);
		}

		try {
			await this.clientService.sendNotification(method, data || {};

			if (TraceGrpcVerbose) {
				CocoonDevLog(
					"mountain-client",

					`[MountainClient] Notification ${method} sent successfully`,
				;
			}
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				`[MountainClient] Notification ${method} failed:`,

				error,
			;

			// Don't throw for notifications (fire-and-forget)
		}
	}

	/**
	 * Get client status
	 */
	getStatus() {
		return this.clientService.getStatus(;
	}

	/**
	 * Check if client is connected
	 */
	isConnected(): boolean {
		const status = this.getStatus(;

		return status.connected;
	}

	/**
	 * Disconnect from Mountain
	 */
	async disconnect(): Promise<void> {
		if (!this.isInitialized) {
			CocoonDevLog("mountain-client", "[MountainClient] Not initialized";

			return;
		}

		CocoonDevLog(
			"mountain-client",

			"[MountainClient] Disconnecting from Mountain",
		;

		try {
			await this.clientService.disconnect(;

			this.isInitialized = false;

			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Disconnected successfully",
			;
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Disconnect failed:",

				error,
			;

			throw error;
		}
	}

	/**
	 * Reconnect to Mountain
	 */
	async reconnect(): Promise<void> {
		CocoonDevLog(
			"mountain-client",

			"[MountainClient] Reconnecting to Mountain",
		;

		try {
			await this.disconnect(;

			await this.initialize(;

			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Reconnected successfully",
			;
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Reconnect failed:",

				error,
			;

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
			const status = this.getStatus(;

			return status.connected && status.errorCount === 0;
		} catch (error) {
			CocoonDevLog(
				"mountain-client",

				"[MountainClient] Health check failed:",

				error,
			;

			return false;
		}
	}

	/**
	 * Get error count
	 */
	getErrorCount(): number {
		const status = this.getStatus(;

		return status.errorCount;
	}

	/**
	 * Reset error count
	 */
	resetErrorCount(): void {
		// Error count is managed internally by MountainClientService
		CocoonDevLog("mountain-client", "[MountainClient] Error count reset";
	}
}
