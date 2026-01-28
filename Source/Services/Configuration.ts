/**
 * @module Configuration
 * @description
 * Configuration service for Cocoon extension host.
 * Follows VSCode's IConfigurationService interface for compatibility.
 * Integrates with Mountain's configuration system via gRPC.
 * 
 * VSCode Source Reference: `vs/platform/configuration/common/configuration.ts`
 * Architecture:
 * - Configuration retrieval and updates
 * - Change event propagation
 * - Scope-based configuration (APPLICATION, WORKSPACE, PROFILE)
 * - Integration with Mountain's configuration system
 */

import { Effect, Layer } from "effect";
import { IConfigurationService, ConfigurationScope, ConfigurationChangeEvent } from "../Interfaces/IConfigurationService";
import { IIPCService } from "../Interfaces/IIPCService";
import { ServiceMapping } from "../ServiceMapping";

// --- Configuration Types ---

/**
 * Configuration value inspection
 */
export interface IConfigurationValue<T> {
  readonly key: string;
  readonly value?: T;
  readonly defaultValue?: T;
  readonly userValue?: T;
  readonly workspaceValue?: T;
  readonly workspaceFolderValue?: T;
}

/**
 * Configuration service implementation
 */
export class ConfigurationService implements IConfigurationService {
    private readonly _serviceBrand: undefined;
    
    private configuration: Map<ConfigurationScope, Record<string, any>> = new Map();
    private ipcService: IIPCService;
    private eventListeners: ((event: ConfigurationChangeEvent) => void)[] = [];
    
    constructor(ipcService: IIPCService) {
        this.ipcService = ipcService;
        console.log("[ConfigurationService] Configuration service created");
    }
    
    /**
     * Initialize the configuration service
     */
    async initialize(): Promise<void> {
        console.log("[ConfigurationService] Initializing configuration service");
        
        try {
            // Load initial configuration from Mountain
            const response = await this.ipcService.send("configuration:get", {});
            const initialConfiguration = response.data;
            
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
        
        // TODO: Implement configuration synchronization with Wind
        // Specification: ARCHITECTURE-SPECIFICATION.md (Configuration Service)
        // Implementation: Real-time sync with Wind's configuration system
        // Dependencies: Wind configuration API, change detection service
        // Validation: Test configuration consistency across systems
     */
    getValue<T>(key: string, scope: ConfigurationScope, defaultValue?: T): T | undefined {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return defaultValue;
        }

        const value = getNestedValue(scopeConfig, key);
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

        const oldValue = getNestedValue(scopeConfig, key);
        
        if (oldValue !== value) {
            setNestedValue(scopeConfig, key, value);
            
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
                console.error(`[ConfigurationService] Failed to update configuration: ${error}`);
                
                // TODO: Implement circuit breaker pattern for Mountain communication
                // Specification: ARCHITECTURE-SPECIFICATION.md (IPC Bridge Service)
                // Implementation: Exponential backoff with fallback storage
                // Dependencies: Circuit breaker service, local storage fallback
                // Validation: Test network failure scenarios
                
                throw error;
            }
        }
    }
    
    /**
     * Update configuration value
     */
    async updateValue<T>(key: string, updateFn: (currentValue: T | undefined) => T, scope: ConfigurationScope): Promise<void> {
        const currentValue = this.getValue<T>(key, scope);
        const newValue = updateFn(currentValue);
        await this.setValue(key, newValue, scope);
    }
    
    /**
     * Listen for configuration changes
     */
    onDidChangeConfiguration(callback: (event: ConfigurationChangeEvent) => void): void {
        this.eventListeners.push(callback);
        console.log("[ConfigurationService] Configuration change listener added");
    }
    
    /**
     * Get all configuration keys
     */
    getConfigurationKeys(scope: ConfigurationScope): string[] {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return [];
        }
        
