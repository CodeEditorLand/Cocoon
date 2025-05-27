/*---------------------------------------------------------------------------------------------
 * Cocoon Simulated IExtHostExtensionService (extension-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * This file provides a *simulated* implementation of the VS Code `IExtHostExtensionService`.
 * It is NOT intended to be a full replacement for VS Code's real `ExtHostExtensionService`
 * when running standard Cocoon. Instead, its primary purposes are:
 *
 *  1. To support alternative Cocoon execution paths (e.g., a "Grove Rewrite" scenario, *     as mentioned in original comments) where VS Code's original `ExtHostExtensionService`
 *     might not be run, but a compatible API surface for extension management is still needed.
 *  2. To serve as a detailed, self-contained reference for understanding the structure and
 *     dependencies of `vscode.ExtensionContext`. This is crucial for correctly setting up
 *     the Dependency Injection (DI) environment in `Cocoon/index.ts`, especially when
 *     the *real* `ExtHostExtensionService` (Path A) is being used, as it highlights
 *     the services that `ExtensionContext` relies upon.
 *
 * This shim simulates aspects of extension registration (from `initData`), loading (via
 * CJS `require`), activation (calling `activate()` in the extension module), and the
 * meticulous creation of `ExtensionContext` objects. Many advanced features of the real
 * service, such as full ESM support, complex activation event handling, or sophisticated
 * error recovery, are simplified or stubbed.
 *
 * Key Simulated Responsibilities:
 * - Reading extension descriptions from `initData`.
 * - Managing a local `ExtensionDescriptionRegistry`.
 * - Simulating extension activation based on events or direct calls.
 * - Dynamically `require()`-ing extension CJS entry points.
 * - Constructing `vscode.ExtensionContext` instances, including `globalState`, *   `workspaceState`, `secrets`, storage paths, log paths, etc., by leveraging an
 *   injected `IInstantiationService` to access other (potentially shimmed) ExtHost services.
 * - Creating `vscode.Extension` API objects.
 * - Handling a subset of RPC calls that a `MainThreadExtensionService` might make.
 * - Reporting simulated activation status to Mountain via direct IPC.
 *
 * Important Note: For standard Cocoon operation aiming for high VS Code compatibility, * the *real* `ExtHostExtensionService` from `vs/workbench/api/node/extHostExtensionService.ts`
 * should be instantiated and used (as done in `Cocoon/index.ts` for "Path A").
 * This shim is for specialized cases or deep-dive understanding.
 *
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
// Using types from common activator and VS Code base/platform
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	Disposable,
	DisposableStore,
	dispose,
	type IDisposable,
} from "vs/base/common/lifecycle";
// For URI scheme checks
import { Schemas } from "vs/base/common/network";
import {
	// VS Code's internal URI representation
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	CanonicalExtensionIdentifier,
	ExtensionIdentifier,
	type IEnabledApiProposals,
	type IExtensionDescription,
	// Type for extensions in initData
	type ISerializedExtension,
} from "vs/platform/extensions/common/extensions";
import {
	// For service identifiers (though this shim doesn't define new DI keys)
	createDecorator,
	// Core DI service
	type IInstantiationService,
	// Not directly used here but often in DI contexts
	// type ServicesAccessor,
} from "vs/platform/instantiation/common/instantiation";
import {
	ActivationKind,
	// For extensions without an entry point
	EmptyExtension,
	ExtensionActivationTimes,
	ExtensionActivationTimesBuilder,
	// Represents the result of an activation attempt
	type ActivatedExtension,
	type ExtensionActivationReason,
	// Shape of a loaded extension's CJS module
	type IExtensionModule,
} from "vs/workbench/api/common/extHostExtensionActivator";
// For resolving extension by URI
import { ExtensionPaths } from "vs/workbench/api/common/extHostExtensionService";
import {
	// DI Key
	IExtHostInitDataService,
	// Type for initialization data
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	// DI Key
	IExtHostLanguageModels,
} from "vs/workbench/api/common/extHostLanguageModels";
import {
	// DI Key (though its usage in context creation is often implicit)
	IExtHostLocalizationService,
} from "vs/workbench/api/common/extHostLocalizationService";
import {
	// For globalState
	ExtensionGlobalMemento,
	// For workspaceState
	ExtensionMemento,
} from "vs/workbench/api/common/extHostMemento";
// For ExtensionContext.secrets
import { ExtensionSecrets } from "vs/workbench/api/common/extHostSecrets";
import {
	// DI Key
	IExtHostSecretState,
} from "vs/workbench/api/common/extHostSecretState";
import {
	// DI Key
	IExtHostStorage,
} from "vs/workbench/api/common/extHostStorage";
import {
	// DI Key
	IExtensionStoragePaths,
} from "vs/workbench/api/common/extHostStoragePaths";
import {
	// DI Key for terminal service
	IExtHostTerminalService,
	// Actual service shape for context.environmentVariableCollection
	type IExtHostTerminalServiceShape,
} from "vs/workbench/api/common/extHostTerminalService";
import {
	ExtensionDescriptionRegistry,
	// For managing activation events
	type IActivationEventsReader as VscodeActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry";
// For proposed API checks
import { checkProposedApiEnabled as vscodeCheckProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";

// For reporting activation status to Mountain
import { sendNotificationToMountain } from "../cocoon-ipc";
// Public vscode API types, imported from Cocoon's bundled API definitions
import {
	ExtensionKind as VscodeExtensionKind,
	ExtensionMode as VscodeExtensionMode,
	ExtensionRuntime as VscodeExtensionRuntime,
	Uri as VscodeUri,
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type Extension as VscodeExtension,
	type ExtensionContext as VscodeExtensionContext,
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	type Memento as VscodeMemento,
	type SecretStorage as VscodeSecretStorage,
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	type ILogServiceForShim as ILogService,
} from "./_baseShim";

// Use ILogServiceForShim alias

// --- Type Definitions ---

/**
 * Defines the structure of initialization data relevant to this simulated ExtHostExtensionService.
 * It extends `ExtHostInitData` and specifies the expected `extensions` property structure.
 */
