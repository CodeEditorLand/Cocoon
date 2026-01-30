/**
 * @module IConfigurationService
 * @description
 * Interface for Cocoon's configuration service.
 * Based on VSCode's configuration patterns.
 */
import * as Effect from "effect/Effect";
export declare enum ConfigurationScope {
    APPLICATION = "APPLICATION",
    WORKSPACE = "WORKSPACE",
    PROFILE = "PROFILE"
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
export declare const IConfigurationService: <Self, Type extends Effect.Tag.AllowedType>() => import("effect/Context").TagClass<Self, IConfigurationService, Type> & (Type extends Record<PropertyKey, any> ? Effect.Tag.Proxy<Self, Type> : {}) & {
    use: <X>(body: (_: Type) => X) => [X] extends [Effect.Effect<infer A, infer E, infer R>] ? Effect.Effect<A, E, R | Self> : [X] extends [PromiseLike<infer A_1>] ? Effect.Effect<A_1, import("effect/Cause").UnknownException, Self> : Effect.Effect<X, never, Self>;
};
//# sourceMappingURL=IConfigurationService.d.ts.map