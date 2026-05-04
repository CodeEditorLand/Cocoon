/**
 * @module MountainConfig
 * @description
 * Configuration interface and utilities for Mountain client integration.
 *
 * Provides configuration management for Mountain connection settings,
 * timeout values, retry policies, and other Mountain-specific settings.
 */

/**
 * Mountain connection configuration
 */
export interface MountainConfig {
	/**
	 * Mountain gRPC server host
	 * @default "localhost"
	 */
	host: string;

	/**
	 * Mountain gRPC server port
	 * @default 50051
	 */
	port: number;

	/**
	 * Connection timeout in milliseconds
	 * @default 30000
	 */
	connectionTimeout: number;

	/**
	 * Maximum number of retry attempts
	 * @default 3
	 */
	maxRetries: number;

	/**
	 * Retry delay in milliseconds
	 * @default 1000
	 */
	retryDelay: number;

	/**
	 * Enable/disable connection keep-alive
	 * @default true
	 */
	keepAlive: boolean;

	/**
	 * Keep-alive interval in milliseconds
	 * @default 10000
	 */
	keepAliveInterval: number;

	/**
	 * Maximum message size in bytes
	 * @default 104857600 (100MB)
	 */
	maxMessageSize: number;

	/**
	 * Enable/disable SSL/TLS
	 * @default false
	 */
	useTls: boolean;

	/**
	 * TLS certificate path (if using TLS)
	 */
	tlsCertPath?: string;

	/**
	 * Enable/disable debug logging
	 * @default false
	 */
	debug: boolean;

	/**
	 * Auto-reconnect on connection loss
	 * @default true
	 */
	autoReconnect: boolean;

	/**
	 * Auto-reconnect delay in milliseconds
	 * @default 5000
	 */
	autoReconnectDelay: number;

	/**
	 * Maximum auto-reconnect attempts
	 * @default 5
	 */
	maxAutoReconnectAttempts: number;
}

/**
 * Default Mountain configuration
 */
export const defaultMountainConfig: MountainConfig = {
	host: "localhost",
	port: 50051,
	connectionTimeout: 30000,
	maxRetries: 3,
	retryDelay: 1000,
	keepAlive: true,
	keepAliveInterval: 10000,
	maxMessageSize: 104857600, // 100MB
	useTls: false,
	debug: false,
	autoReconnect: true,
	autoReconnectDelay: 5000,
	maxAutoReconnectAttempts: 5,
};

/**
 * Load Mountain configuration from environment variables
 */
export function loadMountainConfigFromEnv(): MountainConfig {
	const config = { ...defaultMountainConfig };

	// Load from environment variables
	if (process.env.MOUNTAIN_HOST) {
		config.host = process.env.MOUNTAIN_HOST;
	}

	if (process.env.MOUNTAIN_PORT) {
		const port = parseInt(process.env.MOUNTAIN_PORT, 10);
		if (!isNaN(port) && port > 0 && port <= 65535) {
			config.port = port;
		}
	}

	if (process.env.MOUNTAIN_CONNECTION_TIMEOUT) {
		const timeout = parseInt(process.env.MOUNTAIN_CONNECTION_TIMEOUT, 10);
		if (!isNaN(timeout) && timeout > 0) {
			config.connectionTimeout = timeout;
		}
	}

	if (process.env.MOUNTAIN_MAX_RETRIES) {
		const retries = parseInt(process.env.MOUNTAIN_MAX_RETRIES, 10);
		if (!isNaN(retries) && retries > 0) {
			config.maxRetries = retries;
		}
	}

	if (process.env.MOUNTAIN_RETRY_DELAY) {
		const delay = parseInt(process.env.MOUNTAIN_RETRY_DELAY, 10);
		if (!isNaN(delay) && delay > 0) {
			config.retryDelay = delay;
		}
	}

	if (process.env.MOUNTAIN_KEEP_ALIVE) {
		config.keepAlive =
			process.env.MOUNTAIN_KEEP_ALIVE.toLowerCase() === "true";
	}

	if (process.env.MOUNTAIN_KEEP_ALIVE_INTERVAL) {
		const interval = parseInt(process.env.MOUNTAIN_KEEP_ALIVE_INTERVAL, 10);
		if (!isNaN(interval) && interval > 0) {
			config.keepAliveInterval = interval;
		}
	}

	if (process.env.MOUNTAIN_MAX_MESSAGE_SIZE) {
		const size = parseInt(process.env.MOUNTAIN_MAX_MESSAGE_SIZE, 10);
		if (!isNaN(size) && size > 0) {
			config.maxMessageSize = size;
		}
	}

	if (process.env.MOUNTAIN_USE_TLS) {
		config.useTls = process.env.MOUNTAIN_USE_TLS.toLowerCase() === "true";
	}

	if (process.env.MOUNTAIN_TLS_CERT_PATH) {
		config.tlsCertPath = process.env.MOUNTAIN_TLS_CERT_PATH;
	}

	if (process.env.MOUNTAIN_DEBUG) {
		config.debug = process.env.MOUNTAIN_DEBUG.toLowerCase() === "true";
	}

	if (process.env.MOUNTAIN_AUTO_RECONNECT) {
		config.autoReconnect =
			process.env.MOUNTAIN_AUTO_RECONNECT.toLowerCase() === "true";
	}

	if (process.env.MOUNTAIN_AUTO_RECONNECT_DELAY) {
		const delay = parseInt(process.env.MOUNTAIN_AUTO_RECONNECT_DELAY, 10);
		if (!isNaN(delay) && delay > 0) {
			config.autoReconnectDelay = delay;
		}
	}

	if (process.env.MOUNTAIN_MAX_AUTO_RECONNECT_ATTEMPTS) {
		const attempts = parseInt(
			process.env.MOUNTAIN_MAX_AUTO_RECONNECT_ATTEMPTS,
			10,
		);
		if (!isNaN(attempts) && attempts > 0) {
			config.maxAutoReconnectAttempts = attempts;
		}
	}

	return config;
}

