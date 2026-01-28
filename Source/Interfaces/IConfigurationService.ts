/**
 * @module IConfigurationService
 * @description
 * Interface for Cocoon's configuration service.
 * Based on VSCode's configuration patterns.
 */

import { Context } from "effect";

// Configuration scopes matching VSCode patterns
export enum ConfigurationScope {
    APPLICATION = 'APPLICATION',
    WORKSPACE = 'WORKSPACE',
    PROFILE = 'PROFILE'
}

export interface ConfigurationChangeEvent {
    affectedKeys: string[];
    scope: ConfigurationScope;
}

export interface IConfigurationService {
    readonly _serviceBrand: undefined;
    
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
     * Listen for configuration changes
     */
    onDidChangeConfiguration(callback: (event: ConfigurationChangeEvent) => void): void;
    
    /**
     * Get all configuration keys
     */
    getConfigurationKeys(scope: ConfigurationScope): string[];
    
    /**
     * Check if configuration key exists
     */
    hasKey(key: string, scope: ConfigurationScope): boolean;
    
    /**
     * Cleanup configuration service
     */
    cleanup?(): Promise<void>;
}

/**
 * Effect context for ConfigurationService
 */
export const IConfigurationService = Context.GenericTag<IConfigurationService>("IConfigurationService");