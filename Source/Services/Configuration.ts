/**
 * @module Configuration
 * @description
 * Cocoon's configuration service implementation.
 * Manages configuration synchronization with Mountain via the Universal Spine (gRPC).
 *
 * Responsibilities:
 * - Synchronize configuration with Mountain backend via 'config.get' and 'config.update'
 * - Provide configuration values to extensions with proper scoping
 * - Validate configuration keys and values
 * - Handle configuration change notifications
 * - Implement conflict resolution with retry logic
 * - Support multiple configuration scopes (APPLICATION, WORKSPACE, PROFILE)
 */

import { CocoonDevLog } from "Dev/Log.js";

import { Effect, Layer } from "effect";

import {
	IConfigurationService,
	type ConfigurationChangeEvent,
} from "../Interfaces/I/Configuration/Service.js";

import { IMountainClientService } from "../Interfaces/I/Mountain/Client/Service.js";

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
export class Configuration implements IConfigurationService {

	readonly _serviceBrand: undefined;

	private configuration: Map<ConfigurationScope, any>;

	private mountainClient: IMountainClientService;

	private listeners: Map<string, ((changes: any[]) => void)[]>;

	constructor(mountainClient: IMountainClientService) {
		this._serviceBrand = undefined;

		this.mountainClient = mountainClient;

		this.configuration = new Map();

		this.listeners = new Map();

		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Initializing configuration service with Universal Spine",
		);
	}

	/**
	 * Initialize the configuration service by fetching from Mountain
	 */
	async initialize(): Promise<void> {
		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Loading initial configuration from Spine...",
		);

		try {
			// Fetch full configuration from Mountain
			// Maps to 'config.reload' in Spine
			const configData = await this.mountainClient.sendRequest(
				"config.reload",

				{},
			);

			// Initialize with loaded configuration
			// Expecting configData to match the structure { application: {...}, workspace: {...}, profile: {...} }
			if (configData?.application) {
				this.configuration.set(
					ConfigurationScope.APPLICATION,

					configData.application,
				);
			}

			if (configData?.workspace) {
				this.configuration.set(
					ConfigurationScope.WORKSPACE,

					configData.workspace,
				);
			}

			if (configData?.profile) {
				this.configuration.set(
					ConfigurationScope.PROFILE,

					configData.profile,
				);
			}

			CocoonDevLog(
				"configuration",

				"[ConfigurationService] Configuration loaded from Spine",

				configData,
			);
		} catch (error) {
			CocoonDevLog(
				"configuration",

				"[ConfigurationService] Failed to load initial configuration from Spine:",

				error,
			);

			// Initialize with default configuration on failure
			this.configuration.set(ConfigurationScope.APPLICATION, {
				_version: 1,
				_timestamp: Date.now(),
				window: {
					zoomLevel: 0,
					theme: "dark",
				},
				editor: {
					fontSize: 14,
					lineNumbers: "on",
				},
			});

			this.configuration.set(ConfigurationScope.WORKSPACE, {
				_version: 1,
				_timestamp: Date.now(),
			});

			this.configuration.set(ConfigurationScope.PROFILE, {
				_version: 1,
				_timestamp: Date.now(),
			});
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
		// Validate configuration key and value
		if (!this.validateConfigurationKey(key)) {
			throw new Error(`Invalid configuration key: ${key}`);
		}

		if (!this.validateConfigurationValue(key, value)) {
			throw new Error(
				`Invalid configuration value for key ${key}: ${value}`,
			);
		}

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

			// Save to Mountain using Spine
			try {
				// Determine integer scope for Spine protocol
				let spineScope = 0;

				if (scope === ConfigurationScope.WORKSPACE) spineScope = 1;

				if (scope === ConfigurationScope.PROFILE) spineScope = 2;

				await this.mountainClient.sendRequest("config.update", {
					key,
					value,
					scope: spineScope,
				});

				CocoonDevLog(
					"configuration",

					`[ConfigurationService] Configuration updated: ${key} = ${value}`,
				);

				// Notify listeners
				this.notifyConfigurationChange([key], scope);
			} catch (error) {
				CocoonDevLog(
					"configuration",

					`[ConfigurationService] Failed to update configuration: ${key}`,

					error,
				);

				// Implement conflict resolution
				await this.handleConfigurationConflict(
					error,

					key,

					value,

					scope,
				);
			}
		}
	}

	/**
	 * Validate configuration key
	 */
	private validateConfigurationKey(key: string): boolean {
		// Key must be non-empty and follow naming conventions
		if (!key || key.trim().length === 0) {
			return false;
		}

		// Key must not contain invalid characters
		const invalidChars = /[^a-zA-Z0-9._-]/;

		if (invalidChars.test(key)) {
			return false;
		}

		// Key must not start or end with dots
		if (key.startsWith(".") || key.endsWith(".")) {
			return false;
		}

		// Key must not contain consecutive dots
		if (key.includes("..")) {
			return false;
		}

		return true;
	}

	/**
	 * Validate configuration value
	 */
	private validateConfigurationValue(key: string, value: any): boolean {
		// Basic validation: value must not be undefined
		if (value === undefined) {
			return false;
		}

		// Type-specific validation based on key patterns
		if (key.includes("zoomLevel") || key.includes("fontSize")) {
			// Numeric values must be valid numbers
			if (typeof value !== "number" || !isFinite(value)) {
				return false;
			}

			// Range validation
			if (key.includes("zoomLevel")) {
				return value >= -8 && value <= 9; // Standard zoom level range
			}

			if (key.includes("fontSize")) {
				return value >= 6 && value <= 100; // Reasonable font size range
			}
		}

		// Boolean values must be actual booleans
		if (
			key.includes("enable") ||
			key.includes("show") ||
			key.includes("visible")
		) {
			return typeof value === "boolean";
		}

		// String values must be non-empty strings
		if (typeof value === "string") {
			return value.trim().length > 0;
		}

		return true;
	}

	/**
	 * Validate entire configuration scope
	 */
	validateScopeConfiguration(scope: ConfigurationScope): boolean {
		const scopeConfig = this.configuration.get(scope);

		if (!scopeConfig) {
			return true; // Empty scope is valid
		}

		// Validate all keys and values in the scope
		const keys: string[] = [];

		this.collectKeys(scopeConfig, "", keys);

		for (const key of keys) {
			const value = this.getNestedValue(scopeConfig, key);

			if (
				!this.validateConfigurationKey(key) ||
				!this.validateConfigurationValue(key, value)
			) {
				return false;
			}
		}

		return true;
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
		callback: (event: ConfigurationChangeEvent) => void,
	): void {
		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Registering configuration change listener",
		);

		// Create a unique listener ID
		const listenerId = `listener_${Date.now()}_${Math.random()}`;

		// Store listener for configuration changes
		// For now, we'll store it under a generic key
		let globalListeners = this.listeners.get("*");

		if (!globalListeners) {
			globalListeners = [];

			this.listeners.set("*", globalListeners);
		}

		globalListeners.push(callback);

		CocoonDevLog(
			"configuration",

			`[ConfigurationService] Configuration change listener registered: ${listenerId}`,
		);
	}

	/**
	 * Reload configuration from Mountain
	 */
	async reloadConfiguration(): Promise<void> {
		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Reloading configuration from Mountain",
		);

		try {
			// Clear existing listeners
			this.listeners.clear();

			// Reload configuration
			await this.initialize();

			CocoonDevLog(
				"configuration",

				"[ConfigurationService] Configuration reloaded successfully",
			);
		} catch (error) {
			CocoonDevLog(
				"configuration",

				"[ConfigurationService] Failed to reload configuration:",

				error,
			);

			throw error;
		}
	}

	/**
	 * Handle configuration conflicts with retry logic
	 */
	private async handleConfigurationConflict(
		_error: any,

		key: string,

		value: any,

		scope: ConfigurationScope,
	): Promise<void> {
		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Configuration conflict detected, implementing retry logic",
		);

		const maxRetries = 3;

		const baseDelay = 100; // ms

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const delay = baseDelay * Math.pow(2, attempt - 1);

			CocoonDevLog(
				"configuration",

				`[ConfigurationService] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`,
			);

			await new Promise((resolve) => setTimeout(resolve, delay));

			try {
				// Reload configuration first to get latest state
				await this.initialize();

				// Retry setting the value
				let scopeConfig = this.configuration.get(scope);

				if (!scopeConfig) {
					scopeConfig = {};

					this.configuration.set(scope, scopeConfig);
				}

				this.setNestedValue(scopeConfig, key, value);

				// Update timestamp
				scopeConfig._timestamp = Date.now();

				scopeConfig._version = (scopeConfig._version || 0) + 1;

				// Retry saving via Spine
				let spineScope = 0;

				if (scope === ConfigurationScope.WORKSPACE) spineScope = 1;

				if (scope === ConfigurationScope.PROFILE) spineScope = 2;

				await this.mountainClient.sendRequest("config.update", {
					key,
					value,
					scope: spineScope,
				});

				CocoonDevLog(
					"configuration",

					"[ConfigurationService] Configuration saved successfully after retry",
				);

				return;
			} catch (retryError) {
				CocoonDevLog(
					"configuration",

					`[ConfigurationService] Retry attempt ${attempt} failed:`,

					retryError,
				);

				if (attempt === maxRetries) {
					CocoonDevLog(
						"configuration",

						"[ConfigurationService] All retry attempts failed, configuration may be out of sync",
					);

					throw new Error(
						`Configuration synchronization failed after ${maxRetries} attempts: ${retryError}`,
					);
				}
			}
		}
	}

	/**
	 * Cleanup configuration service
	 */
	async cleanup(): Promise<void> {
		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Cleaning up configuration service",
		);

		this.listeners.clear();

		this.configuration.clear();

		CocoonDevLog(
			"configuration",

			"[ConfigurationService] Configuration service cleaned up",
		);
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

			// Also notify global listeners
			const globalListeners = this.listeners.get("*");

			const allListeners = [
				...(listeners || []),
				...(globalListeners || []),
			];

			if (allListeners.length > 0) {
				for (const listener of allListeners) {
					try {
						listener([{ key, scope }]);
					} catch (error) {
						CocoonDevLog(
							"configuration",

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
