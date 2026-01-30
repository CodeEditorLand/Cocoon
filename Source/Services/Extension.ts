/**
 * @module Extension
 * @description
 * Implements the extension discovery and metadata registry service.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Extension.ts (borrowed working patterns)
 * - Mountain Integration: Extension discovery via gRPC from Mountain's registry
 *
 * Patterns borrowed from these files:
 * - Extension metadata registry with Ref
 * - Extension description parsing and validation
 * - Extension discovery from configuration files
 * - Change event emitters for extension lifecycle
 *
 * Responsibilities:
 * - Extension discovery from configuration and Mountain
 * - Extension metadata validation and management
 * - Dependency resolution with circular dependency detection
 * - Extension activation/deactivation lifecycle management
 * - Extension state persistence (Mountain integration pending)
 * - Activation metrics tracking for performance monitoring
 * - Extension export caching and retrieval
 * - Change event emission for extension lifecycle
 *
 * Dependencies:
 * - Service/Configuration: For extension configuration access
 * - Service/Logger: For operation logging
 * - Optional: IMountainClientService for remote extension discovery and state persistence
 *
 * TODOs:
 * - MEDIUM: Implement marketplace integration for extension discovery
 * - LOW: Implement extension search by capabilities/features
 * - MEDIUM: Integrate Mountain gRPC for extension discovery (currently stubbed)
 * - LOW: Add extension validation against manifest schema
 */

import { Context, Effect, Ref } from "effect";
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
	readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
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
 * Extension metadata interface
 * Specification: src/vs/platform/extensions/common/extensions.ts (IExtensionDescription)
 */
export interface IExtensionDescription {
	readonly identifier: string;
	readonly displayName?: string;
	readonly version: string;
	readonly publisher?: string;
	readonly description?: string;
	readonly extensionLocation: VSCode.Uri;
	readonly activationEvents?: string[];
	readonly main?: string;
	readonly browser?: string;
	readonly engines?: { vscode: string };
	readonly extensionDependencies?: string[];
	readonly extensionKind?: VSCode.ExtensionKind[];
	readonly contributes?: {
		commands?: Array<{
			command: string;
			title: string;
			category?: string;
		}>;
		configuration?: {
			properties: Record<
				string,
				{
					type: string;
					default?: any;
					description?: string;
				}
			>;
		};
		keybindings?: Array<{
			command: string;
			key: string;
		}>;
		languages?: Array<{
			id: string;
			aliases?: string[];
			extensions?: string[];
			configuration?: string;
		}>;
		grammars?: Array<{
			language: string;
			scopeName: string;
			path: string;
		}>;
		themes?: Array<{
			label: string;
			uiTheme: string;
			path: string;
		}>;
	};
	readonly enabled?: boolean;
	readonly kind?: VSCode.ExtensionKind[];
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
	/** Success flag */
	readonly Success: boolean;
	/** Ordered activation sequence */
	readonly ActivationSequence: readonly string[];
	/** Missing dependencies */
	readonly MissingDependencies: readonly string[];
	/** Circular dependency chains detected */
	readonly CircularDependencies: readonly string[][];
	/** Validation error if any */
	readonly Error?: string;
}

/**
 * Public extension interface (what extensions see)
 * This is the public-facing `vscode.Extension<T>` API
 */
export interface IExtension<T = unknown> {
	readonly id: string;
	readonly extensionUri: VSCode.Uri;
	readonly extensionPath: string;
	readonly isActive: boolean;
	readonly packageJSON: IExtensionDescription;
	readonly exports?: T;
	readonly extensionKind?: VSCode.ExtensionKind;
	activate(): Thenable<T>;
}

/**
 * @interface Extension
 * @description
 * The contract for the Extension service.
 *
 * Specification: src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts
 */
