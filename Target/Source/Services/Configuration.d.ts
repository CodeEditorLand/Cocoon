/**
 * @module ConfigurationService
 * @description
 * Cocoon's configuration service implementation.
 * Manages configuration synchronization with Mountain and provides configuration
 * values to extensions.
 *
 * Based on VSCode's ConfigurationService pattern.
 */
import { Layer } from "effect";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import type { ConfigurationChangeEvent } from "../Interfaces/IConfigurationService";
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
export declare class ConfigurationService implements IConfigurationService {
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
     */
    onDidChangeConfiguration(_callback: (event: ConfigurationChangeEvent) => void): void;
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
 * Service layer for ConfigurationService
 */
export declare const ConfigurationServiceLayer: Layer.Layer<unknown, never, never>;
/**
 * Live implementation
 */
export declare const ConfigurationServiceLive: Layer.Layer<unknown, never, never>;
export {};
//# sourceMappingURL=Configuration.d.ts.map