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

import { Effect } from "effect";
import { IPCService } from "../Bootstrap/Implementation/ServiceMapping.js";

// --- Configuration Types ---

/**
 * Configuration scope
 */
export enum ConfigurationScope {
  APPLICATION = 1,
  WORKSPACE = 2,
  PROFILE = 3
}

/**
 * Configuration change event
 */
export interface IConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
  readonly changedConfiguration: Set<string>;
}

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
 * Configuration overrides
 */
export interface IConfigurationOverrides {
  readonly resource?: any;
  readonly overrideIdentifier?: string;
}

/**
 * Configuration service interface
 * Matches VSCode's IConfigurationService
 */
export interface IConfigurationService {
  getValue<T>(key: string, defaultValue?: T, scope?: ConfigurationScope): T;
  updateValue(key: string, value: any, scope?: ConfigurationScope): Promise<void>;
  inspect<T>(key: string, scope?: ConfigurationScope): IConfigurationValue<T>;
  keys(): string[];
  reloadConfiguration(): Promise<void>;
  onDidChangeConfiguration: any; // Event<IConfigurationChangeEvent>
}

/**
 * Configuration service implementation
 */
export class ConfigurationService extends Effect.Service<IConfigurationService>()(
  "Service/Configuration",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      
      // Load initial configuration from Mountain
      const initialConfiguration = yield* Effect.tryPromise({
        try: () => IPC.sendRequest("configuration:get", []),
        catch: (error) => new Error(`Failed to load initial configuration: ${error}`)
      });

      // Configuration storage
      const configuration = new Map<ConfigurationScope, Record<string, any>>();
      
      // Initialize with loaded configuration
      if (initialConfiguration.application) {
        configuration.set(ConfigurationScope.APPLICATION, initialConfiguration.application);
      }
      if (initialConfiguration.workspace) {
        configuration.set(ConfigurationScope.WORKSPACE, initialConfiguration.workspace);
      }
      if (initialConfiguration.profile) {
        configuration.set(ConfigurationScope.PROFILE, initialConfiguration.profile);
      }

      console.log("[ConfigurationService] Configuration loaded successfully");

      const service: IConfigurationService = {
        getValue<T>(key: string, defaultValue?: T, scope: ConfigurationScope = ConfigurationScope.APPLICATION): T {
          const scopeConfig = configuration.get(scope);
          if (!scopeConfig) {
            return defaultValue as T;
          }

          const value = getNestedValue(scopeConfig, key);
          return value !== undefined ? value : defaultValue as T;
        },

        async updateValue(key: string, value: any, scope: ConfigurationScope = ConfigurationScope.APPLICATION): Promise<void> {
          let scopeConfig = configuration.get(scope);
          if (!scopeConfig) {
            scopeConfig = {};
            configuration.set(scope, scopeConfig);
          }

          const oldValue = getNestedValue(scopeConfig, key);
          
          if (oldValue !== value) {
            setNestedValue(scopeConfig, key, value);
            
            // Update timestamp
            scopeConfig._timestamp = Date.now();
            scopeConfig._version = (scopeConfig._version || 0) + 1;

            // Save to Mountain
            try {
              await IPC.sendRequest("configuration:update", [
                { scope, key, value }
              ]);
              console.log(`[ConfigurationService] Configuration updated: ${key} = ${value}`);
            } catch (error) {
              console.error(`[ConfigurationService] Failed to update configuration: ${error}`);
              throw error;
            }
          }
        },

        inspect<T>(key: string, scope: ConfigurationScope = ConfigurationScope.APPLICATION): IConfigurationValue<T> {
          const scopeConfig = configuration.get(scope);
          if (!scopeConfig) {
            return { key } as IConfigurationValue<T>;
          }

          const value = getNestedValue(scopeConfig, key);
          return {
            key,
            value
          } as IConfigurationValue<T>;
        },

        keys(): string[] {
          const keys: string[] = [];
          
          for (const [scope, config] of configuration) {
            collectKeys(config, '', keys);
          }
          
          return Array.from(new Set(keys)); // Remove duplicates
        },

        async reloadConfiguration(): Promise<void> {
          console.log("[ConfigurationService] Reloading configuration");
          
          try {
            const newConfiguration = await IPC.sendRequest("configuration:get", []);
            
            // Update configuration
            if (newConfiguration.application) {
              configuration.set(ConfigurationScope.APPLICATION, newConfiguration.application);
            }
            if (newConfiguration.workspace) {
              configuration.set(ConfigurationScope.WORKSPACE, newConfiguration.workspace);
            }
            if (newConfiguration.profile) {
              configuration.set(ConfigurationScope.PROFILE, newConfiguration.profile);
            }
            
            console.log("[ConfigurationService] Configuration reloaded successfully");
          } catch (error) {
            console.error("[ConfigurationService] Failed to reload configuration:", error);
            throw error;
          }
        },

        onDidChangeConfiguration: {
          // TODO: Implement proper event emitter
          addListener: (listener: (event: IConfigurationChangeEvent) => void) => {
            console.log("[ConfigurationService] Event listener added");
          },
          removeListener: (listener: (event: IConfigurationChangeEvent) => void) => {
            console.log("[ConfigurationService] Event listener removed");
          }
        }
      };

      return service;
    })
  }
) {}

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
