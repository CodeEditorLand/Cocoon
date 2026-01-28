/**
 * @module ServiceMapping
 * @description
 * Service mapping registry for Cocoon's dependency injection system.
 * This follows Wind's pattern for managing service dependencies and layer composition.
 * 
 * Architecture:
 * 1. Service descriptor registry for dependency tracking
 * 2. Layer composition system for Effect-TS services
 * 3. Integration with Mountain's service system
 * 
 * TODOs:
 * - Implement actual service descriptors
 * - Create layer composition logic
 * - Integrate with Mountain services
 */

import { Effect, Layer, Context } from "effect";

// --- Service Tags ---

/**
 * Configuration Service Tag
 * Manages configuration settings for extensions
 */
export class ConfigurationService extends Context.Tag("Service/Configuration")<
  ConfigurationService,
  {
    readonly getValue: <T>(
      key: string,
      defaultValue?: T,
      scope?: number
    ) => T;
    readonly updateValue: (
      key: string,
      value: any,
      scope?: number
    ) => Promise<void>;
    readonly inspect: <T>(
      key: string,
      scope?: number
    ) => any;
    readonly keys: () => string[];
    readonly reloadConfiguration: () => Promise<void>;
  }
>() {}

/**
 * Extension Host Service Tag
 * Manages extension lifecycle and activation
 */
export class ExtensionHostService extends Context.Tag("Service/ExtensionHost")<
  ExtensionHostService,
  {
    readonly activateExtension: (
      extensionId: string,
      activationEvent: string
    ) => Effect.Effect<void>;
    readonly deactivateExtension: (
      extensionId: string
    ) => Effect.Effect<void>;
    readonly getExtensionExports: (
      extensionId: string
    ) => Effect.Effect<any>;
  }
>() {}

/**
 * API Factory Service Tag
 * Constructs the vscode API object for extensions
 */
export class APIFactoryService extends Context.Tag("Service/APIFactory")<
  APIFactoryService,
  {
    readonly createVSCodeAPI: (
      extensionId: string
    ) => Effect.Effect<any>;
    readonly getAPI: (
      extensionId: string
    ) => Effect.Effect<any>;
  }
>() {}

/**
 * IPC Service Tag
 * Handles communication with Mountain via gRPC
 */
export class IPCService extends Context.Tag("Service/IPC")<
  IPCService,
  {
    readonly sendRequest: <T>(
      method: string,
      params: any[]
    ) => Effect.Effect<T>;
    readonly sendNotification: (
      method: string,
      params: any[]
    ) => Effect.Effect<void>;
    readonly registerHandler: (
      method: string,
      handler: (...args: any[]) => Promise<any>
    ) => Effect.Effect<void>;
  }
>() {}

/**
 * Module Interceptor Service Tag
 * Intercepts require('vscode') and ESM imports
 */
export class ModuleInterceptorService extends Context.Tag("Service/ModuleInterceptor")<
  ModuleInterceptorService,
  {
    readonly install: () => Effect.Effect<void>;
    readonly uninstall: () => Effect.Effect<void>;
    readonly intercept: (
      moduleId: string
    ) => Effect.Effect<any>;
  }
>() {}

// --- Service Descriptors ---

/**
 * Service descriptor interface
 * Defines service dependencies and implementation
 */
export interface ServiceDescriptor<T> {
  readonly tag: Context.Tag<T>;
  readonly dependencies: readonly Context.Tag<any>[];
  readonly implementation: Effect.Effect<T>;
}

/**
 * Service mapping registry
 * Manages service dependencies and layer composition
 */
export class ServiceMapping {
  private readonly descriptors = new Map<string, ServiceDescriptor<any>>();
  private readonly layers = new Map<string, Layer.Layer<any>>();

  constructor() {
    console.log("[ServiceMapping] Initializing service mapping registry");
    this.registerCoreServices();
  }

  /**
   * Register a service descriptor
   */
  register<T>(descriptor: ServiceDescriptor<T>): void {
    const key = descriptor.tag.key;
    console.log(`[ServiceMapping] Registering service: ${key}`);
    
    this.descriptors.set(key, descriptor);
    
    // Create layer from descriptor
    const layer = Layer.effect(descriptor.tag, descriptor.implementation);
    this.layers.set(key, layer);
  }

  /**
   * Get service layer by tag
   */
  getLayer<T>(tag: Context.Tag<T>): Layer.Layer<T> | undefined {
    return this.layers.get(tag.key);
  }

  /**
   * Get all registered layers
   */
  getAllLayers(): Layer.Layer<any>[] {
    return Array.from(this.layers.values());
  }

  /**
   * Compose application layer from all registered services
   */
  composeAppLayer(): Layer.Layer<any> {
    console.log("[ServiceMapping] Composing application layer");
    
    const layers = this.getAllLayers();
    if (layers.length === 0) {
      return Layer.succeed("EmptyLayer", {});
    }

    return Layer.mergeAll(...layers);
  }