interface ShimInitDataForSimulatedExtSvc extends ExtHostInitData {
	extensions: {
		// All known extensions, serialized
		allExtensions: ReadonlyArray<ISerializedExtension>;

		// IDs of extensions to be run in this host (often all for Cocoon)
		myExtensions: ReadonlyArray<ExtensionIdentifier>;

		// Activation events, typically from SyncedActivationEventsReader
		activationEvents: { [extensionId: string]: string[] };
	};
}

/** Represents a loaded CJS extension module, conforming to `IExtensionModule`. */
interface LoadedExtensionModuleShim extends IExtensionModule {}

/**
 * Defines the RPC interface for this simulated `ExtHostExtensionService`, for methods
 * that would be called BY Mountain (if Mountain were interacting with this simulation).
 * Aligns with parts of VS Code's `ExtHostExtensionServiceShape`.
 */
interface CocoonExtHostExtensionServiceRpcShape {
	$activateByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void>;

	$activate(
		extensionIdString: string,

		reason: ExtensionActivationReason,
	): Promise<boolean>;

	$deltaExtensions?(delta: {
		removed: string[];

		added: ISerializedExtension[];

		addActivationEvents?: { [id: string]: string[] };
	}): Promise<void>;

	// TODO: Add other RPC methods from VscodeExtHostExtensionServiceShape as needed for more complete simulation
	// e.g., $setRemoteEnvironment, $updateRemoteConnectionData
}

/**
 * Defines the minimal API surface of a `vscode.Extension` object that is required
 * by `vscode.ExtensionContext.extension`. Aligns with public fields of `vscode.Extension<T>`.
 */
interface ExtensionContextExtensionApi {
	readonly id: string;

	readonly extensionUri: VscodeUri;

	readonly extensionPath: string;

	readonly isActive: boolean;

	// The full, resolved extension description
	readonly packageJSON: IExtensionDescription;

	readonly extensionKind: VscodeExtensionKind;

	// The `exports` object from the activated extension module
	readonly exports: any;

	// Method to programmatically activate the extension
	activate(): Promise<any>;
}

/**
 * Defines the type for the `ExtensionContext` provided by this shim.
 * It matches `VscodeExtensionContext` but uses the more specific `ExtensionContextExtensionApi`
 * for its `extension` property.
 */
type CocoonExtensionContextApi = Omit<VscodeExtensionContext, "extension"> & {
	extension: ExtensionContextExtensionApi;
};

/**
 * A simple reader for activation events, initialized from `initData`.
 */
class CocoonActivationEventsReader implements VscodeActivationEventsReader {
	private readonly _map = new ExtensionIdentifierMap<string[]>();

	constructor(activationEvents: { [extensionId: string]: string[] }) {
		this.addActivationEvents(activationEvents);
	}

	public readActivationEvents(desc: IExtensionDescription): string[] {
		// Prefer events from this reader, fallback to those in IExtensionDescription.activationEvents
		return this._map.get(desc.identifier) ?? desc.activationEvents ?? [];
	}

	public addActivationEvents(newEvents: {
		[extensionId: string]: string[];
	}): void {
		for (const idStr in newEvents) {
			if (
				Object.prototype.hasOwnProperty.call(
					newEvents,

					idStr,
				)
			) {
				this._map.set(new ExtensionIdentifier(idStr), newEvents[idStr]);
			}
		}
	}
}

/**
 * Simulated implementation of `IExtHostExtensionService`.
 * See file header for detailed explanation of its purpose and limitations.
 */
