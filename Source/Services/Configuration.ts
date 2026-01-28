/**
 * @module ConfigurationService
 * @description
 * Cocoon's configuration service implementation.
 * Manages configuration synchronization with Mountain and provides configuration
 * values to extensions.
 * 
 * Based on VSCode's ConfigurationService pattern.
 */

import { Effect, Layer } from "effect";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { ServiceMapping } from "../ServiceMapping";
import { IIPCService } from "../Interfaces/IIPCService";

// Configuration scopes
enum ConfigurationScope {
    APPLICATION = "APPLICATION",
    WORKSPACE = "WORKSPACE", 
    PROFILE = "PROFILE"
}

// Configuration value interface
interface IConfigurationValue<T> {
    key: string;
    value?: T;
    defaultValue?: T;
}

/**
 * ConfigurationService implementation
 */
export class ConfigurationService implements IConfigurationService {
    private readonly _serviceBrand: undefined;
    
    private configuration: Map<ConfigurationScope, any>;
    private ipcService: IIPCService;
    private listeners: Map<string, ((changes: any[]) => void)[]>;
    
    constructor(ipcService: IIPCService) {
        this.ipcService = ipcService;
        this.configuration = new Map();
        this.listeners = new Map();
        
        console.log('[ConfigurationService] Initializing configuration service');
    }
    
    /**
     * Initialize the configuration service
     */
    async initialize(): Promise<void> {
        console.log('[ConfigurationService] Loading initial configuration');
        
        try {
            // Load initial configuration from Mountain
            const initialConfiguration = await this.ipcService.send(
                'configuration:load', 
                {}
            );
            
            // Initialize with loaded configuration
            if (initialConfiguration.application) {
                this.configuration.set(ConfigurationScope.APPLICATION, initialConfiguration.application);
            }
            if (initialConfiguration.workspace) {
                this.configuration.set(ConfigurationScope.WORKSPACE, initialConfiguration.workspace);
            }
            if (initialConfiguration.profile) {
                this.configuration.set(ConfigurationScope.PROFILE, initialConfiguration.profile);
            }
        } catch (error) {
            console.error('[ConfigurationService] Failed to load initial configuration:', error);
            // Initialize with empty configuration
            this.configuration.set(ConfigurationScope.APPLICATION, {});
            this.configuration.set(ConfigurationScope.WORKSPACE, {});
            this.configuration.set(ConfigurationScope.PROFILE, {});
        }
        
        console.log('[ConfigurationService] Configuration service initialized');
    }
    
    /**
     * Get configuration value
     */
    getValue<T>(key: string, scope: ConfigurationScope, defaultValue?: T): T | undefined {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return defaultValue;
        }

        const value = this.getNestedValue(scopeConfig, key);
        return value !== undefined ? value : defaultValue;
    }
    
    /**
     * Set configuration value
     */
    async setValue<T>(key: string, value: T, scope: ConfigurationScope): Promise<void> {
        let scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            scopeConfig = {};
            this.configuration.set(scope, scopeConfig);
        }
        
        const oldValue = this.getNestedValue(scopeConfig, key);
        
        if (oldValue !== value) {
            this.setNestedValue(scopeConfig, key, value);
            
            // Update timestamp
            scopeConfig._timestamp = Date.now();
            scopeConfig._version = (scopeConfig._version || 0) + 1;

            // Save to Mountain
            try {
                await this.ipcService.send("configuration:update", {
                    scope, 
                    key, 
                    value
                });
                console.log(`[ConfigurationService] Configuration updated: ${key} = ${value}`);
                
                // Notify listeners
                this.notifyConfigurationChange([key], scope);
                
            } catch (error) {
                console.error(`[ConfigurationService] Failed to update configuration: ${key}`, error);
                throw error;
            }
        }
    }
    
    /**
     * Check if configuration key exists
     */
    hasValue(key: string, scope: ConfigurationScope): boolean {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return false;
        }
        
        const value = this.getNestedValue(scopeConfig, key);
        return value !== undefined;
    }
    
    /**
     * Get all configuration values for a scope
     */
    async getAllValues(scope: ConfigurationScope): Promise<Record<string, any>> {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return {};
        }

        const result: Record<string, any> = {};
        this.collectKeys(scopeConfig, "", Object.keys(result));
        
        for (const key of Object.keys(result)) {
            result[key] = this.getNestedValue(scopeConfig, key);
        }
        
        return result;
    }
    
    /**
     * Inspect configuration value
     */
    inspect<T>(key: string, scope: ConfigurationScope = ConfigurationScope.APPLICATION): IConfigurationValue<T> {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return { key } as IConfigurationValue<T>;
        }

        const value = this.getNestedValue(scopeConfig, key);
        return {
            key,
            value
        } as IConfigurationValue<T>;
    }
    
    /**
     * Watch for configuration changes
     */
    onDidChangeConfiguration(key: string, scope: ConfigurationScope, callback: (value: any) => void): void {
        const eventKey = `${scope}.${key}`;
        
        if (!this.listeners.has(eventKey)) {
            this.listeners.set(eventKey, []);
        }
        
        this.listeners.get(eventKey)!.push(callback);
    }
    
    /**
     * Cleanup configuration service
     */
    async cleanup(): Promise<void> {
        console.log('[ConfigurationService] Cleaning up configuration service');
        
        this.listeners.clear();
        this.configuration.clear();
        
        console.log('[ConfigurationService] Configuration service cleaned up');
    }
    
    /**
     * Get nested value from configuration object
     */
    private getNestedValue(obj: any, key: string): any {
        const keys = key.split('.');
        let current = obj;

        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return undefined;
            }
        }

        return current;
    }
    
    /**
     * Set nested value in configuration object
     */
    private setNestedValue(obj: any, key: string, value: any): void {
        const keys = key.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;
    }
    
    /**
     * Collect all configuration keys
     */
    private collectKeys(obj: any, prefix: string, keys: string[]): void {
        for (const key in obj) {
            if (key.startsWith('_')) continue;
            
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.collectKeys(obj[key], fullKey, keys);
            } else {
                keys.push(fullKey);
            }
        }
    }
    
    /**
     * Notify configuration change listeners
     */
    private notifyConfigurationChange(keys: string[], scope: ConfigurationScope): void {
        for (const key of keys) {
            const eventKey = `${scope}.${key}`;
            const listeners = this.listeners.get(eventKey);
            
            if (listeners) {
                for (const listener of listeners) {
                    try {
                        listener([{ key, scope }]);
                    } catch (error) {
                        console.error(`[ConfigurationService] Error in listener for ${eventKey}:`, error);
                    }
                }
            }
        }
    }
}

/**
 * Service layer for ConfigurationService
 */
export const ConfigurationServiceLayer = Layer.effect(
    IConfigurationService,
    Effect.gen(function* () {
        const ipcService = yield* ServiceMapping.getService(IIPCService);
        return new ConfigurationService(ipcService);
    })
);

/**
 * Live implementation
 */
export const ConfigurationServiceLive = Layer.effect(
    IConfigurationService,
    Effect.gen(function* () {
        const ipcService = yield* ServiceMapping.getService(IIPCService);
        return new ConfigurationService(ipcService);
    })
);
