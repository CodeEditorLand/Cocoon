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

import {
	IConfigurationService,
	type ConfigurationChangeEvent,
} from "../Interfaces/IConfigurationService";
// import { ServiceMapping } from "../ServiceMapping";
import { IIPCService } from "../Interfaces/IIPCService";

// Configuration scopes
enum ConfigurationScope {
	APPLICATION = "APPLICATION",
	WORKSPACE = "WORKSPACE",
	PROFILE = "PROFILE",
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
	readonly _serviceBrand: undefined;

	private configuration: Map<ConfigurationScope, any>;
	private ipcService: IIPCService;
	private listeners: Map<string, ((changes: any[]) => void)[]>;

	constructor(ipcService: IIPCService) {
		this._serviceBrand = undefined;
		this.ipcService = ipcService;
		this.configuration = new Map();
		this.listeners = new Map();

		console.log(
			"[ConfigurationService] Initializing configuration service",
		);
	}

	/**
	 * Initialize the configuration service
	 */
	async initialize(): Promise<void> {
		console.log("[ConfigurationService] Loading initial configuration");

		try {
			// Load initial configuration from Mountain
			const initialConfiguration = await this.ipcService.send(
				"configuration:load",
				{},
			);

			// Initialize with loaded configuration
			if (initialConfiguration.data?.application) {
				this.configuration.set(
					ConfigurationScope.APPLICATION,
					initialConfiguration.data.application,
				);
			}
			if (initialConfiguration.data?.workspace) {
				this.configuration.set(
					ConfigurationScope.WORKSPACE,
					initialConfiguration.data.workspace,
				);
			}
			if (initialConfiguration.data?.profile) {
				this.configuration.set(
					ConfigurationScope.PROFILE,
					initialConfiguration.data.profile,
				);
			}
		} catch (error) {
			console.error(
				"[ConfigurationService] Failed to load initial configuration:",
				error,
			);
			// Initialize with empty configuration
			this.configuration.set(ConfigurationScope.APPLICATION, {});
			this.configuration.set(ConfigurationScope.WORKSPACE, {});
			this.configuration.set(ConfigurationScope.PROFILE, {});
		}

		console.log("[ConfigurationService] Configuration service initialized");
	}

	/**
	 * Get configuration value
	 */
	getValue<T>(
		key: string,
		scope: ConfigurationScope,
		defaultValue?: T,
	): T | undefined {
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
	async setValue<T>(
		key: string,
		value: T,
		scope: ConfigurationScope,
	): Promise<void> {
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
					value,
				});
				console.log(
					`[ConfigurationService] Configuration updated: ${key} = ${value}`,
				);

				// Notify listeners
				this.notifyConfigurationChange([key], scope);
			} catch (error) {
				console.error(
					`[ConfigurationService] Failed to update configuration: ${key}`,
					error,
				);
				throw error;
			}
		}
	}

	/**
	 * Update configuration value
	 */
	async updateValue<T>(
		key: string,
		updateFn: (currentValue: T | undefined) => T,
		scope: ConfigurationScope,
	): Promise<void> {
		const currentValue = this.getValue<T>(key, scope);
		const newValue = updateFn(currentValue);
		await this.setValue(key, newValue, scope);
	}

	/**
	 * Check if configuration key exists
	 */
	hasKey(key: string, scope: ConfigurationScope): boolean {
		const scopeConfig = this.configuration.get(scope);
		if (!scopeConfig) {
			return false;
		}

		const value = this.getNestedValue(scopeConfig, key);
		return value !== undefined;
	}

	/**
	 * Get all configuration keys for a scope
	 */
	getConfigurationKeys(scope: ConfigurationScope): string[] {
		const scopeConfig = this.configuration.get(scope);
		if (!scopeConfig) {
			return [];
		}

		const keys: string[] = [];
		this.collectKeys(scopeConfig, "", keys);
		return keys;
	}

	/**
	 * Get all configuration values for a scope
	 */
	async getAllValues(
		scope: ConfigurationScope,
	): Promise<Record<string, any>> {
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
	inspect<T>(
		key: string,
		scope: ConfigurationScope = ConfigurationScope.APPLICATION,
	): IConfigurationValue<T> {
		const scopeConfig = this.configuration.get(scope);
		if (!scopeConfig) {
			return { key } as IConfigurationValue<T>;
		}

		const value = this.getNestedValue(scopeConfig, key);
		return {
			key,
			value,
		} as IConfigurationValue<T>;
	}

	/**
	 * Listen for configuration changes
	 */
	onDidChangeConfiguration(
		_callback: (event: ConfigurationChangeEvent) => void,
	): void {
		// TODO: Implement comprehensive configuration change listening
		// Specification: ARCHITECTURE-SPECIFICATION.md (Configuration Service)
		// Implementation: Event emitter pattern with key filtering
		// Dependencies: Event system, change tracking
		// Validation: Test with multiple concurrent listeners

		console.log(
			"[ConfigurationService] onDidChangeConfiguration called - not yet implemented",
		);
		// This will be implemented when the event system is ready
	}

	/**
	 * Cleanup configuration service
	 */
	async cleanup(): Promise<void> {
		console.log("[ConfigurationService] Cleaning up configuration service");

		this.listeners.clear();
		this.configuration.clear();

		console.log("[ConfigurationService] Configuration service cleaned up");
	}

	/**
	 * Get nested value from configuration object
	 */
	private getNestedValue(obj: any, key: string): any {
		const keys = key.split(".");
		let current = obj;

		for (const k of keys) {
			if (current && typeof current === "object" && k in current) {
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
		const keys = key.split(".");
		let current = obj;

		for (let i = 0; i < keys.length - 1; i++) {
			const k = keys[i];
			if (!k) continue;
			if (!(k in current) || typeof current[k] !== "object") {
				current[k] = {};
			}
			current = current[k] as Record<string, any>;
		}

		const lastKey = keys[keys.length - 1];
		if (lastKey) {
			current[lastKey] = value;
		}
	}

	/**
	 * Collect all configuration keys
	 */
	private collectKeys(obj: any, prefix: string, keys: string[]): void {
		for (const key in obj) {
			if (key.startsWith("_")) continue;

			const fullKey = prefix ? `${prefix}.${key}` : key;

			if (typeof obj[key] === "object" && obj[key] !== null) {
				this.collectKeys(obj[key], fullKey, keys);
			} else {
				keys.push(fullKey);
			}
		}
	}

	/**
	 * Notify configuration change listeners
	 */
	private notifyConfigurationChange(
		keys: string[],
		scope: ConfigurationScope,
	): void {
		for (const key of keys) {
			const eventKey = `${scope}.${key}`;
			const listeners = this.listeners.get(eventKey);

			if (listeners) {
				for (const listener of listeners) {
					try {
						listener([{ key, scope }]);
					} catch (error) {
						console.error(
							`[ConfigurationService] Error in listener for ${eventKey}:`,
							error,
						);
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
	Effect.sync(() => new ConfigurationService({} as IIPCService)),
);

/**
 * Live implementation
 */
export const ConfigurationServiceLive = Layer.effect(
	IConfigurationService,
	Effect.sync(() => new ConfigurationService({} as IIPCService)),
);
