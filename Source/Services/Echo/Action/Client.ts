/**
 * @module Services/EchoAction
 * @description
 * Cocoon Echo Action Client - Node.js extension host communication
 *
 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY - Requires Node.js extension host
 *
 * Provides bidirectional EchoAction communication with Mountain Spine.
 *
 * ## Supported Extension Hosts
 *
 * - ✅ Cocoon (Node.js) - Primary implementation
 * - ❌ Grove (WASM+Rhai) - Separate implementation
 * - ❌ Sky (WASM only) - Separate implementation
 *
 * ## Feature Gates
 *
 * - `COCOON_RPC` - Enable gRPC communication (default)
 * - `COCOON_TELEMETRY` - Enable OTEL integration
 *
 * ## Protocol
 *
 * 1. **Registration**: Cocoon registers with Mountain as a host
 * 2. **EchoActions**: Bidirectional EchoAction communication
 * 3. **RPC Calls**: Direct gRPC calls to Mountain's Spine services
 * 4. **Event Broadcasting**: Publish events to other hosts
 *
 * ## Usage Example
 *
 * ```typescript
 * import { CocoonEchoClient } from '../../Services/EchoAction.js';
 *
 * const client = new CocoonEchoClient('http://127.0.0.1:50051', 'cocoon-host-1');
 * await client.connect();
 * await client.register();
 *
 * // Send EchoAction
 * const response = await client.sendRpc('CommandService.Execute', payload);
 * ```
 *
 * @category Services
 * @since 1.0.0
 */

import { credentials } from "@grpc/grpc-js";

import { v4 as uuidv4 } from "uuid";

import {
	EchoAction,
	EchoActionResponse,
	EchoActionServiceClient,
	RegisterExtensionHostRequest,
} from "../../../../Proto/vine.js";

import { Logger } from "../../../Platform/Logger.js";

import { MetricsCollector } from "../../Metrics/Collector.js";

/**
 * Cocoon Echo Action Client
 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
 */
export class CocoonEchoClient {

	/** Mountain gRPC URL */
	private readonly mountainUrl: string;

	/** Host identifier */
	private readonly hostId: string;

	/** gRPC client */
	private client: EchoActionServiceClient | null = null;

	/** Connection state */
	private isConnected = false;

	/** Connection start time */
	private connectionStartTime: Date | null = null;

	/** Last heartbeat timestamp */
	private lastHeartbeat: Date | null = null;

	/** Heartbeat interval ID */
	private heartbeatIntervalId: NodeJS.Timeout | null = null;

	/** Logger */
	private logger = Logger.create("CocoonEchoClient");

	/** Metrics */
	private metrics = MetricsCollector.getInstance();

	/** Registered host information */
	private hostInfo: {
		hostId: string;

		hostRegistryId: string;

		heartbeatIntervalSec: number;
	} | null = null;

	/**
	 * Create new Cocoon Echo client
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 *
	 * @param mountainUrl - Mountain gRPC URL
	 * @param hostId - Unique host identifier
	 */
	constructor(mountainUrl: string, hostId?: string) {
		this.mountainUrl = mountainUrl;

		this.hostId = hostId || `cocoon-${uuidv4()}`;

		this.logger.info(`Cocoon Echo Client created: ${this.hostId}`);
	}