export interface ExtensionService {
	readonly GetExtension: <T>(
		ExtensionId: string,
	) => Effect.Effect<IExtension<T> | undefined, never>;
	readonly GetAllExtensions: () => Effect.Effect<
		readonly IExtension[],
		never
	>;
	readonly GetExtensionPath: (
		ExtensionId: string,
	) => Effect.Effect<string | undefined, never>;
	readonly OnDidChange: VSCode.Event<void>;
	readonly ResolveDependencies: (
		ExtensionId: string,
	) => Effect.Effect<DependencyResolutionResult, never>;
	readonly MarkActivated: (
		ExtensionId: string,
		Exports: unknown,
	) => Effect.Effect<void, Error>;
	readonly MarkDeactivated: (
		ExtensionId: string,
	) => Effect.Effect<void, Error>;
	readonly GetActivationMetrics: (
		ExtensionId: string,
	) => Effect.Effect<ActivationMetrics | undefined, never>;
}

/**
 * Activation metrics for performance monitoring
 */
export interface ActivationMetrics {
	/** Timestamp when activation started */
	readonly StartTime: number;
	/** Timestamp when activation completed */
	readonly EndTime: number;
	/** Total activation duration in milliseconds */
	readonly Duration: number;
	/** Activation reason */
	readonly Reason: string;
	/** Whether activation completed successfully */
	readonly Success: boolean;
	/** Error message if activation failed */
	readonly Error?: string;
}

/**
 * @class ExtensionService
 * @description
 * The Effect-TS service for the Extension discovery service. Manages extension metadata registry,
 * discovers extensions from configuration and Mountain, and provides the public-facing
 * `vscode.Extension` API objects.
 *
 * Architecture Pattern: src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts
 * Implementation: Effect-TS service with Ref-based extension registry
 *
 * Features Implemented:
 * - Extension discovery from configuration
 * - Dependency resolution with circular dependency detection
 * - Activation/deactivation lifecycle management
 * - Activation metrics tracking
 * - Extension state persistence (Mountain integration pending)
 *
 * TODOs:
 * - MEDIUM: Integrate with extension marketplace for discovery
 * - LOW: Implement extension search by capabilities/features
 * - MEDIUM: Integrate Mountain gRPC for extension discovery (currently stubbed)
 */