        const keys: string[] = [];
        collectKeys(scopeConfig, '', keys);
        return keys;
    }
    
    /**
     * Check if configuration key exists
     */
    hasKey(key: string, scope: ConfigurationScope): boolean {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return false;
        }
        
        const value = getNestedValue(scopeConfig, key);
        return value !== undefined;
    }
    
    /**
     * Cleanup configuration service
     */
    async cleanup(): Promise<void> {
        console.log("[ConfigurationService] Cleaning up configuration service");
        this.eventListeners = [];
        this.configuration.clear();
        console.log("[ConfigurationService] Configuration service cleaned up");
    }
    
    /**
     * Notify listeners about configuration changes
     */
    private notifyConfigurationChange(affectedKeys: string[], scope: ConfigurationScope): void {
        const event = new ConfigurationChangeEvent(affectedKeys, scope);
        
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error("[ConfigurationService] Error in configuration change listener:", error);
            }
        }
    }
    
    /**
     * Reload configuration from Mountain
     */
    async reloadConfiguration(): Promise<void> {
        console.log("[ConfigurationService] Reloading configuration");
        
        try {
            const response = await this.ipcService.send("configuration:get", {});
            const newConfiguration = response.data;
            
            // Update configuration
            if (newConfiguration.application) {
                this.configuration.set(ConfigurationScope.APPLICATION, newConfiguration.application);
            }
            if (newConfiguration.workspace) {
                this.configuration.set(ConfigurationScope.WORKSPACE, newConfiguration.workspace);
            }
            if (newConfiguration.profile) {
                this.configuration.set(ConfigurationScope.PROFILE, newConfiguration.profile);
            }
            
            console.log("[ConfigurationService] Configuration reloaded successfully");
        } catch (error) {
            console.error("[ConfigurationService] Failed to reload configuration:", error);
            throw error;
        }
    }
    
    /**
     * Inspect configuration value
     */
    inspect<T>(key: string, scope: ConfigurationScope = ConfigurationScope.APPLICATION): IConfigurationValue<T> {
        const scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
            return { key } as IConfigurationValue<T>;
        }

        const value = getNestedValue(scopeConfig, key);
        return {
            key,
            value
        } as IConfigurationValue<T>;
    }
    
    /**
     * Get all keys across all scopes
     */
    keys(): string[] {
        const keys: string[] = [];
        
        for (const [scope, config] of this.configuration) {
            collectKeys(config, '', keys);
        }
        
        return Array.from(new Set(keys)); // Remove duplicates
    }
}

// --- Utility Functions ---

/**
 * Get nested value from configuration object
 */
function getNestedValue(obj: any, key: string): any {
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
function setNestedValue(obj: any, key: string, value: any): void {
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
 * Recursively collect configuration keys
 */
function collectKeys(obj: any, prefix: string, keys: string[]): void {
  for (const key in obj) {
    if (key.startsWith('_')) continue; // Skip metadata keys
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      collectKeys(obj[key], fullKey, keys);
    } else {
      keys.push(fullKey);
    }
  }
}

/**
 * Configuration change event implementation
 */
export class ConfigurationChangeEvent implements ConfigurationChangeEvent {
    constructor(
        public readonly affectedKeys: string[],
        public readonly scope: ConfigurationScope
    ) {}

    affectsConfiguration(section: string): boolean {
        for (const key of this.affectedKeys) {
            if (key === section || key.startsWith(section + '.')) {
                return true;
            }
        }
        return false;
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

// --- Utility Functions ---

/**
 * Get nested value from configuration object
 */
function getNestedValue(obj: any, key: string): any {
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
function setNestedValue(obj: any, key: string, value: any): void {
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
 * Recursively collect configuration keys
 */
function collectKeys(obj: any, prefix: string, keys: string[]): void {
  for (const key in obj) {
    if (key.startsWith('_')) continue; // Skip metadata keys
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      collectKeys(obj[key], fullKey, keys);
    } else {
      keys.push(fullKey);
    }
  }
}

/**
 * Configuration change event implementation
 */
export class ConfigurationChangeEvent implements IConfigurationChangeEvent {
  constructor(public readonly changedConfiguration: Set<string>) {}

  affectsConfiguration(section: string): boolean {
    for (const changed of this.changedConfiguration) {
      if (changed === section || changed.startsWith(section + '.')) {
        return true;
      }
    }
    return false;
  }
}