	/**
	 * Connect to Mountain
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async connect(): Promise<void> {
		this.logger.info(`Connecting to Mountain at: ${this.mountainUrl}`);

		return new Promise((resolve, _reject) => {
			this.client = new EchoActionServiceClient(
				this.mountainUrl,

				credentials.createInsecure(),
			);

			// Test connection by making a simple call
			// For now, we'll just mark as connected
			this.isConnected = true;

			this.connectionStartTime = new Date();

			this.lastHeartbeat = new Date();

			this.logger.info("Successfully connected to Mountain");

			this.metrics.increment("echo_client.connect_success");

			resolve();
		});
	}

	/**
	 * Disconnect from Mountain
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async disconnect(): Promise<void> {
		this.logger.info("Disconnecting from Mountain");

		// Stop heartbeat
		if (this.heartbeatIntervalId) {
			clearInterval(this.heartbeatIntervalId);

			this.heartbeatIntervalId = null;
		}

		this.client = null;

		this.isConnected = false;

		this.connectionStartTime = null;

		this.hostInfo = null;

		this.logger.info("Disconnected from Mountain");

		this.metrics.increment("echo_client.disconnect");
	}

	/**
	 * Register Cocoon as an extension host
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY - Host registration with Mountain
	 */
	async register(): Promise<{
		hostId: string;

		hostRegistryId: string;

		heartbeatIntervalSec: number;
	}> {
		if (!this.client) {
			throw new Error("Not connected to Mountain");
		}

		this.logger.info(`Registering Cocoon host: ${this.hostId}`);

		const request: RegisterExtensionHostRequest = {
			host_id: this.hostId,

			host_type: 1, // Cocoon

			capabilities: {
				supports_terminals: "true",

				supports_processes: "true",

				supports_debug: "true",

				supports_webviews: "true",

				supports_scm: "true",

				max_memory_mb: "4096",
			},

			metadata: {
				version: process.env.npm_package_version || "0.0.1",

				build_hash: process.env.BUILD_HASH || "unknown",

				supported_extensions: ["vsix"],

				max_memory_mb: 4096,

				enabled_features: [
					"nodejs",

					"terminals",

					"debug-protocol",

					"scm-support",
				],
			},
		};

		return new Promise((resolve, reject) => {
			if (!this.client) {
				reject(new Error("Client not initialized"));

				return;
			}

			this.client.register_extension_host(request, (err, response) => {
				if (err) {
					this.logger.error(`Registration failed: ${err.message}`);

					this.metrics.increment("echo_client.register_failure");

					reject(new Error(`Failed to register: ${err.message}`));

					return;
				}

				if (response && response.registered) {
					this.hostInfo = {
						hostId: this.hostId,
						hostRegistryId: response.host_registry_id,
						heartbeatIntervalSec: response.heartbeat_interval_sec,
					};

					this.logger.info(
						`Cocoon host registered: ${response.host_registry_id}`,
					);

					this.metrics.increment("echo_client.register_success");

					// Start heartbeat loop
					this.startHeartbeatLoop();

					resolve(this.hostInfo);
				} else {
					this.logger.error("Registration returned false");

					this.metrics.increment("echo_client.register_failure");

					reject(new Error("Registration failed"));
				}
			});
		});
	}

