/**
 * @module Configuration
 * @description
 * Cocoon's configuration service implementation.
 * Manages configuration synchronization with Mountain via the Universal Spine (gRPC).
 *
 * Responsibilities:
 * - Synchronize configuration with Mountain backend via 'config.get' and 'config.update'
 * - Provide configuration values to extensions with proper scoping
 * - Support multiple configuration scopes (APPLICATION, WORKSPACE, PROFILE)
 */

import { Effect, Layer } from "effect";

import {
	IConfigurationService,
	type ConfigurationChangeEvent,
} from "../Interfaces/IConfigurationService.js";
import { IIPCService } from "../Interfaces/IIPCService.js";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";

// Configuration scopes
enum ConfigurationScope {
	APPLICATION = 0,
	WORKSPACE = 1,
	PROFILE = 2,
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
export class Configuration implements IConfigurationService {
	readonly _serviceBrand: undefined;

	private configuration: Map<string, any>;
	private mountainClient: IMountainClientService;
	private listeners: Map<string, ((changes: any[]) => void)[]>;

	constructor(mountainClient: IMountainClientService) {
		this._serviceBrand = undefined;
		this.mountainClient = mountainClient;
		this.configuration = new Map();
		this.listeners = new Map();

		console.log(
			"[ConfigurationService] Initializing configuration service with Universal Spine",
		);
	}

	/**
	 * Initialize the configuration service by fetching from Mountain
	 */
	async initialize(): Promise<void> {
		console.log("[ConfigurationService] Loading initial configuration from Spine...");

		try {
			// Fetch full configuration from Mountain
			// Maps to 'config.reload' in Spine
			const configData = await this.mountainClient.sendRequest(
				"config.reload",
				{},
			);

            // TODO: Parse configData into internal map
			console.log("[ConfigurationService] Configuration loaded from Spine", configData);

		} catch (error) {
			console.error(
				"[ConfigurationService] Failed to load configuration from Spine:",
				error,
			);
		}
	}

	/**
	 * Get configuration value
	 */
	getValue<T>(
		key: string,
		scope: ConfigurationScope = ConfigurationScope.APPLICATION,
		defaultValue?: T,
	): T | undefined {
        // For now, we fetch synchronously from cache
        // In future, we might allow async fetch for missing keys
		const value = this.configuration.get(key);
		return value !== undefined ? value : defaultValue;
	}

	/**
	 * Set configuration value
	 */
	async setValue<T>(
		key: string,
		value: T,
		scope: ConfigurationScope,
	): Promise<void> {
		
        // Update local cache
        this.configuration.set(key, value);

        // Send update to Spine
        // Maps to 'config.update' in Spine
        try {
            await this.mountainClient.sendRequest("config.update", {
                key,
                value,
                scope: scope as number // Cast enum to number for Spine
            });
            console.log(`[ConfigurationService] Synced ${key} to Spine`);
            
            // Notify listeners
            this.notifyConfigurationChange([key], scope);

        } catch (error) {
            console.error(`[ConfigurationService] Failed to sync ${key} to Spine:`, error);
        }
	}

	// ... (Helper methods for validation/listeners remain similar) ...

    onDidChangeConfiguration(callback: (event: ConfigurationChangeEvent) => void): void {
         let globalListeners = this.listeners.get("*");
        if (!globalListeners) {
            globalListeners = [];
            this.listeners.set("*", globalListeners);
        }
        globalListeners.push(callback);
    }

    private notifyConfigurationChange(keys: string[], scope: any): void {
         const listeners = this.listeners.get("*");
         if (listeners) {
             for (const listener of listeners) {
                 listener([{ key: keys[0], scope }]);
             }
         }
    }
}

/**
 * Service layer for Configuration
 */
export const ConfigurationLayer = Layer.effect(
	IConfigurationService,
	Effect.gen(function* () {
        const mountainClient = yield* IMountainClientService;
        const configService = new Configuration(mountainClient);
        
        // Auto-initialize
        yield* Effect.promise(() => configService.initialize());
        
        return configService;
    }),
);

/**
 * Live implementation
 */
export const ConfigurationLive = ConfigurationLayer;
