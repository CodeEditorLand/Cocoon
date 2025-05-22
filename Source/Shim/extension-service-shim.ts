/*---------------------------------------------------------------------------------------------
 * Cocoon Simulated IExtHostExtensionService (extension-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * This file provides a *simulated* implementation of the VS Code
 * IExtHostExtensionService. It is primarily intended for:
 *  1. A "Path B" (e.g., Grove Rewrite) scenario where VS Code's original
 *     ExtHostExtensionService is NOT run.
 *  2. As a detailed reference for understanding the dependencies and structure
 *     of `vscode.ExtensionContext`, which is crucial for Cocoon's `index.ts`
 *     when setting up the DI environment for the *real* ExtHostExtensionService (Path A).
 *
 * It simulates extension registration, loading, activation, and ExtensionContext creation.
 * Many advanced features of the real service are simplified or stubbed.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
// Using types from common activator
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	DisposableStore,
	IDisposable,
	dispose,
} from "vs/base/common/lifecycle";
// For Schemas.file etc.
import { Schemas } from "vs/base/common/network";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// --- VS Code Internal Module Imports ---
import {
	CanonicalExtensionIdentifier,
	ExtensionIdentifier,
	IEnabledApiProposals,
	type IExtensionDescription,
	type ISerializedExtension,
	MissingExtensionDependency,
} from "vs/platform/extensions/common/extensions";
import {
	type ActivatedExtension,
	ActivationKind,
	EmptyExtension,
	type ExtensionActivationReason,
	ExtensionActivationTimes,
	ExtensionActivationTimesBuilder,
	IExtensionAPI,
	type IExtensionModule,
} from "vs/workbench/api/common/extHostExtensionActivator";
import {
	type ExtHostInitData,
	IExtHostInitDataService,
	// For initData
} from "vs/workbench/api/common/extHostInitDataService";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
// For localized messages
import { IExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
import {
	IExtHostSecretState,
	IExtHostSecrets,
	// IExtHostSecrets might be the DI key
} from "vs/workbench/api/common/extHostSecretState";
// --- Service Interface Imports (for DI access during ExtensionContext creation) ---
// These are the interfaces for services that ExtHostExtensionService would get from DI.
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
// IExtHostConfiguration is used by configProvider, which is used by real ExtHostExtensionService
// import { IExtHostConfiguration, IExtHostConfigurationShape } from "vs/workbench/api/common/extHostConfiguration";

import {
	IExtHostTerminalService,
	type IExtHostTerminalServiceShape,
} from "vs/workbench/api/common/extHostTerminalService";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader as VscodeActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry";
import { checkProposedApiEnabled as vscodeCheckProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";

import {
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type Extension as VscodeExtension,
	type ExtensionContext as VscodeExtensionContext,
	ExtensionKind as VscodeExtensionKind,
	ExtensionMode as VscodeExtensionMode,
	ExtensionRuntime as VscodeExtensionRuntime,
	// For ExtensionContext.languageModelAccessInformation
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	type Memento as VscodeMemento,
	type SecretStorage as VscodeSecretStorage,
	Uri as VscodeUri,
	// For MessagePassingProtocol if used in ExtensionContext
	// MessagePassingProtocol as VscodeMessagePassingProtocol,
} from "../Shim/out/vscode";
import { sendNotificationToMountain } from "../cocoon-ipc";
// vscode API types
import { BaseCocoonShim, type ILogService } from "./_baseShim";

// --- Type Definitions ---

// Structure of initData (simplified, but should align with ExtHostInitData)
interface ShimInitDataForSimulatedExtSvc extends ExtHostInitData {
	// Ensure extensions part matches IExtensionHostExtensionsInitParams
	extensions: {
		allExtensions: ReadonlyArray<ISerializedExtension>;

		myExtensions: ReadonlyArray<ExtensionIdentifier>;

		// From SyncedActivationEventsReader
		activationEvents: { [extensionId: string]: string[] };
	};

	// logsLocation, remote, environment etc. are already in ExtHostInitData
}

// Type for the loaded extension module
// IExtensionModule has activate/deactivate
interface LoadedExtensionModuleShim extends IExtensionModule {}

// RPC Shape for methods called by MainThread (align with VS Code's ExtHostExtensionServiceShape)
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

	// Add other RPC methods from VscodeExtHostExtensionServiceShape as needed for simulation
	// e.g., $setRemoteEnvironment, $updateRemoteConnectionData
}

// Access to DI (setup in index.ts)
declare var cocoonInstantiationService:
	| {
			invokeFunction<T>(
				callback: (accessor: {
					get: <Svc>(
						id: any,

						isOptional?: boolean,
					) => Svc | undefined;
				}) => T,
			): T;
	  }
	| undefined;

// Implementation of IActivationEventsReader based on VS Code's SyncedActivationEventsReader
class CocoonActivationEventsReader implements VscodeActivationEventsReader {
	private readonly _map = new ExtensionIdentifierMap<string[]>();

	constructor(activationEvents: { [extensionId: string]: string[] }) {
		this.addActivationEvents(activationEvents);
	}

	public readActivationEvents(desc: IExtensionDescription): string[] {
		return this._map.get(desc.identifier) ?? desc.activationEvents ?? [];

		// Fallback to desc.activationEvents
	}

	public addActivationEvents(newEvents: {
		[extensionId: string]: string[];
	}): void {
		for (const idStr in newEvents) this._map.set(idStr, newEvents[idStr]);
	}
}

export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements CocoonExtHostExtensionServiceRpcShape
{
	public readonly _serviceBrand: undefined;

	// Use the more specific init data type
	readonly #initData: ShimInitDataForSimulatedExtSvc;

	// Should always be initialized
	#extensionRegistry: ExtensionDescriptionRegistry;

	// Based on SyncedActivationEventsReader
	readonly #activationEventsReader: CocoonActivationEventsReader;

	readonly #activationTimes = new Map<string, ExtensionActivationTimes>();

	readonly #extensionExports = new Map<string, any>();

	readonly #activationErrors = new Map<string, Error>();

	readonly #activationPromises = new Map<
		string,
		Promise<ActivatedExtension>
	>();

	readonly #extensionModulesCache = new Map<
		string,
		LoadedExtensionModuleShim
	>();

	private readonly _onDidRegisterExtensions = new VscodeEmitter<void>();

	public readonly onDidRegisterExtensions: VscodeEvent<void> =
		this._onDidRegisterExtensions.event;

	// TODO: Implement onDidChangeResponsiveMode if this shim aims for full IExtHostExtensionService compatibility.

	constructor(
		initData: ShimInitDataForSimulatedExtSvc,

		logService: ILogService | undefined,
	) {
		super("SimulatedExtHostExtensionService", undefined, logService);

		this.#initData = initData;

		this._log("Initializing (Simulated ExtHostExtensionService)...");

		this.#activationEventsReader = new CocoonActivationEventsReader(
			this.#initData.extensions.activationEvents || {},
		);

		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			this.#activationEventsReader,

			this._reviveSerializedExtensions(
				this.#initData.extensions.allExtensions || [],
			),
		);

		this._log(
			`Registry initialized with ${this.#extensionRegistry.getAllExtensionDescriptions().length} extensions.`,
		);

		this._onDidRegisterExtensions.fire();

		// TODO: Register self for RPC calls from Mountain if this shim is used in Path B.
		// if (this._rpcService) {
		//    this._rpcService.set(ExtHostContext.ExtHostExtensionService as ProxyIdentifier<CocoonExtHostExtensionServiceRpcShape>, this);

		// }
	}

	private _reviveSerializedExtensions(
		serializedExts: ReadonlyArray<ISerializedExtension>,
	): IExtensionDescription[] {
		return serializedExts
			.map((sExt): IExtensionDescription | null => {
				try {
					const identifier = ExtensionIdentifier.revive(
						sExt.identifier,
					);

					if (!identifier) return null;

					const loc = this._reviveUriDtoToInternalVSCodeUri(
						sExt.extensionLocation,
					);

					if (!loc) return null;

					return {
						...sExt,

						identifier,

						extensionLocation: loc,

						isBuiltin: !!sExt.isBuiltin,

						isUserBuiltin: !!sExt.isUserBuiltin,

						isUnderDevelopment: !!sExt.isUnderDevelopment,
					} as IExtensionDescription;
				} catch (e) {
					this._logError("Error reviving serialized extension:", e);

					return null;
				}
			})
			.filter(Boolean) as IExtensionDescription[];
	}

	public async anaylábInitialize(): Promise<void> {
		// Method name from prev. conversion: "masterInitialize"
		this._log("Simulated master initialization (eager activations)...");

		await this._triggerEagerActivations();

		this._log("Simulated master initialization finished.");
	}

	public async initialize(): Promise<void> {
		// For IExtHostExtensionService
		this._log("Simulated IExtHostExtensionService.initialize() called.");

		return this.anaylábInitialize();
	}

	public terminate(_reason: string): void {
		this._logWarn("Simulated IExtHostExtensionService.terminate (NOP).");
	}

	public async getExtension(
		extensionIdString: string,
	): Promise<IExtensionDescription | undefined> {
		// This should primarily serve extensions running within this host.
		// For all known extensions, it would need to query MainThread.
		// VS Code's ExtHostExtensionService.getExtension first checks its own registry (_myRegistry).
		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionRegistry.getExtensionDescription(id) || undefined;
	}

	public async getExtensions(): Promise<IExtensionDescription[]> {
		return this.#extensionRegistry.getAllExtensionDescriptions();
	}

	public isActivated(extensionIdString: string): boolean {
		const id = new ExtensionIdentifier(extensionIdString);

		return (
			this.#extensionExports.has(
				CanonicalExtensionIdentifier.toKey(id),
			) ||
			this.#activationErrors.has(CanonicalExtensionIdentifier.toKey(id))
		);
	}

	public getExtensionExports(extensionIdString: string): any | undefined {
		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionExports.get(
			CanonicalExtensionIdentifier.toKey(id),
		);
	}

	public async activateById(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<void> {
		const canonicalId = CanonicalExtensionIdentifier.toKey(extensionId);

		// this._log(`Simulated activateById: ${extensionId.value}, Reason: ${ActivationKind[reason.activationKind]}`);

		if (this.#activationPromises.has(canonicalId)) {
			try {
				const existingResult =
					await this.#activationPromises.get(canonicalId)!;

				if (existingResult.activationFailed)
					throw existingResult.activationFailedError;

				return;
			} catch (e: any) {
				this._logError(
					`Re-entrant activation for ${extensionId.value} failed:`,

					e,
				);

				throw e;
			}
		}

		const activationPromise = this._activateExtensionModule(
			extensionId,

			reason,
		);

		this.#activationPromises.set(canonicalId, activationPromise);

		try {
			const result = await activationPromise;

			if (result.activationFailed) {
				const err =
					result.activationFailedError ||
					new Error(
						`Activation failed (unknown) for ${extensionId.value}`,
					);

				this.#activationErrors.set(canonicalId, err);

				this._reportActivationStatusToMountain(extensionId, result);

				throw err;
			}

			// Success status reported in finally
		} catch (error: any) {
			if (!this.#activationErrors.has(canonicalId))
				this.#activationErrors.set(canonicalId, error);

			const failedActivationResult: ActivatedExtension = {
				activationFailed: true,

				activationFailedError: error,

				module: {},

				exports: undefined,

				disposable: { dispose: () => {} },

				activationTimes:
					this.#activationTimes.get(canonicalId) ||
					ExtensionActivationTimes.NONE,
			};

			this._reportActivationStatusToMountain(
				extensionId,

				failedActivationResult,
			);

			throw error;
		} finally {
			if (
				!this.#activationErrors.has(canonicalId) &&
				this.#extensionExports.has(canonicalId)
			) {
				// Should be resolved
				const status = await this.#activationPromises.get(canonicalId)!;

				this._reportActivationStatusToMountain(extensionId, status);
			}
		}
	}

	// --- RPC Methods called by MainThreadExtensionService ---
	public async $activateByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void> {
		this._log(
			`RPC $activateByEvent: '${activationEvent}' (Kind: ${ActivationKind[activationKind]})`,
		);

		this._triggerActivationsByEvent(activationEvent, activationKind).catch(
			(err) => {
				this._logError(
					`Error during background activation by event '${activationEvent}':`,

					err,
				);
			},
		);
	}

	public async $activate(
		extensionIdString: string,

		reason: ExtensionActivationReason,
	): Promise<boolean> {
		const extensionId = new ExtensionIdentifier(extensionIdString);

		this._log(
			`RPC $activate: ${extensionId.value}, Reason: ${ActivationKind[reason.activationKind]}`,
		);

		try {
			await this.activateById(extensionId, reason);

			return true;
		} catch (e: any) {
			this._logError(
				`RPC $activate for ${extensionId.value} failed: ${e.message}`,
			);

			return false;
		}
	}

	public async $deltaExtensions(delta: {
		removed: string[];

		added: ISerializedExtension[];

		addActivationEvents?: { [id: string]: string[] };
	}): Promise<void> {
		this._log(
			`RPC $deltaExtensions: Added ${delta.added.length}, Removed ${delta.removed.length}`,
		);

		if (delta.addActivationEvents)
			this.#activationEventsReader.addActivationEvents(
				delta.addActivationEvents,
			);

		const currentDescs =
			this.#extensionRegistry.getAllExtensionDescriptions();

		const removedIdsSet = new Set(delta.removed);

		const newDescs = currentDescs.filter(
			(d) => !removedIdsSet.has(d.identifier.id),

			// Use .id for string comparison
		);

		newDescs.push(...this._reviveSerializedExtensions(delta.added));

		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			_createSimpleReaderForExtSvc(),

			newDescs,
		);

		this._log(
			`Extension registry updated by delta. New count: ${newDescs.length}`,
		);

		this._onDidRegisterExtensions.fire();

		// TODO: Trigger re-evaluation of eager activations based on new/removed extensions and activation events.
	}

	// --- Internal Activation Logic (Simplified from VS Code's AbstractExtHostExtensionService) ---
	private _reviveUriDtoToInternalVSCodeUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VSCodeInternalURI | undefined {
		if (!uriDto) return undefined;

		try {
			return VSCodeInternalURI.revive(uriDto);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO for extension location:",

				uriDto,

				e,
			);

			return undefined;
		}
	}

	private async _triggerEagerActivations(): Promise<void> {
		// Verbose
		// this._log("Handling eager activations (event: '*')...");

		await this._triggerActivationsByEvent("*", ActivationKind.Normal);

		// TODO: Implement workspaceContains and onResolveRemoteAuthority eager activations if needed.
	}

	private async _triggerActivationsByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void> {
		if (!this.#extensionRegistry) {
			this._logWarn("Cannot trigger by event, registry not available.");

			return;
		}

		const candidates =
			this.#extensionRegistry.getExtensionDescriptionsForActivationEvent(
				activationEvent,
			);

		if (candidates.length > 0) {
			// this._log(`Event '${activationEvent}' triggers ${candidates.length} extensions.`);

			const reasonBase: Omit<ExtensionActivationReason, "extensionId"> = {
				startup: activationEvent === "*",

				activationEvent,

				activationKind,
			};

			const promises = candidates.map((desc) =>
				this.activateById(desc.identifier, {
					...reasonBase,

					extensionId: desc.identifier,
				}).catch((_err: any) => {
					/* Errors logged by activateById */
				}),
			);

			await Promise.allSettled(promises);
		}
	}

	private async _activateExtensionModule(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<ActivatedExtension> {
		const desc =
			// Registry should be initialized
			this.#extensionRegistry.getExtensionDescription(extensionId);

		if (!desc) {
			const error = new Error(
				`Simulated: Extension description not found for activation: ${extensionId.value}`,
			);

			this.#activationErrors.set(
				CanonicalExtensionIdentifier.toKey(extensionId),

				error,
			);

			throw error;
		}

		// this._log(`Simulated: Activating module: ${desc.identifier.value}`);

		// Proposed API Check
		const enabledProposalsSource =
			this.#initData.environment.extensionEnabledProposedApi;

		let finalEnabledProposalsForExt: string[] = [];

		if (Array.isArray(enabledProposalsSource))
			finalEnabledProposalsForExt = enabledProposalsSource;
		else if (
			enabledProposalsSource &&
			typeof enabledProposalsSource === "object"
		) {
			finalEnabledProposalsForExt = [
				...(enabledProposalsSource["*"] || []),

				...(enabledProposalsSource[desc.identifier.value] || []),
			];
		}

		if (desc.enabledApiProposals) {
			for (const proposal of desc.enabledApiProposals) {
				if (
					!vscodeCheckProposedApiEnabled(
						desc,

						finalEnabledProposalsForExt,

						proposal,
					)
				) {
					this._logWarn(
						`Simulated: Extension '${desc.identifier.value}' requests proposed API '${proposal}' which is NOT ENABLED.`,
					);
				}
			}
		}

		// Uses Node-centric logic
		const entryPoint = this._getEntryPointShim(desc);

		const activationTimesBuilder = new ExtensionActivationTimesBuilder(
			reason.startup,
		);

		if (!entryPoint) {
			this._log(
				`Simulated: Extension ${desc.identifier.value} has no entry point. Activating as EmptyExtension.`,
			);

			const times = activationTimesBuilder.build();

			this.#activationTimes.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				times,
			);

			return new EmptyExtension(times);
		}

		let loadedModule: LoadedExtensionModuleShim | undefined;

		let contextApi: CocoonExtensionContextApi | undefined;

		try {
			const modulePath = path.join(
				desc.extensionLocation.fsPath,

				entryPoint.endsWith(".js") || entryPoint.endsWith(".mjs")
					? entryPoint
					: `${entryPoint}.js`,
			);

			activationTimesBuilder.codeLoadingStart();

			// TODO: Differentiate CJS and ESM loading if this shim supports both based on manifest/file extension.
			// The real ExtHostExtensionService has _loadCommonJSModule and _loadESMModule.
			loadedModule = require(modulePath) as LoadedExtensionModuleShim;

			activationTimesBuilder.codeLoadingStop();

			// this._log(`Simulated: Module loaded for ${desc.identifier.value}.`);

			this.#extensionModulesCache.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				loadedModule,
			);

			contextApi = await this._loadExtensionContextShim(desc);

			let activationResult: any = undefined;

			if (typeof loadedModule?.activate === "function") {
				activationTimesBuilder.activateCallStart();

				activationResult = await Promise.resolve(
					loadedModule.activate.apply(globalThis, [contextApi!]),
				);

				activationTimesBuilder.activateCallStop();

				activationTimesBuilder.activateResolveStart();

				activationTimesBuilder.activateResolveStop();
			} else {
				this._logWarn(
					`Simulated: Extension ${desc.identifier.value} has entry point but no activate() function.`,
				);

				activationTimesBuilder.activateCallStop();

				activationTimesBuilder.activateResolveStop();
			}

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
			);

			return {
				activationFailed: false,

				activationFailedError: null,

				activationTimes,

				module: loadedModule || {},

				exports: activationResult,

				// VS Code's AbstractExtHostExtensionService uses DisposableStore for extension subscriptions + deactivate
				disposable: new DisposableStore(),

				// Add context.subscriptions to this store, and the deactivate call.
				// .add(toDisposable(() => {
				//    if (contextApi?.subscriptions) dispose(contextApi.subscriptions);

				//    const moduleToDeactivate = this.#extensionModulesCache.get(CanonicalExtensionIdentifier.toKey(desc.identifier));

				//    if (typeof moduleToDeactivate?.deactivate === 'function') { /* ... call deactivate ... */ }

				//    this.#extensionModulesCache.delete(CanonicalExtensionIdentifier.toKey(desc.identifier));

				// }))
			};
		} catch (error: any) {
			this._logError(
				`Simulated: FAILED to load/activate ${desc.identifier.value}:`,

				error,
			);

			return {
				activationFailed: true,

				activationFailedError: error,

				activationTimes: activationTimesBuilder.build(),

				module: loadedModule || {},

				exports: undefined,

				disposable: Disposable.None,
			};
		}
	}

	protected async _loadExtensionContextShim(
		desc: IExtensionDescription,
	): Promise<CocoonExtensionContextApi> {
		// this._log(`Simulated: Loading ExtensionContext for ${desc.identifier.value}`);

		if (!global.cocoonInstantiationService)
			throw new Error(
				"DI service (global.cocoonInstantiationService) unavailable for ExtensionContext!",
			);

		const iService = global.cocoonInstantiationService;

		const storageService = iService.invokeFunction((accessor) =>
			accessor.get<IExtHostStorage>(IExtHostStorage),
		);

		// Use VS Code's classes
		const globalState = new ExtensionGlobalMemento(desc, storageService);

		const workspaceState = new ExtensionMemento(
			desc.identifier.value,

			false,

			storageService,
		);

		const storagePaths = iService.invokeFunction((accessor) =>
			accessor.get<IExtensionStoragePaths>(IExtensionStoragePaths),
		);

		const storageUri = VscodeApiUri.from(
			storagePaths.workspaceValue(desc) || desc.extensionLocation,
		);

		const globalStorageUri = VscodeApiUri.from(
			storagePaths.globalValue(desc),
		);

		let secrets: VscodeSecretStorage;

		try {
			secrets = new ExtensionSecrets(
				desc,

				iService.invokeFunction((accessor) =>
					accessor.get<IExtHostSecretState>(IExtHostSecretState),
				),
			);
		} catch (e) {
			this._logWarn(
				`IExtHostSecretState DI failed for ${desc.identifier.id}, NOP SecretStorage. Error: ${e}`,
			);

			secrets = {
				get: () => Promise.resolve(undefined),

				store: () => Promise.resolve(),

				delete: () => Promise.resolve(),

				onDidChange: VscodeEvent.None,
			};
		}

		const initDataService = iService.invokeFunction((accessor) =>
			accessor.get<IExtHostInitDataService>(IExtHostInitDataService),
		);

		const logPathBaseUri = VSCodeInternalURI.revive(
			initDataService.value.logsLocation,

			// From ExtHostInitData
		);

		if (!logPathBaseUri)
			throw new Error(
				"Logs location URI not available for ExtensionContext.",
			);

		const logUri = VscodeApiUri.joinPath(
			VscodeApiUri.from(logPathBaseUri),

			`${desc.identifier.id}.log`,
		);

		let environmentVariableCollection: VscodeEnvironmentVariableCollection;

		const extensionApiObject = this._createVscodeExtensionApiObject(desc);

		try {
			const terminalService = iService.invokeFunction((accessor) =>
				accessor.get<IExtHostTerminalServiceShape>(
					IExtHostTerminalService,
				),
			);

			environmentVariableCollection =
				terminalService.getEnvironmentVariableCollection(
					extensionApiObject,
				);
		} catch (e) {
			this._logWarn(
				`IExtHostTerminalService DI failed for ${desc.identifier.id}, NOP EnvVarCollection. Error: ${e}`,
			);

			environmentVariableCollection = {
				persistent: true,

				description: undefined,

				replace: () => {},

				append: () => {},

				prepend: () => {},

				get: () => undefined,

				forEach: () => {},

				delete: () => {},

				clear: () => {},

				[Symbol.iterator]: function* () {},

				toArray: () => Object.freeze([]),
			};
		}

		// Language Model Access Information
		let languageModelAccessInfo: VscodeLanguageModelAccessInformation;

		try {
			const lmService = iService.invokeFunction((accessor) =>
				accessor.get<IExtHostLanguageModels>(IExtHostLanguageModels),
			);

			languageModelAccessInfo =
				lmService.createLanguageModelAccessInformation(desc);
		} catch (e) {
			this._logWarn(
				`IExtHostLanguageModels DI failed for ${desc.identifier.id}, NOP LMInfo. Error: ${e}`,
			);

			languageModelAccessInfo = {
				get accessAllowed() {
					return false;
				},

				onDidChange: VscodeEvent.None,
			};
		}

		await Promise.all([globalState.whenReady, workspaceState.whenReady]);

		const context: VscodeExtensionContext = {
			// Align with vscode.ExtensionContext
			subscriptions: [],

			globalState: globalState as VscodeMemento,

			workspaceState: workspaceState as VscodeMemento,

			secrets,

			extensionUri: VscodeApiUri.from(desc.extensionLocation),

			extensionPath: desc.extensionLocation.fsPath,

			environmentVariableCollection,

			asAbsolutePath: (relativePath) =>
				path.join(desc.extensionLocation.fsPath, relativePath),

			storageUri,

			storagePath: storageUri?.fsPath,

			globalStorageUri,

			globalStoragePath: globalStorageUri.fsPath,

			logUri,

			logPath: logUri.fsPath,

			extensionMode: desc.isUnderDevelopment
				? VscodeExtensionMode.Development
				: VscodeExtensionMode.Production,

			// This is vscode.Extension<any>
			extension: extensionApiObject,

			// Cocoon simulates Node runtime
			extensionRuntime: VscodeExtensionRuntime.Node,

			languageModelAccessInformation: languageModelAccessInfo,

			// TODO: Add other props like `globalEffect`, `workspaceEffect`, `environmentVariableScope`
			// `messagePassingProtocol` if `isProposedApiEnabled(desc, 'ipc')`
		};

		// Cast after freeze
		return Object.freeze(context) as CocoonExtensionContextApi;
	}

	protected _getEntryPointShim(
		desc: IExtensionDescription,
	): string | undefined {
		// VS Code's AbstractExtHostExtensionService._getEntryPoint delegates to platform-specific version.
		// For Node, it's typically `desc.main`.
		if (typeof desc.main === "string" && desc.main.length > 0)
			return desc.main.replace(/\.js$/, "");

		// The original shim also checked `desc.browser`. For a Node host, `main` is primary.
		// If this shim needs to be more general, it could check `browser` or `worker` based on host type.
		return undefined;
	}

	protected _createVscodeExtensionApiObject(
		desc: IExtensionDescription,
	): VscodeExtension<any> {
		// Based on VS Code's `Extension<T>` class
		const self = this;

		return Object.freeze({
			get id() {
				return desc.identifier.id;
			},

			get extensionUri() {
				return VscodeApiUri.from(desc.extensionLocation);
			},

			get extensionPath() {
				return desc.extensionLocation.fsPath;
			},

			get isActive() {
				return self.isActivated(desc.identifier.id);
			},

			get packageJSON() {
				return desc as any;

				// Should be IExtensionDescription, cast if needed
			},

			get extensionKind() {
				return desc.extensionLocation.scheme === Schemas.vscodeRemote
					? VscodeExtensionKind.Workspace
					: VscodeExtensionKind.UI;

				// TODO: This logic for extensionKind needs to be more robust, considering desc.extensionKind if present.
				// For Cocoon as a local Node host, most extensions would effectively be Workspace or UI (if it runs them).
			},

			get exports() {
				return self.getExtensionExports(desc.identifier.id);
			},

			activate: async (): Promise<any> => {
				if (!self.isActivated(desc.identifier.id)) {
					const reason: ExtensionActivationReason = {
						startup: false,

						// Self-activation
						extensionId: desc.identifier,

						activationEvent: `extension-api:${desc.identifier.id}`,

						activationKind: ActivationKind.Api,
					};

					await self.activateById(desc.identifier, reason);
				}

				return self.getExtensionExports(desc.identifier.id);
			},
		});
	}

	protected _reportActivationStatusToMountain(
		extensionId: ExtensionIdentifier,

		status: ActivatedExtension,
	): void {
		if (!status) {
			this._logError(
				`Cannot report activation status for ${extensionId.value}, status object invalid.`,
			);

			return;
		}

		const serializableTimes = {
			// Ensure plain object for JSON
			startup: status.activationTimes.startup,

			codeLoadingTime: status.activationTimes.codeLoadingTime,

			activateCallTime: status.activationTimes.activateCallTime,

			activateResolvedTime: status.activationTimes.activateResolvedTime,

			activationReason: {
				// Also ensure reason is plain
				startup: status.activationTimes.activationReason.startup,

				extensionId:
					// Send string ID
					status.activationTimes.activationReason.extensionId.value,

				activationEvent:
					status.activationTimes.activationReason.activationEvent,

				activationKind:
					status.activationTimes.activationReason.activationKind,
			},
		};

		// this._log(`Simulated: Reporting activation for ${extensionId.value}: success=${!status.activationFailed}`);

		sendNotificationToMountain("extensionActivationResult", {
			id: extensionId.value,

			success: !status.activationFailed,

			error: status.activationFailedError
				? {
						message: status.activationFailedError.message,

						stack: status.activationFailedError.stack,

						name: status.activationFailedError.name,
					}
				: null,

			activationTimes: serializableTimes,
		}).catch((e: any) =>
			this._logError(
				`Failed to report activation status for ${extensionId.value}:`,

				e,
			),
		);
	}
}

function _createSimpleReaderForExtSvc(): VscodeActivationEventsReader {
	// Return VS Code type
	// Start with empty, populated by $deltaExtensions or initData
	return new CocoonActivationEventsReader({});
}