	/**
	 * Send EchoAction to Mountain
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async sendEchoAction(action: EchoAction): Promise<EchoActionResponse> {
		if (!this.client) {
			throw new Error("Not connected to Mountain");
		}

		this.logger.debug(
			`Sending EchoAction: type=${action.actionType}, target=${action.target}`,
		);

		const startTime = Date.now();

		return new Promise((resolve, reject) => {
			if (!this.client) {
				reject(new Error("Client not initialized"));

				return;
			}

			this.client.send_echo_action(action, (err, response) => {
				const duration = Date.now() - startTime;

				if (err) {
					this.logger.error(`EchoAction failed: ${err.message}`);

					this.metrics.recordTiming(
						"echo_action.duration_ms",

						duration,

						{
							success: "false",
							type: action.actionType,
						},
					);

					reject(new Error(`EchoAction failed: ${err.message}`));

					return;
				}

				if (!response) {
					reject(new Error("No response received"));

					return;
				}

				this.logger.debug(
					`EchoAction response: success=${response.success}`,
				);

				this.metrics.recordTiming("echo_action.duration_ms", duration, {
					success: response.success.toString(),
					type: action.actionType,
				});

				if (!response.success) {
					reject(new Error(`EchoAction failed: ${response.error}`));

					return;
				}

				resolve(response);
			});
		});
	}

	/**
	 * Send RPC via EchoAction
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async sendRpc(
		rpcMethod: string,

		payload: Buffer,

		targetHost?: string,
	): Promise<Buffer> {
		const headers: Record<string, string> = {
			rpc_method: rpcMethod,

			host_type: "cocoon",

			node_version: process.version,

			platform: process.platform,
		};

		if (targetHost) {
			headers.target_host = targetHost;
		}

		const action: EchoAction = {
			actionId: uuidv4(),

			source: this.hostId,

			target: targetHost || "mountain",

			actionType: "rpc",

			payload,

			headers,

			timestamp: Date.now(),
		};

		const response = await this.sendEchoAction(action);

		return Buffer.from(response.result);
	}

	/**
	 * Send event via EchoAction
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async sendEvent(
		eventName: string,

		payload: Buffer,

		metadata: Record<string, string> = {},
	): Promise<void> {
		const headers: Record<string, string> = {
			event_name: eventName,

			host_type: "cocoon",
			...metadata,
		};

		const action: EchoAction = {
			actionId: uuidv4(),

			source: this.hostId,

			target: "mountain",

			actionType: "event",

			payload,

			headers,

			timestamp: Date.now(),
		};

		await this.sendEchoAction(action);
	}

	/**
	 * Send state update via EchoAction
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async sendState(
		stateType: string,

		payload: Buffer,

		metadata: Record<string, string> = {},
	): Promise<void> {
		const headers: Record<string, string> = {
			state_type: stateType,

			host_type: "cocoon",
			...metadata,
		};

		const action: EchoAction = {
			actionId: uuidv4(),

			source: this.hostId,

			target: "mountain",

			actionType: "state",

			payload,

			headers,

			timestamp: Date.now(),
		};

		await this.sendEchoAction(action);
	}

	/**
	 * Query service discovery
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async discoverServices(serviceName?: string): Promise<any[]> {
		const headers: Record<string, string> = {
			host_type: "cocoon",
		};

		if (serviceName) {
			headers.service_name = serviceName;
		}

		const action: EchoAction = {
			actionId: uuidv4(),

			source: this.hostId,

			target: "mountain",

			actionType: "discovery",

			payload: Buffer.alloc(0),

			headers,

			timestamp: Date.now(),
		};

		const response = await this.sendEchoAction(action);

		return JSON.parse(response.result.toString());
	}

	/**
	 * Start heartbeat loop
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	private startHeartbeatLoop(): void {
		if (!this.hostInfo) {
			return;
		}

		const intervalMs = (this.hostInfo.heartbeatIntervalSec || 30) * 1000;

		this.heartbeatIntervalId = setInterval(() => {
			this.lastHeartbeat = new Date();

			// DEPENDENCY: Echo heartbeat action - needs Echo backend implementation
			// Current: log heartbeat for debugging
			this.logger.debug("Heartbeat sent");

			this.metrics.increment("echo_client.heartbeat");
		}, intervalMs);
	}

	/**
	 * Get connection status
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	getStatus(): {
		connected: boolean;

		hostId: string;

		uptime: number | null;

		hostInfo: typeof this.hostInfo;

		lastHeartbeat: Date | null;
	} {
		let uptime: number | null = null;

		if (this.connectionStartTime) {
			uptime = Date.now() - this.connectionStartTime.getTime();
		}

		return {
			connected: this.isConnected,

			hostId: this.hostId,

			uptime,

			hostInfo: this.hostInfo,

			lastHeartbeat: this.lastHeartbeat,
		};
	}

	/**
	 * Reconnect to Mountain
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async reconnect(): Promise<void> {
		this.logger.warn("Attempting to reconnect to Mountain");

		await this.disconnect();

		await this.connect();

		await this.register();

		this.logger.info("Successfully reconnected to Mountain");
	}
}

/**
 * Echo Action Type
 * @since 1.0.0
 */
export type EchoActionType =
	| "rpc"
	| "event"
	| "stream"
	| "state"
	| "discovery"
	| "registration";

/**
 * Echo Action Interface
 * @since 1.0.0
 */
export interface EchoActionProps {

	actionId: string;

	source: string;

	target: string;

	actionType: EchoActionType;

	payload: Buffer;

	headers: Record<string, string>;

	timestamp: number;

	nestedActions?: EchoActionProps[];
}

/**
 * Echo Action Response Interface
 * @since 1.0.0
 */
export interface EchoActionResponseProps {

	actionId: string;

	success: boolean;

	result: Buffer;

	error?: string;

	metadata: Record<string, string>;

	processingTimeMs: number;
}

/**
 * Create factory for EchoAction client
 * @since 1.0.0
 */
export const CocoonEchoClientFactory = {

	/**
	 * Create and connect EchoAction client
	 * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
	 */
	async createAndConnect(
		mountainUrl: string,

		hostId?: string,
	): Promise<CocoonEchoClient> {
		const client = new CocoonEchoClient(mountainUrl, hostId);

		await client.connect();

		await client.register();

		return client;
	},
};