  /**
   * Register core Cocoon services
   */
  private registerCoreServices(): void {
    console.log("[ServiceMapping] Registering core services");

    // Configuration Service (minimal dependencies)
    this.register({
      tag: ConfigurationService,
      dependencies: [IPCService],
      implementation: Effect.gen(function* () {
        const IPC = yield* IPCService;
        
        // Load initial configuration from Mountain
        const initialConfiguration = yield* Effect.tryPromise({
          try: () => IPC.sendRequest("configuration:get", []),
          catch: (error) => new Error(`Failed to load initial configuration: ${error}`)
        });

        // Configuration storage
        const configuration = new Map<number, Record<string, any>>();
        
        // Initialize with loaded configuration
        if (initialConfiguration.application) {
          configuration.set(1, initialConfiguration.application);
        }
        if (initialConfiguration.workspace) {
          configuration.set(2, initialConfiguration.workspace);
        }
        if (initialConfiguration.profile) {
          configuration.set(3, initialConfiguration.profile);
        }

        return {
          getValue: <T>(key: string, defaultValue?: T, scope: number = 1): T => {
            const scopeConfig = configuration.get(scope);
            if (!scopeConfig) {
              return defaultValue as T;
            }

            const value = getNestedValue(scopeConfig, key);
            return value !== undefined ? value : defaultValue as T;
          },

          updateValue: async (key: string, value: any, scope: number = 1): Promise<void> => {
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
              } catch (error) {
                throw error;
              }
            }
          },

          inspect: <T>(key: string, scope: number = 1): any => {
            const scopeConfig = configuration.get(scope);
            if (!scopeConfig) {
              return { key };
            }

            const value = getNestedValue(scopeConfig, key);
            return {
              key,
              value
            };
          },

          keys: (): string[] => {
            const keys: string[] = [];
            
            for (const [, config] of configuration) {
              collectKeys(config, '', keys);
            }
            
            return Array.from(new Set(keys));
          },

          reloadConfiguration: async (): Promise<void> => {
            try {
              const newConfiguration = await IPC.sendRequest("configuration:get", []);
              
              // Update configuration
              if (newConfiguration.application) {
                configuration.set(1, newConfiguration.application);
              }
              if (newConfiguration.workspace) {
                configuration.set(2, newConfiguration.workspace);
              }
              if (newConfiguration.profile) {
                configuration.set(3, newConfiguration.profile);
              }
            } catch (error) {
              throw error;
            }
          }
        };
      }),
    });

    // IPC Service (minimal dependencies)
    this.register({
      tag: IPCService,
      dependencies: [],
      implementation: Effect.succeed({
        sendRequest: () => Effect.succeed(undefined as any),
        sendNotification: () => Effect.void,
        registerHandler: () => Effect.void,
      }),
    });

    // Module Interceptor Service
    this.register({
      tag: ModuleInterceptorService,
      dependencies: [APIFactoryService],
      implementation: Effect.succeed({
        install: () => Effect.void,
        uninstall: () => Effect.void,
        intercept: () => Effect.succeed({}),
      }),
    });

    // API Factory Service
    this.register({
      tag: APIFactoryService,
      dependencies: [],
      implementation: Effect.succeed({
        createVSCodeAPI: () => Effect.succeed({}),
        getAPI: () => Effect.succeed({}),
      }),
    });

    // Extension Host Service
    this.register({
      tag: ExtensionHostService,
      dependencies: [APIFactoryService, IPCService, ConfigurationService],
      implementation: Effect.succeed({
        activateExtension: () => Effect.void,
        deactivateExtension: () => Effect.void,
        getExtensionExports: () => Effect.succeed(undefined),
      }),
    });

    console.log(`[ServiceMapping] Registered ${this.descriptors.size} services`);
  }

  // Utility functions for nested configuration
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
   * Validate service dependencies
   */
  validateDependencies(): Effect.Effect<void> {
    return Effect.gen(function* () {
      for (const [key, descriptor] of ServiceMapping.instance.descriptors) {
        console.log(`[ServiceMapping] Validating dependencies for: ${key}`);
        
        for (const dependency of descriptor.dependencies) {
          if (!ServiceMapping.instance.layers.has(dependency.key)) {
            yield* Effect.logError(`Missing dependency: ${dependency.key} for ${key}`);
            return Effect.fail(new Error(`Missing dependency: ${dependency.key}`));
          }
        }
      }
      
      yield* Effect.logInfo("[ServiceMapping] All dependencies validated successfully");
      return Effect.void;
    });
  }

  /**
   * Get service instance
   */
  getService<T>(tag: Context.Tag<T>): Effect.Effect<T> {
    const layer = this.getLayer(tag);
    if (!layer) {
      return Effect.fail(new Error(`Service not found: ${tag.key}`));
    }

    return Effect.gen(function* () {
      const service = yield* tag;
      return service;
    }).pipe(Effect.provide(layer));
  }
}

// Singleton instance
export const ServiceMappingInstance = new ServiceMapping();
