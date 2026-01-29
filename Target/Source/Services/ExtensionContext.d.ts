/**
 * @module ExtensionContext
 * @description
 * Implements the extension context builder for extension activation.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/api/common/extHostExtensionActivator.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Extension.ts (borrowed working patterns)
 * - Mountain Integration: State persistence via gRPC for extension data
 *
 * Patterns borrowed from these files:
 * - Extension context creation with subscription tracking
 * - Memento implementation for state management
 * - Extension URI and path resolution
 * - Secret storage integration
 *
 * New implementation includes:
 * - Mountain gRPC integration for state persistence
 * - Comprehensive TODOs for secure storage
 * - Extension migration hooks for version changes
 * - Proper disposable tracking
 *
 * Dependencies:
 * - Service/Configuration: For extension configuration access
 * - Service/Logger: For operation logging
 * - IMountainClientService: For state persistence via gRPC (optional)
 *
 * TODOs:
 * - HIGH: Implement secure storage integration with Mountain
 * - MEDIUM: Implement state persistence to disk/Mountain
 * - LOW: Implement extension migration on version changes
 */
import { Effect, Ref } from "effect";
import type * as VSCode from "vscode";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";
/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {
    readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
}
/**
 * @interface Configuration
 * @description Configuration service interface
 */
export interface Configuration {
    readonly GetValue: <T>(key: string, defaultValue?: T) => T;
    readonly UpdateValue: <T>(key: string, value: T) => Promise<void>;
}
/**
 * @interface Memento
 * @description
 * Simple memento implementation for extension state.
 * TODO: Implement persistent storage backed by Mountain
 *
 * Specification: src/vs/workbench/api/common/extHostMemento.ts
 */
export declare class Memento {
    private readonly Storage;
    private readonly ExtensionId;
    private readonly Logger;
    private readonly MountainClient?;
    constructor(Storage: Ref.Ref<Map<string, unknown>>, ExtensionId: string, Logger: Logger, MountainClient?: IMountainClientService);
    /**
     * Get a value from memento storage
     * @param key The key to get
     * @param defaultValue The default value if key doesn't exist
     * @returns The stored value or default
     */
    get<T>(key: string, defaultValue?: T): T | undefined;
    /**
     * Get all keys in memento storage
     * @returns Array of all keys
     */
    keys(): readonly string[];
    /**
     * Update a value in memento storage
     * @param key The key to update
     * @param value The new value
     * @returns Promise that resolves when update is complete
     */
    update(key: string, value: unknown): Promise<void>;
    /**
     * Clear all values in memento storage
     */
    clear(): void;
}
/**
 * @interface ExtensionSecretStorage
 * @description
 * Simple secret storage implementation for extension secrets.
 * TODO: Implement secure storage backed by Mountain
 *
 * Specification: src/vs/workbench/api/common/extHostSecretStorage.ts
 */
export declare class ExtensionSecretStorage {
    private readonly ExtensionId;
    private readonly Logger;
    private readonly MountainClient?;
    constructor(ExtensionId: string, Logger: Logger, MountainClient?: IMountainClientService);
    /**
     * Get a secret from storage
     * @param key The key to get
     * @returns The secret value or undefined
     */
    get(key: string): Promise<string | undefined>;
    /**
     * Store a secret
     * @param key The key to store
     * @param value The secret value
     */
    store(key: string, value: string): Promise<void>;
    /**
     * Delete a secret
     * @param key The key to delete
     */
    delete(key: string): Promise<void>;
    /**
     * Get the onDidChange secret event
     * @returns Event that fires when secrets change
     */
    get onDidChange(): VSCode.Event<VSCode.SecretStorageChangeEvent>;
}
/**
 * Extension metadata interface
 */
export interface IExtensionDescription {
    readonly identifier: string;
    readonly displayName?: string;
    readonly version: string;
    readonly publisher?: string;
    readonly extensionLocation: VSCode.Uri;
    readonly activationEvents?: string[];
    readonly main?: string;
    readonly browser?: string;
}
/**
 * @interface ExtensionContext
 * @description
 * The contract for the ExtensionContext service.
 *
 * Specification: src/vs/workbench/api/common/extHostExtensionActivator.ts (ExtensionContext)
 */
export interface ExtensionContextService {
    readonly CreateExtensionContext: (ExtensionId: string, ExtensionDescription: IExtensionDescription) => Effect.Effect<VSCode.ExtensionContext, Error>;
}
declare const ExtensionContextService_base: Effect.Service.Class<ExtensionContextService, "Service/ExtensionContext", {
    readonly effect: Effect.Effect<ExtensionContextService, unknown, unknown>;
}>;
/**
 * @class ExtensionContextService
 * @description
 * The Effect-TS service for building extension contexts for activation.
 * Creates ExtensionContext objects with proper state management, subscriptions,
 * and URI resolution for extensions.
 *
 * Architecture Pattern: src/vs/workbench/api/common/extHostExtensionActivator.ts (ExtensionContext)
 * Implementation: Effect-TS service with Ref-based state management
 *
 * TODOs:
 * - SECURITY: Implement secure storage migration for existing extensions (HIGH)
 * - MIGRATION: Add extension version migration support (LOW)
 * - TELEMETRY: Track extension activation metrics (LOW)
 */
export declare class ExtensionContextService extends ExtensionContextService_base {
}
export default ExtensionContextService;
//# sourceMappingURL=ExtensionContext.d.ts.map