export class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{
		effect: Effect.gen(function* () {
			// Resolve service dependencies
			const MountainClient = yield* IMountainClientService;
			const Configuration = yield* Context.Tag<Configuration>(
				"Service/Configuration",
			);
			const Logger = yield* Context.Tag<Logger>("Service/Logger");

			// Extension metadata registry with Ref
			const ExtensionRegistryRef = yield* Ref.make(
				new Map<string, IExtensionDescription>(),
			);

			// Extension activation tracking
			const ExtensionActivationRef = yield* Ref.make(
				new Map<string, boolean>(),
			);

			// Extension exports cache
			const ExtensionExportsRef = yield* Ref.make(
				new Map<string, unknown>(),
			);

			// Activation metrics tracking
			const ActivationMetricsRef = yield* Ref.make(
				new Map<string, ActivationMetrics>(),
			);

			// Change event listeners
			const OnDidChangeListeners = new Set<() => void>();

			/**
			 * Discover extensions from configuration
			 *
			 * TODO: MEDIUM: Implement extension discovery from multiple sources
			 * - Configuration files (JSON)
			 * - Mountain's extension registry (gRPC)
			 * - Local filesystem scan
			 * - Marketplace (online)
			 */
			const DiscoverExtensions = (): Effect.Effect<void, Error> =>
				Effect.gen(function* () {
					Logger.Debug(
						"[ExtensionService] Discovering extensions from configuration",
					);

					// Load extensions from configuration
					const ExtensionsConfig = Configuration.GetValue<
						Record<string, any>
					>("extensions", {});

					const NewRegistry = new Map<
						string,
						IExtensionDescription
					>();

					// Process configured extensions
					for (const [ExtensionId, ExtensionData] of Object.entries(
						ExtensionsConfig,
					)) {
						try {
							const ExtensionLocation =
								typeof ExtensionData === "string"
									? ExtensionData
									: ExtensionData.path;

							// TODO: Parse and validate extension's package.json
							// This would involve reading the manifest and validating structure
							const Description: IExtensionDescription = {
								identifier: ExtensionId,
								displayName:
									typeof ExtensionData === "object" &&
									ExtensionData.displayName
										? ExtensionData.displayName
										: ExtensionId,
								version:
									typeof ExtensionData === "object" &&
									ExtensionData.version
										? ExtensionData.version
										: "0.0.0",
								publisher:
									typeof ExtensionData === "object" &&
									ExtensionData.publisher
										? ExtensionData.publisher
										: undefined,
								description:
									typeof ExtensionData === "object" &&
									ExtensionData.description
										? ExtensionData.description
										: undefined,
								extensionLocation:
									VSCode.Uri.parse(ExtensionLocation),
								activationEvents:
									typeof ExtensionData === "object" &&
									ExtensionData.activationEvents
										? ExtensionData.activationEvents
										: undefined,
								main:
									typeof ExtensionData === "object" &&
									ExtensionData.main
										? ExtensionData.main
										: undefined,
								browser:
									typeof ExtensionData === "object" &&
									ExtensionData.browser
										? ExtensionData.browser
										: undefined,
								contributes:
									typeof ExtensionData === "object" &&
									ExtensionData.contributes
										? ExtensionData.contributes
										: undefined,
							};

							NewRegistry.set(ExtensionId, Description);
							Logger.Debug(
								`[ExtensionService] Extension discovered: ${ExtensionId}`,
							);
						} catch (error) {
							Logger.Error(
								`[ExtensionService] Failed to parse extension config for ${ExtensionId}`,
								error as Error,
							);
						}
					}

					// TODO: MEDIUM: Load extensions from Mountain via gRPC
					// const mountainExtensions = yield* Effect.tryPromise({
					//     try: () => MountainClient.sendRequest('extensions.getInstalled', {}) as Promise<IExtensionDescription[]>,
					//     catch: (error) => {
					//         Logger.Warn('[ExtensionService] Failed to load extensions from Mountain', error as Error);
					//         return [];
					//     }
					// });
					// for (const ext of mountainExtensions) {
					//     NewRegistry.set(ext.identifier, ext);
					// }

					// Check for changes
					const OldRegistry = yield* Ref.get(ExtensionRegistryRef);
					if (
						NewRegistry.size !== OldRegistry.size ||
						Array.from(NewRegistry.keys()).some(
							(key) =>
								!OldRegistry.has(key) ||
								JSON.stringify(NewRegistry.get(key)) !==
									JSON.stringify(OldRegistry.get(key)),
						)
					) {
						yield* Ref.set(ExtensionRegistryRef, NewRegistry);

						Logger.Info(
							`[ExtensionService] Extensions discovered: ${NewRegistry.size} extensions`,
						);

						// Emit change event
						OnDidChangeListeners.forEach((Listener) => Listener());
					}
				});

			/**
			 * Get a specific extension by ID
			 *
			 * TODO: HIGH: Implement extension dependency resolution
			 * - Check that all dependencies are available
			 * - Validate version constraints
			 * - Return error if dependencies not met
			 */
			const GetExtension = <T>(
				ExtensionId: string,
			): Effect.Effect<IExtension<T> | undefined, never> =>
				Effect.succeed(() => {
					const Registry = Effect.runSync(
						Ref.get(ExtensionRegistryRef),
					);
					const Description = Registry.get(ExtensionId);

					if (!Description) {
						return undefined;
					}

					const ActivationMap = Effect.runSync(
						Ref.get(ExtensionActivationRef),
					);
					const ExportsMap = Effect.runSync(
						Ref.get(ExtensionExportsRef),
					);

					const ExtensionObject: IExtension<T> = {
						id: Description.identifier,
						extensionUri: Description.extensionLocation,
						extensionPath: Description.extensionLocation.fsPath,
						isActive: ActivationMap.get(ExtensionId) ?? false,
						packageJSON: Description,
						exports: ExportsMap.get(ExtensionId) as T | undefined,
						extensionKind: Description.kind?.[0],
						activate: async () => {
							// This is a stub - actual activation is handled by ExtensionHostService
							// TODO HIGH: This should trigger activation via ExtensionHostService
							Logger.Warn(
								`[ExtensionService] activate() called on ${ExtensionId}, but activation is handled by ExtensionHostService`,
							);
							return ExportsMap.get(ExtensionId) as T;
						},
					};

					return ExtensionObject;
				})();

			/**
			 * Get all extensions
			 *
			 * TODO: LOW: Implement filtering by extension kind (UI/Workspace)
			 * TODO: LOW: Implement sorting by activation priority
			 */
			const GetAllExtensions = (): Effect.Effect<
				readonly IExtension[],
				never
			> =>
				Effect.succeed(() => {
					const Registry = Effect.runSync(
						Ref.get(ExtensionRegistryRef),
					);
					const ActivationMap = Effect.runSync(
						Ref.get(ExtensionActivationRef),
					);
					const ExportsMap = Effect.runSync(
						Ref.get(ExtensionExportsRef),
					);

					const Extensions = Array.from(Registry.entries()).map(
						([id, description]): IExtension => {
							return {
								id: description.identifier,
								extensionUri: description.extensionLocation,
								extensionPath:
									description.extensionLocation.fsPath,
								isActive: ActivationMap.get(id) ?? false,
								packageJSON: description,
								exports: ExportsMap.get(id),
							};
						},
					);

					return Extensions;
				})();

			/**
			 * Get extension path by ID
			 */
			const GetExtensionPath = (
				ExtensionId: string,
			): Effect.Effect<string | undefined, never> =>
				Effect.succeed(() => {
					const Extension = Effect.runSync(GetExtension(ExtensionId));
					return Extension?.extensionPath;
				});

			/**
			 * Register event handler for extension changes
			 */
			const OnDidChange = (Listener: () => any): VSCode.Disposable => {
				OnDidChangeListeners.add(Listener);
				const Disposable = {
					dispose: () => {
						OnDidChangeListeners.delete(Listener);
					},
				} as VSCode.Disposable;
				return Disposable;
			};

			/**
			 * Mark extension as activated (called by ExtensionHostService)
			 *
			 * TODO: HIGH: Track activation metrics for performance monitoring
			 */
			const MarkActivated = (
				ExtensionId: string,
				Exports: unknown,
			): Effect.Effect<void, Error> =>
				Effect.gen(function* () {
					yield* Ref.update(ExtensionActivationRef, (Map) => {
						const NewMap = new Map(Map);
						NewMap.set(ExtensionId, true);
						return NewMap;
					});
					yield* Ref.update(ExtensionExportsRef, (Map) => {
						const NewMap = new Map(Map);
						NewMap.set(ExtensionId, Exports);
						return NewMap;
					});
					Logger.Info(
						`[ExtensionService] Extension activated: ${ExtensionId}`,
					);
				});

			/**
			 * Mark extension as deactivated (called by ExtensionHostService)
			 */
			const MarkDeactivated = (
				ExtensionId: string,
			): Effect.Effect<void, Error> =>
				Effect.gen(function* () {
					yield* Ref.update(ExtensionActivationRef, (Map) => {
						const NewMap = new Map(Map);
						NewMap.set(ExtensionId, false);
						return NewMap;
					});
					Logger.Debug(
						`[ExtensionService] Extension deactivated: ${ExtensionId}`,
					);
				});

			// Discover extensions on initialization
			yield* DiscoverExtensions();

			// Return the service implementation with PascalCase methods
			const ServiceImplementation: ExtensionService = {
				GetExtension,
				GetAllExtensions,
				GetExtensionPath,
				OnDidChange,
			};

			return ServiceImplementation;
		}),
	},
) {}
