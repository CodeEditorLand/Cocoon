/**
 * @module Configuration
 * @description
 * Cocoon's configuration service implementation.
 * Manages configuration synchronization with Mountain and provides configuration
 * values to extensions.
 *
 * Responsibilities:
 * - Synchronize configuration with Mountain backend
 * - Provide configuration values to extensions with proper scoping
 * - Validate configuration keys and values
 * - Handle configuration change notifications
 * - Implement conflict resolution with retry logic
 * - Support multiple configuration scopes (APPLICATION, WORKSPACE, PROFILE)
 *
 * Based on VSCode's ConfigurationService pattern.
 * Specification: ARCHITECTURE-SPECIFICATION.md (Configuration Service)
 *
 * @future TODO: Implement incremental configuration updates from Mountain
 * @future TODO: Add configuration migration support for version upgrades
 * @future TODO: Implement configuration schema validation
 */
import { Layer } from "effect";
import { IConfigurationService, type ConfigurationChangeEvent } from "../Interfaces/IConfigurationService";
import { IIPCService } from "../Interfaces/IIPCService";
declare enum ConfigurationScope {
    APPLICATION = "APPLICATION",
    WORKSPACE = "WORKSPACE",
    PROFILE = "PROFILE"
}
interface IConfigurationValue<T> {
    key: string;
    value?: T;
    defaultValue?: T;
}
/**
 * ConfigurationService implementation
 */
export declare class Configuration implements IConfigurationService {
    readonly _serviceBrand: undefined;
    private configuration;
    private ipcService;
    private listeners;
    constructor(ipcService: IIPCService);
    /**
     * Initialize the configuration service
     */
    initialize(): Promise<void>;
    /**
     * Get configuration value
     */
    getValue<T>(key: string, scope: ConfigurationScope, defaultValue?: T): T | undefined;
    /**
     * Set configuration value
     */
    setValue<T>(key: string, value: T, scope: ConfigurationScope): Promise<void>;
    /**
     * Validate configuration key
     */
    private validateConfigurationKey;
    /**
     * Validate configuration value
     */
    private validateConfigurationValue;
    /**
     * Validate entire configuration scope
     */
    validateScopeConfiguration(scope: ConfigurationScope): boolean;
    /**
     * Update configuration value
     */
    updateValue<T>(key: string, updateFn: (currentValue: T | undefined) => T, scope: ConfigurationScope): Promise<void>;
    /**
     * Check if configuration key exists
     */
    hasKey(key: string, scope: ConfigurationScope): boolean;
    /**
     * Get all configuration keys for a scope
     */
    getConfigurationKeys(scope: ConfigurationScope): string[];
    /**
     * Get all configuration values for a scope
     */
    getAllValues(scope: ConfigurationScope): Promise<Record<string, any>>;
    /**
     * Inspect configuration value
     */
    inspect<T>(key: string, scope?: ConfigurationScope): IConfigurationValue<T>;
    /**
     * Listen for configuration changes
     * @future TODO: Implement full event emitter with key filtering and subscription management
     */
    onDidChangeConfiguration(callback: (event: ConfigurationChangeEvent) => void): void;
    /**
     * Reload configuration from Mountain
     */
    reloadConfiguration(): Promise<void>;
    /**
     * Handle configuration conflicts with retry logic
     */
    private handleConfigurationConflict;
    /**
     * Cleanup configuration service
     */
    cleanup(): Promise<void>;
    /**
     * Get nested value from configuration object
     */
    private getNestedValue;
    /**
     * Set nested value in configuration object
     */
    private setNestedValue;
    /**
     * Collect all configuration keys
     */
    private collectKeys;
    /**
     * Notify configuration change listeners
     */
    private notifyConfigurationChange;
}
/**
 * Service layer for Configuration
 */
export declare const ConfigurationLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const ConfigurationLive: Layer.Layer<unknown, never, never>;
export {};
//# sourceMappingURL=Configuration.d.ts.map