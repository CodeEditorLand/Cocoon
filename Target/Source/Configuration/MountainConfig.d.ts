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
export declare const defaultMountainConfig: MountainConfig;
/**
 * Load Mountain configuration from environment variables
 */
export declare function loadMountainConfigFromEnv(): MountainConfig;
/**
 * Validate Mountain configuration
 */
export declare function validateMountainConfig(config: MountainConfig): string[];
/**
 * Create Mountain configuration with validation
 */
export declare function createMountainConfig(overrides?: Partial<MountainConfig>): MountainConfig;
/**
 * Get Mountain configuration summary
 */
export declare function getMountainConfigSummary(config: MountainConfig): string;
//# sourceMappingURL=MountainConfig.d.ts.map