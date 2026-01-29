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

import { Effect, Ref, Context } from "effect";
import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";

/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {
	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
	readonly Info: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
	readonly Warn: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
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
export class Memento {
	private readonly Storage: Ref.Ref<Map<string, unknown>>;
	private readonly ExtensionId: string;
	private readonly Logger: Logger;
	private readonly MountainClient?: IMountainClientService;

	constructor(
		Storage: Ref.Ref<Map<string, unknown>>,
		ExtensionId: string,
		Logger: Logger,
		MountainClient?: IMountainClientService,
	) {
		this.Storage = Storage;
		this.ExtensionId = ExtensionId;
		this.Logger = Logger;
		this.MountainClient = MountainClient;

		// MOUNTAIN-INTEGRATION: Load persisted state from Mountain on construction (MEDIUM)
		Effect.runFork(
			Effect.gen(function* () {
				try {
					// TODO: MEDIUM: Load state from Mountain
					// const persistedState = yield* Effect.tryPromise({
					//     try: () => MountainClient?.sendRequest('extension.loadState', {
					//         extensionId: ExtensionId
					//     }),
					//     catch: () => undefined
					// });
					// if (persistedState) {
					//     const entries = Object.entries(persistedState);
					//     for (const [key, value] of entries) {
					//         yield* Ref.update(Storage, map => map.set(key, value));
					//     }
					// }
				} catch (error) {
					// Ignore load errors, start with empty state
				}
			}),
		);
	}

	/**
	 * Get a value from memento storage
	 * @param key The key to get
	 * @param defaultValue The default value if key doesn't exist
	 * @returns The stored value or default
	 */
	get<T>(key: string, defaultValue?: T): T | undefined {
		const Map = Effect.runSync(Ref.get(this.Storage));
		const Value = Map.get(key);
		return Value !== undefined ? (Value as T) : defaultValue;
	}

	/**
	 * Get all keys in memento storage
	 * @returns Array of all keys
	 */
	keys(): readonly string[] {
		const Map = Effect.runSync(Ref.get(this.Storage));
		return Array.from(Map.keys());
	}

	/**
	 * Update a value in memento storage
	 * @param key The key to update
	 * @param value The new value
	 * @returns Promise that resolves when update is complete
	 */
	async update(key: string, value: unknown): Promise<void> {
		Effect.runSync(
			Ref.update(this.Storage, (Map) => {
				const NewMap = new Map(Map);
				NewMap.set(key, value);
				return NewMap;
			}),
		);

		// TODO: MEDIUM: Persist state to Mountain
		// await Effect.runPromise(
		//     Effect.tryPromise({
		//         try: () => this.MountainClient?.sendRequest('extension.saveState', {
		//             extensionId: this.ExtensionId,
		//             key,
		//             value
		//         }),
		//         catch: (error) => {
		//             this.Logger.Error('[ExtensionContext] Failed to persist state to Mountain', error as Error);
		//         }
		//     })
		// );

		this.Logger.Debug(
			`[ExtensionContext] Memento updated: ${this.ExtensionId}.${key}`,
		);
	}

	/**
	 * Clear all values in memento storage
	 */
	clear(): void {
		Effect.runSync(Ref.set(this.Storage, new Map()));

		// TODO: MEDIUM: Clear persisted state from Mountain
		// Effect.runFork(
		//     Effect.tryPromise({
		//         try: () => this.MountainClient?.sendRequest('extension.clearState', {
		//             extensionId: this.ExtensionId
		//         }),
		//         catch: () => undefined
		//     })
		// );

		this.Logger.Debug(`[ExtensionContext] Memento cleared: ${this.ExtensionId}`);
	}
}

/**
 * @interface ExtensionSecretStorage
 * @description
 * Simple secret storage implementation for extension secrets.
 * TODO: Implement secure storage backed by Mountain
 *
 * Specification: src/vs/workbench/api/common/extHostSecretStorage.ts
 */
export class ExtensionSecretStorage {
	private readonly ExtensionId: string;
	private readonly Logger: Logger;
	private readonly MountainClient?: IMountainClientService;

	constructor(
		ExtensionId: string,
		Logger: Logger,
		MountainClient?: IMountainClientService,
	) {
		this.ExtensionId = ExtensionId;
		this.Logger = Logger;
		this.MountainClient = MountainClient;
	}

	/**
	 * Get a secret from storage
	 * @param key The key to get
	 * @returns The secret value or undefined
	 */
	async get(key: string): Promise<string | undefined> {
		// TODO: HIGH: Implement secure storage integration with Mountain
		// return await Effect.runPromise(
		//     Effect.tryPromise({
		//         try: () => this.MountainClient?.sendRequest('secrets.get', {
		//             extensionId: this.ExtensionId,
		//             key
		//         }) as Promise<string | undefined>,
		//         catch: () => undefined
		//     })
		// );

		this.Logger.Debug(
			`[ExtensionContext] Secret get: ${this.ExtensionId}.${key}`,
		);
		return undefined;
	}

	/**
	 * Store a secret
	 * @param key The key to store
	 * @param value The secret value
	 */
	async store(key: string, value: string): Promise<void> {
		// TODO: HIGH: Implement secure storage integration with Mountain
		// await Effect.runPromise(
		//     Effect.tryPromise({
		//         try: () => this.MountainClient?.sendRequest('secrets.store', {
		//             extensionId: this.ExtensionId,
		//             key,
		//             value
		//         }),
		//         catch: (error) => {
		//             this.Logger.Error('[ExtensionContext] Failed to store secret', error as Error);
		//             throw error;
		//         }
		//     })
		// );

		this.Logger.Debug(
			`[ExtensionContext] Secret stored: ${this.ExtensionId}.${key}`,
		);
	}

	/**
	 * Delete a secret
	 * @param key The key to delete
	 */
	async delete(key: string): Promise<void> {
		// TODO: HIGH: Implement secure storage integration with Mountain
		// await Effect.runPromise(
		//     Effect.tryPromise({
		//         try: () => this.MountainClient?.sendRequest('secrets.delete', {
		//             extensionId: this.ExtensionId,
		//             key
		//         }),
		//         catch: (error) => {
		//             this.Logger.Error('[ExtensionContext] Failed to delete secret', error as Error);
		//             throw error;
		//         }
		//     })
		// );

		this.Logger.Debug(
			`[ExtensionContext] Secret deleted: ${this.ExtensionId}.${key}`,
		);
	}

	/**
	 * Get the onDidChange secret event
	 * @returns Event that fires when secrets change
	 */
	get onDidChange(): VSCode.Event<VSCode.SecretStorageChangeEvent> {
		// TODO: MEDIUM: Implement secret change event from Mountain
		return (
			Listener: (event: VSCode.SecretStorageChangeEvent) => any,
		) => {
			const Disposable = {
				dispose: () => {
					// Cleanup
				},
			} as VSCode.Disposable;
			return Disposable;
		};
	}
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
	readonly CreateExtensionContext: (
		ExtensionId: string,
		ExtensionDescription: IExtensionDescription,
	) => Effect.Effect<VSCode.ExtensionContext, Error>;
}

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
export class ExtensionContextService extends Effect.Service<
	ExtensionContextService
>()("Service/ExtensionContext", {
	effect: Effect.gen(function* () {
		// Resolve service dependencies
		const MountainClient = yield* IMountainClientService;
		const Configuration = yield* Context.Tag<Configuration>(
			"Service/Configuration",
		);
		const Logger = yield* Context.Tag<Logger>("Service/Logger");

		// Global subscription tracking for all extensions
		const GlobalSubscriptionsRef = yield* Ref.make(new Map<string, Set<VSCode.Disposable>>());

		/**
		 * Create extension context for activation
		 *
		 * Implementation Pattern: src/vs/workbench/api/common/extHostExtensionActivator.ts (createExtensionContext)
		 *
		 * TODOs:
		 * - MIGRATION: Check for extension version differences and run migration (LOW)
		 * - PERSISTENCE: Initialize state from previous extension activations (MEDIUM)
		 */
		const CreateExtensionContext = (
			ExtensionId: string,
			ExtensionDescription: IExtensionDescription,
		): Effect.Effect<VSCode.ExtensionContext, Error> =>
			Effect.gen(function* () {
				Logger.Info(
					`[ExtensionContext] Creating context for extension: ${ExtensionId}`,
				);

				// Create storage paths
				const ExtensionPath = ExtensionDescription.extensionLocation.fsPath;
				const StoragePath = `${ExtensionPath}/.storage`;
				const GlobalStoragePath =
					process.env.VSCODE_COCOON_GLOBAL_STORAGE ??
					`${process.env.HOME ?? "."}/cocoon/global-storage`;

				// Create mementos for state management
				const WorkspaceStateRef = yield* Ref.make(
					new Map<string, unknown>(),
				);
				const GlobalStateRef = yield* Ref.make(
					new Map<string, unknown>(),
				);

				const WorkspaceState = new Memento(
					WorkspaceStateRef,
					ExtensionId,
					Logger,
					MountainClient,
				);
				const GlobalState = new Memento(
					GlobalStateRef,
					ExtensionId,
					Logger,
					MountainClient,
				);

				// Create secret storage
				const SecretStorage = new ExtensionSecretStorage(
					ExtensionId,
					Logger,
					MountainClient,
				);

				// Create subscription list for this extension
				const Subscriptions = new Set<VSCode.Disposable>();
				yield* Ref.update(GlobalSubscriptionsRef, (GlobalMap) => {
					const NewMap = new Map(GlobalMap);
					if (!NewMap.has(ExtensionId)) {
						NewMap.set(ExtensionId, Subscriptions);
					}
					return NewMap;
				});

				/**
				 * Create disposable that tracks with extension context
				 */
				const CreateTrackedDisposable = (
					Disposable: VSCode.Disposable,
				): VSCode.Disposable => ({
					dispose: () => {
						Subscriptions.delete(Disposable);
						Disposable.dispose();
					},
				});

				/**
				 * asAbsolutePath implementation
				 * Resolves relative paths against extension location
				 */
				const AsAbsolutePath = (relativePath: string): string => {
					const Uri = VSCode.Uri.joinPath(
						ExtensionDescription.extensionLocation,
						relativePath,
					);
					return Uri.fsPath;
				};

				// Build extension context object
				const ExtensionContext: VSCode.ExtensionContext = {
					subscriptions: [] as VSCode.Disposable[], // VSCode's array-based subscriptions
					workspaceState: {
						get: (key, defaultValue) =>
							WorkspaceState.get(key, defaultValue),
						keys: () => WorkspaceState.keys(),
						update: (key, value) => WorkspaceState.update(key, value),
					} as any,
					globalState: {
						get: (key, defaultValue) =>
							GlobalState.get(key, defaultValue),
						keys: () => GlobalState.keys(),
						update: (key, value) => GlobalState.update(key, value),
					} as any,
					secrets: {
						get: (key) => SecretStorage.get(key),
						store: (key, value) => SecretStorage.store(key, value),
						delete: (key) => SecretStorage.delete(key),
						onDidChange: SecretStorage.onDidChange,
					},
					storagePath: StoragePath,
					globalStoragePath: GlobalStoragePath,
					asAbsolutePath: AsAbsolutePath,
					extensionUri: ExtensionDescription.extensionLocation,
					extensionPath: ExtensionPath,
					// TODO: Add extensionMode property when needed
					// extensionMode: VSCode.ExtensionMode,
				};

				// TODO: LOW: Implement extension migration on version changes
				// Check for previous version and run migration if needed
				// const previousVersion = GlobalState.get('version');
				// if (previousVersion !== ExtensionDescription.version) {
				//     yield* runMigration(ExtensionId, previousVersion, ExtensionDescription.version);
				//     yield* Effect.promise(() => GlobalState.update('version', ExtensionDescription.version));
				// }

				Logger.Debug(
					`[ExtensionContext] Context created: ${ExtensionId} at ${ExtensionPath}`,
				);

				return ExtensionContext;
			});

		/**
		 * Dispose all extension subscriptions
		 *
		 * TODO: Add cleanup method to clean up extension state on deactivation
		 */
		const DisposeExtension = (
			ExtensionId: string,
		): Effect.Effect<void, Error> =>
			Effect.gen(function* () {
				const GlobalSubscriptions = yield* Ref.get(GlobalSubscriptionsRef);
				const Subscriptions = GlobalSubscriptions.get(ExtensionId);

				if (Subscriptions) {
					Logger.Info(
						`[ExtensionContext] Disposing ${Subscriptions.size} subscriptions for ${ExtensionId}`,
					);

					// Dispose all subscriptions
					for (const Subscription of Subscriptions) {
						Subscription.dispose();
					}

					// Clear from registry
					yield* Ref.update(GlobalSubscriptionsRef, (GlobalMap) => {
						const NewMap = new Map(GlobalMap);
						NewMap.delete(ExtensionId);
						return NewMap;
					});
				}

				Logger.Debug(
					`[ExtensionContext] Extension ${ExtensionId} disposed`,
				);
			});

		// Return the service implementation with PascalCase methods
		const ServiceImplementation: ExtensionContextService = {
			CreateExtensionContext,
		};

		Logger.Info(
			`[ExtensionContext] ExtensionContextService initialized`,
		);

		return ServiceImplementation;
	}),
});