/**
 * Validate Mountain configuration
 */
export function validateMountainConfig(config: MountainConfig): string[] {
	const errors: string[] = [];

	// Validate host
	if (!config.host || typeof config.host !== "string") {
		errors.push("Host must be a non-empty string");
	}

	// Validate port
	if (!config.port || config.port < 1 || config.port > 65535) {
		errors.push("Port must be between 1 and 65535");
	}

	// Validate timeouts
	if (config.connectionTimeout <= 0) {
		errors.push("Connection timeout must be positive");
	}

	if (config.retryDelay <= 0) {
		errors.push("Retry delay must be positive");
	}

	if (config.keepAliveInterval <= 0) {
		errors.push("Keep-alive interval must be positive");
	}

	if (config.maxMessageSize <= 0) {
		errors.push("Max message size must be positive");
	}

	if (config.autoReconnectDelay <= 0) {
		errors.push("Auto-reconnect delay must be positive");
	}

	if (config.maxAutoReconnectAttempts <= 0) {
		errors.push("Max auto-reconnect attempts must be positive");
	}

	// Validate TLS configuration
	if (config.useTls && !config.tlsCertPath) {
		errors.push("TLS certificate path is required when TLS is enabled");
	}

	return errors;
}

/**
 * Create Mountain configuration with validation
 */
export function createMountainConfig(
	overrides?: Partial<MountainConfig>,
): MountainConfig {
	const config = { ...defaultMountainConfig, ...overrides };

	const errors = validateMountainConfig(config);
	if (errors.length > 0) {
		throw new Error(`Invalid Mountain configuration: ${errors.join(", ")}`);
	}

	return config;
}

/**
 * Get Mountain configuration summary
 */
export function getMountainConfigSummary(config: MountainConfig): string {
	return `Mountain Configuration:
  Host: ${config.host}
  Port: ${config.port}
  Connection Timeout: ${config.connectionTimeout}ms
  Max Retries: ${config.maxRetries}
  Retry Delay: ${config.retryDelay}ms
  Keep Alive: ${config.keepAlive}
  Keep Alive Interval: ${config.keepAliveInterval}ms
  Max Message Size: ${config.maxMessageSize} bytes
  Use TLS: ${config.useTls}
  TLS Cert Path: ${config.tlsCertPath || "Not specified"}
  Debug: ${config.debug}
  Auto Reconnect: ${config.autoReconnect}
  Auto Reconnect Delay: ${config.autoReconnectDelay}ms
  Max Auto Reconnect Attempts: ${config.maxAutoReconnectAttempts}`;
}