export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements CocoonExtHostExtensionServiceRpcShape
{
	// Not a DI service itself, but simulates one.
	public readonly _serviceBrand: undefined;

	readonly #initData: ShimInitDataForSimulatedExtSvc;

	// Holds all known extension descriptions
	#extensionRegistry: ExtensionDescriptionRegistry;

	// Custom reader for activation events
	readonly #activationEventsReader: CocoonActivationEventsReader;

	// Tracks activation performance
	readonly #activationTimes = new Map<string, ExtensionActivationTimes>();

	// Stores exported APIs of activated extensions
	readonly #extensionExports = new Map<string, any>();

	// Stores errors encountered during activation
	readonly #activationErrors = new Map<string, Error>();

	readonly #activationPromises = new Map<
		string,
		Promise<ActivatedExtension>
		// Tracks ongoing activation attempts
	>();

	readonly #extensionModulesCache = new Map<
		string,
		LoadedExtensionModuleShim
		// Cache for loaded CJS modules
	>();

	private readonly _onDidRegisterExtensions = new VscodeEmitter<void>();

	public readonly onDidRegisterExtensions: VscodeEvent<void> =
		this._onDidRegisterExtensions.event;

	// Core DI service
	private readonly _instantiationService: IInstantiationService;

	constructor(
		initData: ShimInitDataForSimulatedExtSvc,

		// Use ILogServiceForShim for consistency
		logService: ILogService | undefined,

		// Injected DI service
		instantiationService: IInstantiationService,
	) {
		super(
			"SimulatedExtHostExtensionService",

			// This shim doesn't typically use RPC for its own outgoing calls.
			undefined,

			// Cast to specific type if needed
			logService as ILogServiceForShim | undefined,
		);

		this.#initData = initData;

		this._instantiationService = instantiationService;

		this._logInfo("Initializing (Simulated ExtHostExtensionService)...");

		this.#activationEventsReader = new CocoonActivationEventsReader(
			this.#initData.extensions.activationEvents || {},
		);

		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			this.#activationEventsReader,

			this._reviveSerializedExtensions(
				this.#initData.extensions.allExtensions || [],
			),
		);

		this._logInfo(
			`Simulated Registry initialized with ${this.#extensionRegistry.getAllExtensionDescriptions().length} extensions.`,
		);

		// Signal initial registration
		this._onDidRegisterExtensions.fire();
	}

	/** Converts serialized extension data from initData into `IExtensionDescription` objects. */
	private _reviveSerializedExtensions(
		serializedExts: ReadonlyArray<ISerializedExtension>,
	): IExtensionDescription[] {
		return (
			serializedExts
				.map((sExt): IExtensionDescription | null => {
					try {
						const identifier = ExtensionIdentifier.revive(
							sExt.identifier,
						);

						if (!identifier) {
							this._logWarn(
								"Failed to revive extension identifier from serialized data:",

								sExt.identifier,
							);

							return null;
						}

						const extensionLocation =
							this._reviveUriDtoToInternalVSCodeUri(
								sExt.extensionLocation,
							);

						if (!extensionLocation) {
							this._logWarn(
								`Failed to revive extensionLocation URI for extension '${identifier.value}'. Skipping.`,

								"Location DTO:",

								sExt.extensionLocation,
							);

							return null;
						}

						return {
							// Spread all properties from ISerializedExtension
							...sExt,

							identifier,

							// Revived URI object
							extensionLocation,

							// Ensure boolean properties are correctly typed (they might be undefined in ISerializedExtension)
							isBuiltin: !!sExt.isBuiltin,

							isUserBuiltin: !!sExt.isUserBuiltin,

							isUnderDevelopment: !!sExt.isUnderDevelopment,

							// Default optional fields if not present in serialized form
							enabledApiProposals:
								sExt.enabledApiProposals || undefined,

							// Entry point for web extensions
							browser: sExt.browser || undefined,

							// Special entry for desktop (rarely used)
							desktop: sExt.desktop || undefined,

							// CJS entry point for Node.js
							main: sExt.main || undefined,

							// ensure other IExtensionDescription fields that might be optional in ISerializedExtension are handled
						} as IExtensionDescription;
					} catch (e: any) {
						this._logError(
							"Error reviving serialized extension data. Skipping extension.",

							"Serialized Data:",

							sExt,

							"Error:",

							e,
						);

						return null;
					}
				})
				// Filter out nulls
				.filter((desc): desc is IExtensionDescription => desc !== null)
		);
	}

	/** Simulates VS Code's "masterInitialize" phase, triggering eager activations. */
	public async anaylábInitialize(): Promise<void> {
		// Original name in VS Code: "masterInitialize"
		this._logInfo(
			"Simulated master initialization: Triggering eager activations (activation event '*') now...",
		);

		// "*" is the eager activation event
		await this._triggerActivationsByEvent("*", ActivationKind.Normal);

		this._logInfo(
			"Simulated master initialization and eager activations finished.",
		);
	}

	/** Public alias for initialization. */
	public async initialize(): Promise<void> {
		return this.anaylábInitialize();
	}

	/** Simulates termination signal handling (currently a NOP). */
	public terminate(_reason: string): void {
		this._logWarn(
			`Simulated IExtHostExtensionService.terminate() called with reason: '${_reason}'. This is a No-Operation in the shim.`,
		);
	}

	/** Retrieves the description for a single extension by its ID. */
	public async getExtension(
		extensionIdString: string,
	): Promise<IExtensionDescription | undefined> {
		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionRegistry.getExtensionDescription(id) || undefined;
	}

	/** Retrieves descriptions for all known extensions. */
	public async getExtensions(): Promise<IExtensionDescription[]> {
		return this.#extensionRegistry.getAllExtensionDescriptions();
	}

	/** Checks if an extension with the given ID has been activated (or attempted activation). */
	public isActivated(extensionIdString: string): boolean {
		const id = new ExtensionIdentifier(extensionIdString);

		const canonicalId = CanonicalExtensionIdentifier.toKey(id);

		// Considered activated if its exports are available or if an activation error occurred.
		return (
			this.#extensionExports.has(canonicalId) ||
			this.#activationErrors.has(canonicalId)
		);
	}

	/** Retrieves the exported API of an activated extension. */
	public getExtensionExports(extensionIdString: string): any | undefined {
		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionExports.get(
			CanonicalExtensionIdentifier.toKey(id),
		);
	}

	/**
	 * Simulates the activation of an extension by its ID and a given reason.
	 * This is the core activation logic for the simulated service.
	 */
	public async activateById(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<void> {
		const canonicalId = CanonicalExtensionIdentifier.toKey(extensionId);

		// If activation is already in progress for this extension, await the existing promise.
		if (this.#activationPromises.has(canonicalId)) {
			this._logDebug(
				`Activation for '${extensionId.value}' already in progress or completed. Awaiting existing promise.`,
			);

			try {
				const existingActivationResult =
					await this.#activationPromises.get(canonicalId)!;

				if (existingActivationResult.activationFailed) {
					// If prior attempt failed, rethrow its error.
					throw existingActivationResult.activationFailedError;
				}

				// Activation already succeeded or is successfully in progress.
				return;
			} catch (e: any) {
				this._logError(
					`Re-entrant await for activation of '${extensionId.value}' resulted in failure:`,

					e,
				);

				// Propagate the original activation failure.
				throw e;
			}
		}

		// Start a new activation attempt.
		const activationPromise = this._activateExtensionModule(
			extensionId,

			reason,
		);

		this.#activationPromises.set(canonicalId, activationPromise);

		try {
			const result = await activationPromise;

			if (result.activationFailed) {
				const errorToThrow =
					result.activationFailedError ||
					new Error(
						`Simulated activation failed (unknown reason) for extension: ${extensionId.value}`,
					);

				// Ensure error is stored.
				this.#activationErrors.set(canonicalId, errorToThrow);

				this._reportActivationStatusToMountain(extensionId, result);

				// Throw to signal failure to the caller.
				throw errorToThrow;
			}

			// Success, exports are set by _activateExtensionModule.
			// Activation status reporting for success is handled in the `finally` block.
		} catch (error: any) {
			// If an error was thrown from _activateExtensionModule and not caught as `activationFailed` within its return,

			// ensure it's stored in #activationErrors.
			if (!this.#activationErrors.has(canonicalId)) {
				this.#activationErrors.set(
					canonicalId,

					error instanceof Error ? error : new Error(String(error)),
				);
			}

			// Construct a failed activation result for reporting if not already done.
			const failedActivationResult: ActivatedExtension = {
				activationFailed: true,

				activationFailedError: this.#activationErrors.get(canonicalId)!,

				// Empty module on failure
				module: {},

				// No exports on failure
				exports: undefined,

				disposable: Disposable.None,

				activationTimes:
					// Use existing times if available
					this.#activationTimes.get(canonicalId) ||
					// Or build minimal times
					new ExtensionActivationTimesBuilder(reason.startup).build(),
			};

			this._reportActivationStatusToMountain(
				extensionId,

				failedActivationResult,
			);

			// Rethrow the original error or the one from #activationErrors.
			throw error;
		} finally {
			// After promise settles (success or caught failure), check if it was a success to report.
			// Failures are reported in the catch blocks.
			if (
				!this.#activationErrors.has(canonicalId) &&
				this.#extensionExports.has(canonicalId)
			) {
				// Promise should be resolved here.
				const status = await this.#activationPromises.get(canonicalId)!;

				this._reportActivationStatusToMountain(extensionId, status);
			}

			// It's generally good practice to remove the promise from the map once it has settled,

			// to allow for potential re-activation attempts if the extension system supports it,

			// or to save memory if it doesn't. However, VS Code's real ExtHost might keep it
			// to prevent re-activation. For this sim, let's clear it to simplify re-testability.
			// this.#activationPromises.delete(canonicalId);
		}
	}

	/** RPC method: Activates extensions based on an activation event string. */
	public async $activateByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void> {
		this._logInfo(
			`RPC $activateByEvent: Triggering activations for event='${activationEvent}' (Kind: ${ActivationKind[activationKind]})`,
		);

		// Run in background, don't await here as RPC call should return quickly.
		this._triggerActivationsByEvent(activationEvent, activationKind).catch(
			(err) => {
				this._logError(
					`Error during background activation triggered by event '${activationEvent}':`,

					err,
				);
			},
		);
	}

	/** RPC method: Activates a specific extension by its ID. */
	public async $activate(
		extensionIdString: string,

		reason: ExtensionActivationReason,
	): Promise<boolean> {
		const extensionId = new ExtensionIdentifier(extensionIdString);

		this._logInfo(
			`RPC $activate: Request to activate extension '${extensionId.value}', Reason: Kind=${ActivationKind[reason.activationKind]}, Event='${reason.activationEvent}'`,
		);

		try {
			await this.activateById(extensionId, reason);

			// Activation successful or already active
			return true;
		} catch (e: any) {
			this._logError(
				`RPC $activate call for '${extensionId.value}' failed during activation process: ${e.message}`,
			);

			// Activation failed
			return false;
		}
	}

	/** RPC method: Handles delta updates to the set of known extensions. */
	public async $deltaExtensions(delta: {
		removed: string[];

		added: ISerializedExtension[];

		addActivationEvents?: { [id: string]: string[] };
	}): Promise<void> {
		this._logInfo(
			`RPC $deltaExtensions: Processing delta. Added: ${delta.added.length}, Removed: ${delta.removed.length}, ActivationEvents Updated: ${delta.addActivationEvents ? Object.keys(delta.addActivationEvents).length : 0}`,
		);

		if (delta.addActivationEvents) {
			this.#activationEventsReader.addActivationEvents(
				delta.addActivationEvents,
			);
		}

		const currentDescs =
			this.#extensionRegistry.getAllExtensionDescriptions();

		const removedIdsSet = new Set(
			delta.removed.map((idStr) =>
				CanonicalExtensionIdentifier.toKey(
					new ExtensionIdentifier(idStr),
				),
			),
		);

		const newDescs = currentDescs.filter(
			(d) =>
				!removedIdsSet.has(
					CanonicalExtensionIdentifier.toKey(d.identifier),
				),
		);

		newDescs.push(...this._reviveSerializedExtensions(delta.added));

		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			this.#activationEventsReader,

			newDescs,
		);

		this._logInfo(
			`Simulated Extension registry updated by delta. New total extension count: ${newDescs.length}`,
		);

		// Signal that the set of extensions has changed.
		this._onDidRegisterExtensions.fire();
	}

	/** Helper to revive URI DTOs from initData or RPC payloads to VSCodeInternalURI objects. */
	private _reviveUriDtoToInternalVSCodeUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VSCodeInternalURI | undefined {
		if (!uriDto) return undefined;

		try {
			return VSCodeInternalURI.revive(uriDto);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VSCodeInternalURI:",

				"DTO:",

				uriDto,

				"Error:",

				e,
			);

			return undefined;
		}
	}

	/** Triggers activations for all extensions registered for the "*" (eager) activation event. */
	private async _triggerEagerActivations(): Promise<void> {
		await this._triggerActivationsByEvent("*", ActivationKind.Normal);
	}

	/** Triggers activations for extensions matching a given activation event. */
	private async _triggerActivationsByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void> {
		if (!this.#extensionRegistry) {
			this._logWarn(
				"Cannot trigger activations by event: ExtensionRegistry is not available.",
			);

			return;
		}

		const candidates =
			this.#extensionRegistry.getExtensionDescriptionsForActivationEvent(
				activationEvent,
			);

		if (candidates.length > 0) {
			this._logDebug(
				`Found ${candidates.length} candidate(s) for activation event '${activationEvent}'.`,
			);

			const reasonBase: Omit<ExtensionActivationReason, "extensionId"> = {
				// True if eager activation
				startup: activationEvent === "*",

				activationEvent,

				activationKind,
			};

			const activationPromises = candidates.map((desc) =>
				this.activateById(desc.identifier, {
					...reasonBase,

					extensionId: desc.identifier,
				}).catch((_err: any) => {
					/* Errors are already logged by activateById */
				}),
			);

			// Wait for all attempts to complete or fail.
			await Promise.allSettled(activationPromises);
		} else {
			this._logDebug(
				`No extensions found for activation event '${activationEvent}'.`,
			);
		}
	}

	/**
	 * Core logic for activating a single extension module. This involves loading its CJS module,
	 *
	 *
	 * creating its `ExtensionContext`, and calling its `activate()` function.
	 */
	private async _activateExtensionModule(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<ActivatedExtension> {
		const desc =
			this.#extensionRegistry.getExtensionDescription(extensionId);

		if (!desc) {
			const error = new Error(
				`Simulated ExtHostExtensionService: Extension description not found for ID '${extensionId.value}' during activation attempt.`,
			);

			this.#activationErrors.set(
				CanonicalExtensionIdentifier.toKey(extensionId),

				error,
			);

			// This error will be caught by activateById and reported.
			throw error;
		}

		// --- Proposed API Check (Simplified from VS Code's ExtHostExtensionService) ---
		const enabledProposalsSource =
			this.#initData.environment.extensionEnabledProposedApi;

		// Undefined means check against product.json '*' if no specific entry
		let finalEnabledProposalsForExt: string[] | undefined = undefined;

		if (Array.isArray(enabledProposalsSource)) {
			// Simple global list
			finalEnabledProposalsForExt = enabledProposalsSource;
		} else if (
			enabledProposalsSource &&
			typeof enabledProposalsSource === "object"
		) {
			// Per-extension config
			finalEnabledProposalsForExt = [
				// Global proposals from '*' key
				...(enabledProposalsSource["*"] || []),

				// Extension-specific proposals
				...(enabledProposalsSource[desc.identifier.value] || []),
			];
		}

		if (desc.enabledApiProposals) {
			// Check if extension requests any proposed APIs
			for (const proposal of desc.enabledApiProposals) {
				if (
					!vscodeCheckProposedApiEnabled(
						desc,

						finalEnabledProposalsForExt /* can be undefined */,

						proposal,
					)
				) {
					this._logWarn(
						`Simulated Proposed API Check: Extension '${desc.identifier.value}' requests proposed API '${proposal}', ` +
							`which is NOT ENABLED in this Cocoon environment configuration. The API may not be available to the extension.`,
					);

					// Note: In VS Code, this might prevent activation or log more severely.
					// Here, we log a warning; the API factory is responsible for not providing the API.
				}
			}
		}

		// Gets the 'main' field, processed.
		const entryPoint = this._getEntryPointShim(desc);

		const activationTimesBuilder = new ExtensionActivationTimesBuilder(
			reason.startup,
		);

		if (!entryPoint) {
			this._logInfo(
				`Simulated Activation: Extension '${desc.identifier.value}' has no CJS entry point ('main' field). Activating as EmptyExtension.`,
			);

			const times = activationTimesBuilder.build();

			this.#activationTimes.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				times,
			);

			// No exports for an empty extension.
			this.#extensionExports.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				undefined,
			);

			return new EmptyExtension(times);
		}

		let loadedModule: LoadedExtensionModuleShim | undefined;

		let contextApi: CocoonExtensionContextApi | undefined;

		try {
			// Construct the absolute path to the extension's main module.
			// Assumes entryPoint does not include '.js'.
			const modulePath = path.join(
				desc.extensionLocation.fsPath,

				entryPoint.endsWith(".js") || entryPoint.endsWith(".mjs")
					? entryPoint
					: `${entryPoint}.js`,
			);

			this._logDebug(
				`Simulated Activation: Attempting to load CJS module for '${desc.identifier.value}' from path: ${modulePath}`,
			);

			activationTimesBuilder.codeLoadingStart();

			// Standard CJS require for simulation
			loadedModule = require(modulePath) as LoadedExtensionModuleShim;

			activationTimesBuilder.codeLoadingStop();

			this._logDebug(
				`Simulated Activation: Module loaded for '${desc.identifier.value}'.`,
			);

			this.#extensionModulesCache.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				loadedModule,
			);

			// Create the ExtensionContext for this extension.
			contextApi = await this._loadExtensionContextShim(desc);

			this._logDebug(
				`Simulated Activation: ExtensionContext created for '${desc.identifier.value}'.`,
			);

			let activationResult: any = undefined;

			if (typeof loadedModule?.activate === "function") {
				this._logDebug(
					`Simulated Activation: Calling activate() function for '${desc.identifier.value}'...`,
				);

				activationTimesBuilder.activateCallStart();

				// Extensions expect to receive `vscode.ExtensionContext` as defined by the API.
				activationResult = await Promise.resolve(
					loadedModule.activate.apply(globalThis, [
						contextApi as VscodeExtensionContext,
					]),
				);

				activationTimesBuilder.activateCallStop();

				this._logDebug(
					`Simulated Activation: activate() function for '${desc.identifier.value}' completed.`,
				);
			} else {
				this._logWarn(
					`Simulated Activation: Extension '${desc.identifier.value}' has an entry point ('${entryPoint}') but no activate() function. No activation performed.`,
				);

				// Still mark as "called" for timing.
				activationTimesBuilder.activateCallStop();
			}

			// For consistency with VS Code's timings
			activationTimesBuilder.activateResolveStart();

			activationTimesBuilder.activateResolveStop();

			this.#extensionExports.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				activationResult,
			);

			const activationTimes = activationTimesBuilder.build();

			this.#activationTimes.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				activationTimes,
			);

			this.#activationErrors.delete(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				// Clear any prior error for this ext
			);

			return {
				activationFailed: false,

				activationFailedError: null,

				activationTimes,

				// Provide empty object if module somehow undefined but no error
				module: loadedModule || {},

				exports: activationResult,

				// Each activated extension gets its own disposable store for its resources
				disposable: new DisposableStore(),
			};
		} catch (error: any) {
			this._logError(
				`Simulated Activation: FAILED to load or call activate() for extension '${desc.identifier.value}'. EntryPoint: '${entryPoint}'. Error:`,

				error,
			);

			// This error object will be returned in ActivatedExtension.activationFailedError.
			return {
				activationFailed: true,

				activationFailedError: error,

				// Capture timings up to the point of failure
				activationTimes: activationTimesBuilder.build(),

				module: loadedModule || {},

				exports: undefined,

				// No resources to dispose on failed activation typically
				disposable: Disposable.None,
			};
		}
	}

	/**
	 * Constructs the `vscode.ExtensionContext` object for a given extension.
	 * This method uses the injected `IInstantiationService` to retrieve various
	 * dependent services (like storage, secrets, terminal) that are part of the context.
	 */
	protected async _loadExtensionContextShim(
		desc: IExtensionDescription,
	): Promise<CocoonExtensionContextApi> {
		const iService = this._instantiationService;

		if (!iService) {
			// This would be a critical setup error for the simulated service.
			throw new Error(
				"SimulatedExtHostExtensionService: IInstantiationService is unavailable. Cannot create ExtensionContext.",
			);
		}

		this._logDebug(
			`Loading ExtensionContext for '${desc.identifier.value}'...`,
		);

		// Memento (State) Storage
		const storageService = iService.invokeFunction((accessor) =>
			accessor.get<IExtHostStorage>(IExtHostStorage),
		);

		// Global Memento
		const globalState = new ExtensionGlobalMemento(desc, storageService);

		const workspaceState = new ExtensionMemento(
			desc.identifier.value,

			false /* not global */,

			storageService,

			// Workspace Memento
		);

		// Ensure Mementos are ready
		await Promise.all([globalState.whenReady, workspaceState.whenReady]);

		this._logDebug(
			`Mementos (globalState, workspaceState) initialized for '${desc.identifier.value}'.`,
		);

		// Storage Paths
		const storagePathsService = iService.invokeFunction((accessor) =>
			accessor.get<IExtensionStoragePaths>(IExtensionStoragePaths),
		);

		const storageUri = VscodeUri.from(
			storagePathsService.workspaceValue(desc) || desc.extensionLocation,

			// Workspace-specific storage URI
		);

		const globalStorageUri = VscodeUri.from(
			storagePathsService.globalValue(desc),

			// Global storage URI
		);

		this._logDebug(
			`Storage URIs resolved for '${desc.identifier.value}': Workspace='${storageUri.fsPath}', Global='${globalStorageUri.fsPath}'.`,
		);

		// Secret Storage
		let secretsApiObject: VscodeSecretStorage;

		try {
			const secretStateService = iService.invokeFunction((accessor) =>
				accessor.get<IExtHostSecretState>(IExtHostSecretState),
			);

			secretsApiObject = new ExtensionSecrets(desc, secretStateService);

			this._logDebug(
				`SecretStorage initialized for '${desc.identifier.value}'.`,
			);
		} catch (e: any) {
			// Catch error if IExtHostSecretState DI fails
			this._logWarn(
				`IExtHostSecretState DI failed for extension '${desc.identifier.id}'. SecretStorage will be a NOP. Error: ${e.message || e}`,
			);

			secretsApiObject = {
				// Provide a NOP SecretStorage implementation
				get: () => Promise.resolve(undefined),

				store: () => Promise.resolve(),

				delete: () => Promise.resolve(),

				onDidChange: VscodeEvent.None,
			};
		}

		// Log Path
		const initDataService = iService.invokeFunction((accessor) =>
			accessor.get<IExtHostInitDataService>(IExtHostInitDataService),
		);

		const logPathBaseUriDto = initDataService.value.logsLocation;

		if (!logPathBaseUriDto) {
			throw new Error(
				`Logs location URI (initData.logsLocation) not available for ExtensionContext creation for '${desc.identifier.value}'.`,
			);
		}

		const logPathBaseUri = VSCodeInternalURI.revive(logPathBaseUriDto);

		const logFileUri = VscodeUri.joinPath(
			VscodeUri.from(logPathBaseUri),

			`${desc.identifier.value}.log`,

			// Extension-specific log file URI
		);

		this._logDebug(
			`Log URI determined for '${desc.identifier.value}': ${logFileUri.fsPath}`,
		);

		// Environment Variable Collection
		let envVarCollectionApiObject: VscodeEnvironmentVariableCollection;

		const extensionApiObjectForContext =
			// Create the `vscode.Extension` part of the context
			this._createVscodeExtensionApiObject(desc);

		try {
			const terminalService = iService.invokeFunction((accessor) =>
				accessor.get<IExtHostTerminalServiceShape>(
					IExtHostTerminalService,
				),
			);

			envVarCollectionApiObject =
				terminalService.getEnvironmentVariableCollection(
					extensionApiObjectForContext as VscodeExtension<any>,
				);

			this._logDebug(
				`EnvironmentVariableCollection obtained for '${desc.identifier.value}'.`,
			);
		} catch (e: any) {
			// Catch error if IExtHostTerminalService DI fails
			this._logWarn(
				`IExtHostTerminalService DI failed for extension '${desc.identifier.id}'. EnvironmentVariableCollection will be a NOP. Error: ${e.message || e}`,
			);

			envVarCollectionApiObject = {
				// Provide a NOP EnvVarCollection
				persistent: true,

				description: undefined,

				replace: () => {},

				append: () => {},

				prepend: () => {},

				get: () => undefined,

				forEach: () => {},

				delete: () => {},

				clear: () => {},

				// Make it iterable
				[Symbol.iterator]: function* () {},

				toArray: () => Object.freeze([]),
			};
		}

		// Language Model Access Information
		let langModelAccessInfoApiObject: VscodeLanguageModelAccessInformation;

		try {
			const langModelsService = iService.invokeFunction((accessor) =>
				accessor.get<IExtHostLanguageModels>(IExtHostLanguageModels),
			);

			langModelAccessInfoApiObject =
				langModelsService.createLanguageModelAccessInformation(desc);

			this._logDebug(
				`LanguageModelAccessInformation created for '${desc.identifier.value}'.`,
			);
		} catch (e: any) {
			// Catch error if IExtHostLanguageModels DI fails
			this._logWarn(
				`IExtHostLanguageModels DI failed for extension '${desc.identifier.id}'. LanguageModelAccessInformation will be a NOP. Error: ${e.message || e}`,
			);

			langModelAccessInfoApiObject = {
				// Provide a NOP LMAI
				get accessAllowed() {
					return false;
				},

				onDidChange: VscodeEvent.None,
			};
		}

		// Construct the ExtensionContext object.
		const context: VscodeExtensionContext = {
			// Each extension gets its own array of disposables.
			subscriptions: [],

			// Cast to public API type
			globalState: globalState as VscodeMemento,

			// Cast to public API type
			workspaceState: workspaceState as VscodeMemento,

			secrets: secretsApiObject,

			// Public API URI type
			extensionUri: VscodeUri.from(desc.extensionLocation),

			// Filesystem path
			extensionPath: desc.extensionLocation.fsPath,

			environmentVariableCollection: envVarCollectionApiObject,

			asAbsolutePath: (relativePath: string) =>
				path.join(desc.extensionLocation.fsPath, relativePath),

			// Workspace-specific storage URI
			storageUri,

			storagePath:
				// fsPath only if file URI
				storageUri?.scheme === Schemas.file ? storageUri.fsPath : null,

			// Global storage URI
			globalStorageUri,

			// fsPath for global (assumed file URI)
			globalStoragePath: globalStorageUri.fsPath,

			// URI for extension-specific logs
			logUri,

			// fsPath for logs (assumed file URI)
			logPath: logUri.fsPath,

			extensionMode: desc.isUnderDevelopment
				? VscodeExtensionMode.Development
				: VscodeExtensionMode.Production,

			// The vscode.Extension<T> object itself
			extension: extensionApiObjectForContext as VscodeExtension<any>,

			// Cocoon simulates a Node.js runtime
			extensionRuntime: VscodeExtensionRuntime.Node,

			languageModelAccessInformation: langModelAccessInfoApiObject,
		};

		// Ensure context is immutable
		return Object.freeze(context) as CocoonExtensionContextApi;
	}

	/** Determines the CJS entry point (main file) for an extension from its description. */
	protected _getEntryPointShim(
		desc: IExtensionDescription,
	): string | undefined {
		// `desc.main` is the CJS entry point. Remove .js extension if present, as `require` handles it.
		if (typeof desc.main === "string" && desc.main.length > 0) {
			return desc.main.replace(/\.js$/, "");
		}

		// No CJS main entry point specified.
		return undefined;
	}

	/**
	 * Creates the `vscode.Extension<T>` API object for a given extension description.
	 * This object is part of the `ExtensionContext`.
	 */
	protected _createVscodeExtensionApiObject(
		desc: IExtensionDescription,
	): ExtensionContextExtensionApi {
		// Capture `this` (ShimExtHostExtensionService instance) for getters/methods.
		const self = this;

		const apiObject: ExtensionContextExtensionApi = {
			get id() {
				return desc.identifier.id;

				// Canonical ID string "publisher.name"
			},

			get extensionUri() {
				return VscodeUri.from(desc.extensionLocation);

				// API URI type
			},

			get extensionPath() {
				return desc.extensionLocation.fsPath;

				// Filesystem path
			},

			get isActive() {
				return self.isActivated(desc.identifier.value);

				// Check activation status
			},

			get packageJSON() {
				return desc;

				// The IExtensionDescription itself serves as packageJSON
			},

			get extensionKind() {
				// Determine VscodeExtensionKind based on IExtensionDescription.extensionKind (string[])
				// This is a simplified mapping. VS Code's logic is more nuanced.
				if (desc.extensionKind && desc.extensionKind.length > 0) {
					// 'ui' or 'web' typically map to VscodeExtensionKind.UI.
					if (
						desc.extensionKind.some(
							(kind) => kind === "ui" || kind === "web",
						)
					)
						return VscodeExtensionKind.UI;

					// 'workspace' maps to VscodeExtensionKind.Workspace.
					if (desc.extensionKind.some((kind) => kind === "workspace"))
						return VscodeExtensionKind.Workspace;
				}

				// Fallback: If kind is not specified or ambiguous, assume Workspace for Node-based host
				// if not explicitly remote.
				return desc.extensionLocation.scheme === Schemas.vscodeRemote
					? // Remote extensions run in a workspace context
						VscodeExtensionKind.Workspace
					: // Default for local Node host
						VscodeExtensionKind.Workspace;
			},

			get exports() {
				return self.getExtensionExports(desc.identifier.value);

				// Get exported API
			},

			activate: async (): Promise<any> => {
				// Programmatic activation
				if (!self.isActivated(desc.identifier.value)) {
					const reason: ExtensionActivationReason = {
						startup: false,

						extensionId: desc.identifier,

						// Standard event for API activation
						activationEvent: `extension-api:${desc.identifier.id}`,

						activationKind: ActivationKind.Api,
					};

					await self.activateById(desc.identifier, reason);
				}

				// Return exports after activation
				return self.getExtensionExports(desc.identifier.value);
			},
		};

		// Ensure API object is immutable
		return Object.freeze(apiObject);
	}

	/** Reports extension activation status to Mountain via direct IPC. */
	protected _reportActivationStatusToMountain(
		extensionId: ExtensionIdentifier,

		status: ActivatedExtension,
	): void {
		if (
			!status ||
			!status.activationTimes ||
			!status.activationTimes.activationReason
		) {
			this._logError(
				`Cannot report activation status for '${extensionId.value}': Status object or essential timing/reason data is invalid.`,

				"Status Object:",

				status,
			);

			return;
		}

		// Serialize activation times and reason for IPC transport.
		const serializableTimes = {
			startup: status.activationTimes.startup,

			codeLoadingTime: status.activationTimes.codeLoadingTime,

			activateCallTime: status.activationTimes.activateCallTime,

			activateResolvedTime: status.activationTimes.activateResolvedTime,

			activationReason: {
				// Ensure reason parts are serializable
				startup: status.activationTimes.activationReason.startup,

				extensionId:
					// Send string ID
					status.activationTimes.activationReason.extensionId.value,

				activationEvent:
					status.activationTimes.activationReason.activationEvent,

				activationKind:
					// Enum value (number)
					status.activationTimes.activationReason.activationKind,
			},
		};

		const errorPayload = status.activationFailedError
			? {
					message: status.activationFailedError.message,

					stack: status.activationFailedError.stack,

					name: status.activationFailedError.name,
				}
			: null;

		sendNotificationToMountain("extensionActivationResult", {
			// Send string ID
			id: extensionId.value,

			success: !status.activationFailed,

			error: errorPayload,

			activationTimes: serializableTimes,
		}).catch((e: any) =>
			this._logError(
				`Failed to send activation status report to Mountain for extension '${extensionId.value}':`,

				e,
			),
		);
	}

	/**
	 * Disposes of resources held by this simulated service.
	 */
	public override dispose(): void {
		// Base class disposable handling
		super.dispose();

		this._onDidRegisterExtensions.dispose();

		this.#activationPromises.clear();

		this.#activationErrors.clear();

		this.#extensionExports.clear();

		this.#extensionModulesCache.clear();

		this.#activationTimes.clear();

		// this.#extensionRegistry might not have an explicit dispose method itself.
		this._logInfo(
			"Disposed SimulatedExtHostExtensionService and cleared internal caches.",
		);
	}
}
