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
 * FUTURE: Marketplace discovery - integrate with VS Code marketplace API
 * FUTURE: Capability search - filter by extension.capabilities
 * DEPENDENCY: Mountain gRPC - pending Mountain backend implementation
 * FUTURE: Schema validation - validate package.json against schema
 */

import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { IMountainClientService } from "../Interfaces/I/Mountain/Client/Service.js";

/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {

	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;

	readonly Info: (Message: string, ...Data: unknown[]) => Promise<void>;

	readonly Warn: (Message: string, ...Data: unknown[]) => Promise<void>;

	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Promise<void>;
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
	) => Promise<IExtension<T> | undefined>;

	readonly GetAllExtensions: () => Promise<
		readonly IExtension[],

		never
	>;

	readonly GetExtensionPath: (
		ExtensionId: string,
	) => Promise<string | undefined>;

	readonly OnDidChange: VSCode.Event<void>;

	readonly ResolveDependencies: (
		ExtensionId: string,
	) => Promise<DependencyResolutionResult>;

	readonly MarkActivated: (
		ExtensionId: string,

		Exports: unknown,
	) => Promise<void>;

	readonly MarkDeactivated: (
		ExtensionId: string,
	) => Promise<void>;

	readonly GetActivationMetrics: (
		ExtensionId: string,
	) => Promise<ActivationMetrics | undefined>;
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
export class ExtensionService extends /* Effect.Service */(
	"Service/Extension",

	{
		effect: async function() {
			// Resolve service dependencies
			await IMountainClientService;

			const Configuration = await Symbol<Configuration>(
				"Service/Configuration",
			);

			const Logger = await Symbol<Logger>("Service/Logger");

			// Plain Maps - no Ref overhead on every extension lookup.
			const _registry = new Map<string, IExtensionDescription>();

			const _activation = new Map<string, boolean>();

			const _exports = new Map<string, unknown>();

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
			const DiscoverExtensions = (): Promise<void> =>
				async function() {
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
					for (const [
						ExtensionId,

						ExtensionDataRaw,
					] of Object.entries(ExtensionsConfig)) {
						try {
							const ExtensionData = ExtensionDataRaw as
								| string
								| {
										path: string;

										displayName?: string;

										version?: string;

										publisher?: string;

										description?: string;

										activationEvents?: string[];

										main?: string;

										browser?: string;

										contributes?: unknown;
								  };

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
								// LAND-FIX: empty-string URI guard. ruby-lsp's
								// registry insert on Land/.fiddee/extensions/...
								// occasionally lands with `path: ""`; the
								// resulting `URI.parse("")` throws
								// "[UriError]: Scheme contains illegal
								// characters. (len:0)" and kills the
								// activation. Synthesise a `file://` URI from
								// the extension id when the location is
								// blank - same pattern as the Empty-URI-Guard
								// skill at HydrateUriResults / StockLift.
								extensionLocation:
									ExtensionLocation &&
									ExtensionLocation.length > 0
										? VSCode.Uri.parse(ExtensionLocation)

										: VSCode.Uri.parse(
												`file:///nonexistent/${ExtensionId}`,
											),
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

					// NOTE: Extension data is NOT loaded from Mountain here.
					// The actual extension host (Handler.ts) receives extension
					// data via `$deltaExtensions` gRPC. Loading here without
					// a valid `extensionLocation: VSCode.Uri` would create
					// broken entries that cascade into `path.join(undefined)`
					// when VS Code resolves extension resources.

					// Check for changes
					if (
						NewRegistry.size !== _registry.size ||
						Array.from(NewRegistry.keys()).some(
							(key) =>
								!_registry.has(key) ||
								JSON.stringify(NewRegistry.get(key)) !==
									JSON.stringify(_registry.get(key)),
						)
					) {
						_registry.clear();

						NewRegistry.forEach((v, k) => _registry.set(k, v));

						Logger.Info(
							`[ExtensionService] Extensions discovered: ${NewRegistry.size} extensions`,
						;

						// Emit change event
						OnDidChangeListeners.forEach((Listener) => Listener();
					}
				};

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
			): Promise<IExtension<T> | undefined> =>
				return (() => {
					const Description = _registry.get(ExtensionId;

					if (!Description) {
						return undefined;
					}

					// LAND-FIX: SafePackageJSON guard. Same rationale as
					// ExtensionsNamespace.ts:249 - extensions like
					// muhammad-sammy.csharp call `semver.parse(extension
					// .packageJSON.version)` at activation; an undefined
					// `version` throws "Invalid version. Must be a string.
					// Got type undefined" before activate() can run. The
					// scanner-side Mountain guard (Extensions.rs:162)
					// fills `version: "0.0.0"` but the Description that
					// reaches THIS code path can still be a partial DTO
					// from a degenerate registry insert. Mirror the
					// permissive shape here.
					const SafePackageJSON = (() => {
						const Raw = Description as unknown as Record<
							string,
							unknown
						>;

						const Identifier = Description.identifier;

						const PublisherFallback =
							typeof Identifier === "string"
								? (Identifier.split(".")[0] ?? "unknown")

								: "unknown";

						return {
							...Description,
							name:
								typeof Raw.name === "string" &&
								(Raw.name as string).length > 0
									? (Raw.name as string)

									: Identifier,
							version:
								typeof Raw.version === "string" &&
								(Raw.version as string).length > 0
									? (Raw.version as string)

									: "0.0.0",
							publisher:
								typeof Raw.publisher === "string"
									? (Raw.publisher as string)

									: PublisherFallback,
						} as IExtensionDescription;
					})(;

					const ExtensionObject: IExtension<T> = {
						id: Description.identifier,
						extensionUri: Description.extensionLocation,
						extensionPath: Description.extensionLocation.fsPath,
						isActive: _activation.get(ExtensionId) ?? false,
						packageJSON: SafePackageJSON,
						exports: _exports.get(ExtensionId) as T | undefined,
						extensionKind: Description.kind?.[0],
						activate: async () => {
							Logger.Warn(
								`[ExtensionService] activate() called on ${ExtensionId}, but activation is handled by ExtensionHostService`,
							;

							return _exports.get(ExtensionId) as T;
						},
					};

					return ExtensionObject;
				})(;

			/**
			 * Get all extensions
			 *
			 * TODO: LOW: Implement filtering by extension kind (UI/Workspace)
			 * TODO: LOW: Implement sorting by activation priority
			 */
			const GetAllExtensions = (): Promise<
				readonly IExtension[],
				never
			> =>
				return (() => {
					const Extensions = Array.from(_registry.entries()).map(
						([id, description]): IExtension => {
							// LAND-FIX: SafePackageJSON guard mirrored
							// from GetExtension above so getAllExtensions
							// also returns shape-safe packageJSON.
							const Raw = description as unknown as Record<
								string,
								unknown
							>;

							const PublisherFallback =
								typeof id === "string"
									? (id.split(".")[0] ?? "unknown")

									: "unknown";

							const SafePackageJSON = {
								...description,
								name:
									typeof Raw.name === "string" &&
									(Raw.name as string).length > 0
										? (Raw.name as string)

										: id,
								version:
									typeof Raw.version === "string" &&
									(Raw.version as string).length > 0
										? (Raw.version as string)

										: "0.0.0",
								publisher:
									typeof Raw.publisher === "string"
										? (Raw.publisher as string)

										: PublisherFallback,
							} as IExtensionDescription;

							return {
								id: description.identifier,
								extensionUri: description.extensionLocation,
								extensionPath:
									description.extensionLocation.fsPath,
								isActive: _activation.get(id) ?? false,
								packageJSON: SafePackageJSON,
								exports: _exports.get(id),
							};
						},
					;

					return Extensions;
				})(;

			/**
			 * Get extension path by ID
			 */
			const GetExtensionPath = (
				ExtensionId: string,
			): Promise<string | undefined> =>
				return (
					_registry.get(ExtensionId)?.extensionLocation?.fsPath,
				;

			/**
			 * Register event handler for extension changes
			 */
			const OnDidChange = (Listener: () => any): VSCode.Disposable => {
				OnDidChangeListeners.add(Listener;

				const Disposable = {
					dispose: () => {
						OnDidChangeListeners.delete(Listener;
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
			): Promise<void> =>
				{
					_activation.set(ExtensionId, true;

					_exports.set(ExtensionId, Exports;

					Logger.Info(
						`[ExtensionService] Extension activated: ${ExtensionId}`,
					;
				};

			const MarkDeactivated = (
				ExtensionId: string,
			): Promise<void> =>
				{
					_activation.set(ExtensionId, false;

					Logger.Debug(
						`[ExtensionService] Extension deactivated: ${ExtensionId}`,
					;
				};

			// Discover extensions on initialization
			await DiscoverExtensions(;

			// Return the service implementation with PascalCase methods
			const ServiceImplementation: ExtensionService = {
				GetExtension,
				GetAllExtensions,
				GetExtensionPath,
				OnDidChange,
				MarkActivated,
				MarkDeactivated,
			};

			return ServiceImplementation;
		}),
	},
) {}
