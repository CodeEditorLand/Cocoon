// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/90_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): a985e5f1d4862a4b71824fb5fb7a2c6d7c13fca22b635dc774ecc7359647cf06
// Extracted to File: Backup/TSFMSC/Code/extension-service-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:56.974Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE extension-service-shim.ts ---

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
	Disposable,
	DisposableStore,
	dispose, // Keep for potential use in ActivatedExtension disposable
	type IDisposable,
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
	type IEnabledApiProposals, // For proposed API checking within this shim
	type IExtensionDescription,
	type ISerializedExtension,
} from "vs/platform/extensions/common/extensions";
import {
    createDecorator, // For service identifiers
    type IInstantiationService,
    type ServicesAccessor,
} from "vs/platform/instantiation/common/instantiation";
import {
	ActivationKind,
	EmptyExtension,
	ExtensionActivationTimes,
	ExtensionActivationTimesBuilder,
	type ActivatedExtension,
	type ExtensionActivationReason,
	type IExtensionModule,
} from "vs/workbench/api/common/extHostExtensionActivator";
import {
	IExtHostInitDataService, // DI Key
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	IExtHostLanguageModels, // DI Key
} from "vs/workbench/api/common/extHostLanguageModels";
// For localized messages
import {
	IExtHostLocalizationService, // DI Key
} from "vs/workbench/api/common/extHostLocalizationService";
import {
	IExtHostSecretState, // DI Key
} from "vs/workbench/api/common/extHostSecretState";
// --- Service Interface Imports (for DI access during ExtensionContext creation) ---
// These are the interfaces for services that ExtHostExtensionService would get from DI.
import {
	IExtHostStorage, // DI Key
} from "vs/workbench/api/common/extHostStorage";
import {
	IExtensionStoragePaths, // DI Key
} from "vs/workbench/api/common/extHostStoragePaths";
// IExtHostConfiguration is used by configProvider, which is used by real ExtHostExtensionService
// import { IExtHostConfiguration, IExtHostConfigurationShape } from "vs/workbench/api/common/extHostConfiguration";

import {
	IExtHostTerminalService, // DI Key for terminal service
	type IExtHostTerminalServiceShape, // Actual service shape for context
}from "vs/workbench/api/common/extHostTerminalService";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader as VscodeActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry";
import { checkProposedApiEnabled as vscodeCheckProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";
import { ExtensionGlobalMemento, ExtensionMemento } from "vs/workbench/api/common/extHostMemento"; // For Memento implementations
import { ExtensionSecrets } from "vs/workbench/api/common/extHostSecrets"; // For SecretStorage implementation


import { sendNotificationToMountain } from "../cocoon-ipc"; // For reporting activation status
import {
	ExtensionKind as VscodeExtensionKind,
	ExtensionMode as VscodeExtensionMode,
	ExtensionRuntime as VscodeExtensionRuntime,
	Uri as VscodeUri,
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type Extension as VscodeExtension, // The public API type for vscode.Extension<T>
	type ExtensionContext as VscodeExtensionContext,
	// For ExtensionContext.languageModelAccessInformation
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	type Memento as VscodeMemento,
	type SecretStorage as VscodeSecretStorage,
	// For MessagePassingProtocol if used in ExtensionContext
	// MessagePassingProtocol as VscodeMessagePassingProtocol,
} from "../Shim/out/vscode"; // vscode API types
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


// Minimal API required by ExtensionContext from an extension object
// This aligns with vscode.Extension<T> public fields.
interface ExtensionContextExtensionApi {
    readonly id: string;
    readonly extensionUri: VscodeUri; // Added from vscode.d.ts
    readonly extensionPath: string;
    readonly isActive: boolean; // Added
    readonly packageJSON: IExtensionDescription; // Should be the parsed package.json
    readonly extensionKind: VscodeExtensionKind;
    readonly exports: any; // Added
    activate(): Promise<any>; // Added
    // readonly contributes?: Contribution[]; // More complex
}

// For ExtensionContext, as actual vscode.Extension type is complex
// Ensure this matches VscodeExtensionContext but allows for our specific ExtensionApi type
type CocoonExtensionContextApi = Omit<VscodeExtensionContext, "extension"> & {
    extension: ExtensionContextExtensionApi;
};


class CocoonActivationEventsReader implements VscodeActivationEventsReader {
	private readonly _map = new ExtensionIdentifierMap<string[]>();
	constructor(activationEvents: { [extensionId: string]: string[] }) {
		this.addActivationEvents(activationEvents);
	}
	public readActivationEvents(desc: IExtensionDescription): string[] {
		return this._map.get(desc.identifier) ?? desc.activationEvents ?? [];
	}
	public addActivationEvents(newEvents: { [extensionId: string]: string[] }): void {
		for (const idStr in newEvents) this._map.set(new ExtensionIdentifier(idStr), newEvents[idStr]);
	}
}

export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements CocoonExtHostExtensionServiceRpcShape // Assuming this is the RPC shape it implements for incoming calls
{
	public readonly _serviceBrand: undefined;
	readonly #initData: ShimInitDataForSimulatedExtSvc;
	#extensionRegistry: ExtensionDescriptionRegistry;
	readonly #activationEventsReader: CocoonActivationEventsReader;
	readonly #activationTimes = new Map<string, ExtensionActivationTimes>();
	readonly #extensionExports = new Map<string, any>();
	readonly #activationErrors = new Map<string, Error>();
	readonly #activationPromises = new Map<string, Promise<ActivatedExtension>>();
	readonly #extensionModulesCache = new Map<string, LoadedExtensionModuleShim>();
	private readonly _onDidRegisterExtensions = new VscodeEmitter<void>();
	public readonly onDidRegisterExtensions: VscodeEvent<void> = this._onDidRegisterExtensions.event;

	// For DI
	private readonly _instantiationService: IInstantiationService;


	constructor(
		initData: ShimInitDataForSimulatedExtSvc,
		logService: ILogService | undefined,
        instantiationService: IInstantiationService, // Injected DI service
	) {
		super("SimulatedExtHostExtensionService", undefined /* rpcService not used for this shim's primary role */, logService);
		this.#initData = initData;
        this._instantiationService = instantiationService; // Store DI service

		this._log("Initializing (Simulated ExtHostExtensionService)...");
		this.#activationEventsReader = new CocoonActivationEventsReader(this.#initData.extensions.activationEvents || {});
		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			this.#activationEventsReader,
			this._reviveSerializedExtensions(this.#initData.extensions.allExtensions || []),
		);
		this._log(`Registry initialized with ${this.#extensionRegistry.getAllExtensionDescriptions().length} extensions.`);
		this._onDidRegisterExtensions.fire();
	}

	private _reviveSerializedExtensions(serializedExts: ReadonlyArray<ISerializedExtension>): IExtensionDescription[] {
		return serializedExts
			.map((sExt): IExtensionDescription | null => {
				try {
					const identifier = ExtensionIdentifier.revive(sExt.identifier);
					if (!identifier) return null;
					const loc = this._reviveUriDtoToInternalVSCodeUri(sExt.extensionLocation);
					if (!loc) return null;
					return {
						...sExt, // Spread all properties from ISerializedExtension
						identifier,
						extensionLocation: loc,
						// Ensure boolean properties are correctly typed
						isBuiltin: !!sExt.isBuiltin,
						isUserBuiltin: !!sExt.isUserBuiltin,
						isUnderDevelopment: !!sExt.isUnderDevelopment,
                        // default is false for these
                        enabledApiProposals: sExt.enabledApiProposals || undefined,
                        browser: sExt.browser || undefined,
                        desktop: sExt.desktop || undefined, // Assuming desktop might be relevant for Node host
                        main: sExt.main || undefined,
                        // ... other IExtensionDescription fields
					} as IExtensionDescription;
				} catch (e) {
					this._logError("Error reviving serialized extension:", e);
					return null;
				}
			})
			.filter(Boolean) as IExtensionDescription[];
	}

	public async anaylábInitialize(): Promise<void> { // Original name "masterInitialize"
		this._log("Simulated master initialization (eager activations)...");
		await this._triggerEagerActivations();
		this._log("Simulated master initialization finished.");
	}
	public async initialize(): Promise<void> { return this.anaylábInitialize(); }
	public terminate(_reason: string): void { this._logWarn("Simulated IExtHostExtensionService.terminate (NOP)."); }

	public async getExtension(extensionIdString: string): Promise<IExtensionDescription | undefined> {
		const id = new ExtensionIdentifier(extensionIdString);
		return this.#extensionRegistry.getExtensionDescription(id) || undefined;
	}
	public async getExtensions(): Promise<IExtensionDescription[]> { return this.#extensionRegistry.getAllExtensionDescriptions(); }
	public isActivated(extensionIdString: string): boolean {
		const id = new ExtensionIdentifier(extensionIdString);
		const canonicalId = CanonicalExtensionIdentifier.toKey(id);
		return this.#extensionExports.has(canonicalId) || this.#activationErrors.has(canonicalId);
	}
	public getExtensionExports(extensionIdString: string): any | undefined {
		const id = new ExtensionIdentifier(extensionIdString);
		return this.#extensionExports.get(CanonicalExtensionIdentifier.toKey(id));
	}

	public async activateById(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		const canonicalId = CanonicalExtensionIdentifier.toKey(extensionId);
		if (this.#activationPromises.has(canonicalId)) {
			try {
				const existingResult = await this.#activationPromises.get(canonicalId)!;
				if (existingResult.activationFailed) throw existingResult.activationFailedError;
				return;
			} catch (e: any) {
				this._logError(`Re-entrant activation for ${extensionId.value} failed:`, e);
				throw e;
			}
		}
		const activationPromise = this._activateExtensionModule(extensionId, reason);
		this.#activationPromises.set(canonicalId, activationPromise);
		try {
			const result = await activationPromise;
			if (result.activationFailed) {
				const err = result.activationFailedError || new Error(`Activation failed (unknown) for ${extensionId.value}`);
				this.#activationErrors.set(canonicalId, err); // Set error if activation failed
				this._reportActivationStatusToMountain(extensionId, result);
				throw err;
			}
		} catch (error: any) {
            // If error was thrown from _activateExtensionModule and not caught there as activationFailed,
            // ensure it's stored in #activationErrors.
			if (!this.#activationErrors.has(canonicalId)) {
                this.#activationErrors.set(canonicalId, error instanceof Error ? error : new Error(String(error)));
            }
			const failedActivationResult: ActivatedExtension = {
				activationFailed: true, activationFailedError: this.#activationErrors.get(canonicalId)!,
                module: {}, exports: undefined,
				disposable: Disposable.None,
				activationTimes: this.#activationTimes.get(canonicalId) || ExtensionActivationTimes.NONE,
			};
			this._reportActivationStatusToMountain(extensionId, failedActivationResult);
			throw error; // Rethrow the original error or the one from #activationErrors
		} finally {
            // Report success if no error was stored for this activation and exports are present
			if (!this.#activationErrors.has(canonicalId) && this.#extensionExports.has(canonicalId)) {
				const status = await this.#activationPromises.get(canonicalId)!; // Should be resolved
				this._reportActivationStatusToMountain(extensionId, status);
			}
		}
	}

	public async $activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		this._log(`RPC $activateByEvent: '${activationEvent}' (Kind: ${ActivationKind[activationKind]})`);
		this._triggerActivationsByEvent(activationEvent, activationKind).catch((err) => {
			this._logError(`Error during background activation by event '${activationEvent}':`, err);
		});
	}
	public async $activate(extensionIdString: string, reason: ExtensionActivationReason): Promise<boolean> {
		const extensionId = new ExtensionIdentifier(extensionIdString);
		this._log(`RPC $activate: ${extensionId.value}, Reason: ${ActivationKind[reason.activationKind]}`);
		try {
			await this.activateById(extensionId, reason);
			return true;
		} catch (e: any) {
			this._logError(`RPC $activate for ${extensionId.value} failed: ${e.message}`);
			return false;
		}
	}
	public async $deltaExtensions(delta: { removed: string[]; added: ISerializedExtension[]; addActivationEvents?: { [id: string]: string[] } }): Promise<void> {
		this._log(`RPC $deltaExtensions: Added ${delta.added.length}, Removed ${delta.removed.length}`);
		if (delta.addActivationEvents) this.#activationEventsReader.addActivationEvents(delta.addActivationEvents);
		const currentDescs = this.#extensionRegistry.getAllExtensionDescriptions();
        const removedIdsSet = new Set(delta.removed.map(idStr => CanonicalExtensionIdentifier.toKey(new ExtensionIdentifier(idStr))));
		const newDescs = currentDescs.filter((d) => !removedIdsSet.has(CanonicalExtensionIdentifier.toKey(d.identifier)));
		newDescs.push(...this._reviveSerializedExtensions(delta.added));
		this.#extensionRegistry = new ExtensionDescriptionRegistry(this.#activationEventsReader, newDescs);
		this._log(`Extension registry updated by delta. New count: ${newDescs.length}`);
		this._onDidRegisterExtensions.fire();
	}

	private _reviveUriDtoToInternalVSCodeUri(uriDto: VSCodeInternalUriComponents | undefined): VSCodeInternalURI | undefined {
		if (!uriDto) return undefined;
		try { return VSCodeInternalURI.revive(uriDto); }
		catch (e: any) { this._logError("Failed to revive URI DTO for extension location:", uriDto, e); return undefined; }
	}

	private async _triggerEagerActivations(): Promise<void> {
		await this._triggerActivationsByEvent("*", ActivationKind.Normal);
	}
	private async _triggerActivationsByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		if (!this.#extensionRegistry) { this._logWarn("Cannot trigger by event, registry not available."); return; }
		const candidates = this.#extensionRegistry.getExtensionDescriptionsForActivationEvent(activationEvent);
		if (candidates.length > 0) {
			const reasonBase: Omit<ExtensionActivationReason, "extensionId"> = { startup: activationEvent === "*", activationEvent, activationKind };
			const promises = candidates.map((desc) => this.activateById(desc.identifier, { ...reasonBase, extensionId: desc.identifier }).catch((_err: any) => { /* Errors logged by activateById */ }));
			await Promise.allSettled(promises);
		}
	}

	private async _activateExtensionModule(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<ActivatedExtension> {
		const desc = this.#extensionRegistry.getExtensionDescription(extensionId);
		if (!desc) {
			const error = new Error(`Simulated: Extension description not found for activation: ${extensionId.value}`);
			this.#activationErrors.set(CanonicalExtensionIdentifier.toKey(extensionId), error);
			throw error;
		}

        // Proposed API Check (Simplified)
		const enabledProposalsSource = this.#initData.environment.extensionEnabledProposedApi;
		let finalEnabledProposalsForExt: string[] = [];
		if (Array.isArray(enabledProposalsSource)) finalEnabledProposalsForExt = enabledProposalsSource;
		else if (enabledProposalsSource && typeof enabledProposalsSource === 'object') {
			finalEnabledProposalsForExt = [
				...(enabledProposalsSource["*"] || []),
				...(enabledProposalsSource[desc.identifier.value] || [])
			];
		}
		if (desc.enabledApiProposals) {
			for (const proposal of desc.enabledApiProposals) {
				if (!vscodeCheckProposedApiEnabled(desc, finalEnabledProposalsForExt, proposal)) {
					this._logWarn(`Simulated: Extension '${desc.identifier.value}' requests proposed API '${proposal}' which is NOT ENABLED.`);
				}
			}
		}


		const entryPoint = this._getEntryPointShim(desc);
		const activationTimesBuilder = new ExtensionActivationTimesBuilder(reason.startup);
		if (!entryPoint) {
			this._log(`Simulated: Extension ${desc.identifier.value} has no entry point. Activating as EmptyExtension.`);
			const times = activationTimesBuilder.build();
			this.#activationTimes.set(CanonicalExtensionIdentifier.toKey(desc.identifier), times);
			return new EmptyExtension(times);
		}
		let loadedModule: LoadedExtensionModuleShim | undefined;
		let contextApi: CocoonExtensionContextApi | undefined;
		try {
			const modulePath = path.join(desc.extensionLocation.fsPath, entryPoint.endsWith(".js") || entryPoint.endsWith(".mjs") ? entryPoint : `${entryPoint}.js`);
			activationTimesBuilder.codeLoadingStart();
			loadedModule = require(modulePath) as LoadedExtensionModuleShim; // Assuming CJS for shim simplicity
			activationTimesBuilder.codeLoadingStop();
			this.#extensionModulesCache.set(CanonicalExtensionIdentifier.toKey(desc.identifier), loadedModule);
			contextApi = await this._loadExtensionContextShim(desc);
			let activationResult: any = undefined;
			if (typeof loadedModule?.activate === "function") {
				activationTimesBuilder.activateCallStart();
				activationResult = await Promise.resolve(loadedModule.activate.apply(globalThis, [contextApi!]));
				activationTimesBuilder.activateCallStop();
			} else {
				this._logWarn(`Simulated: Extension ${desc.identifier.value} has entry point but no activate() function.`);
				activationTimesBuilder.activateCallStop(); // Still mark as called
			}
			activationTimesBuilder.activateResolveStart();
			activationTimesBuilder.activateResolveStop();

			this.#extensionExports.set(CanonicalExtensionIdentifier.toKey(desc.identifier), activationResult);
			const activationTimes = activationTimesBuilder.build();
			this.#activationTimes.set(CanonicalExtensionIdentifier.toKey(desc.identifier), activationTimes);
			this.#activationErrors.delete(CanonicalExtensionIdentifier.toKey(desc.identifier));
			return {
				activationFailed: false, activationFailedError: null, activationTimes,
				module: loadedModule || {}, exports: activationResult,
				disposable: new DisposableStore(), // Use VS Code's DisposableStore
			};
		} catch (error: any) {
			this._logError(`Simulated: FAILED to load/activate ${desc.identifier.value}:`, error);
			return {
				activationFailed: true, activationFailedError: error,
				activationTimes: activationTimesBuilder.build(),
				module: loadedModule || {}, exports: undefined,
				disposable: Disposable.None, // Use VS Code's Disposable.None
			};
		}
	}

	protected async _loadExtensionContextShim(desc: IExtensionDescription): Promise<CocoonExtensionContextApi> {
		const iService = this._instantiationService;
		if (!iService) throw new Error("InstantiationService unavailable for ExtensionContext!");

		const storageService = iService.invokeFunction((accessor) => accessor.get<IExtHostStorage>(IExtHostStorage));
		const globalState = new ExtensionGlobalMemento(desc, storageService);
		const workspaceState = new ExtensionMemento(desc.identifier.value, false, storageService);
		const storagePaths = iService.invokeFunction((accessor) => accessor.get<IExtensionStoragePaths>(IExtensionStoragePaths));
		const storageUri = VscodeUri.from(storagePaths.workspaceValue(desc) || desc.extensionLocation);
		const globalStorageUri = VscodeUri.from(storagePaths.globalValue(desc));

		let secrets: VscodeSecretStorage;
		try {
			secrets = new ExtensionSecrets(desc, iService.invokeFunction((accessor) => accessor.get<IExtHostSecretState>(IExtHostSecretState)));
		} catch (e) {
			this._logWarn(`IExtHostSecretState DI failed for ${desc.identifier.id}, NOP SecretStorage. Error: ${e}`);
			secrets = { get: () => Promise.resolve(undefined), store: () => Promise.resolve(), delete: () => Promise.resolve(), onDidChange: VscodeEvent.None };
		}

		const initDataService = iService.invokeFunction((accessor) => accessor.get<IExtHostInitDataService>(IExtHostInitDataService));
		const logPathBaseUri = VSCodeInternalURI.revive(initDataService.value.logsLocation);
		if (!logPathBaseUri) throw new Error("Logs location URI not available for ExtensionContext.");
		const logUri = VscodeUri.joinPath(VscodeUri.from(logPathBaseUri), `${desc.identifier.id}.log`);

		let environmentVariableCollection: VscodeEnvironmentVariableCollection;
		const extensionApiObject = this._createVscodeExtensionApiObject(desc);
		try {
			const terminalService = iService.invokeFunction((accessor) => accessor.get<IExtHostTerminalServiceShape>(IExtHostTerminalService));
			environmentVariableCollection = terminalService.getEnvironmentVariableCollection(extensionApiObject as VscodeExtension<any>);
		} catch (e) {
			this._logWarn(`IExtHostTerminalService DI failed for ${desc.identifier.id}, NOP EnvVarCollection. Error: ${e}`);
			environmentVariableCollection = { persistent: true, description: undefined, replace: () => {}, append: () => {}, prepend: () => {}, get: () => undefined, forEach: () => {}, delete: () => {}, clear: () => {}, [Symbol.iterator]: function* () {}, toArray: () => Object.freeze([]) };
		}

		let languageModelAccessInfo: VscodeLanguageModelAccessInformation;
		try {
			const lmService = iService.invokeFunction((accessor) => accessor.get<IExtHostLanguageModels>(IExtHostLanguageModels));
			languageModelAccessInfo = lmService.createLanguageModelAccessInformation(desc);
		} catch (e) {
			this._logWarn(`IExtHostLanguageModels DI failed for ${desc.identifier.id}, NOP LMInfo. Error: ${e}`);
			languageModelAccessInfo = { get accessAllowed() { return false; }, onDidChange: VscodeEvent.None };
		}

		await Promise.all([globalState.whenReady, workspaceState.whenReady]);

		const context: VscodeExtensionContext = {
			subscriptions: [],
			globalState: globalState as VscodeMemento,
			workspaceState: workspaceState as VscodeMemento,
			secrets,
			extensionUri: VscodeUri.from(desc.extensionLocation),
			extensionPath: desc.extensionLocation.fsPath,
			environmentVariableCollection,
			asAbsolutePath: (relativePath) => path.join(desc.extensionLocation.fsPath, relativePath),
			storageUri,
			storagePath: storageUri?.scheme === Schemas.file ? storageUri.fsPath : null, // fsPath only for file URIs
			globalStorageUri,
			globalStoragePath: globalStorageUri.fsPath, // Assuming global is always file URI
			logUri,
			logPath: logUri.fsPath, // Assuming log is always file URI
			extensionMode: desc.isUnderDevelopment ? VscodeExtensionMode.Development : VscodeExtensionMode.Production,
			extension: extensionApiObject as VscodeExtension<any>, // Cast our minimal object
			extensionRuntime: VscodeExtensionRuntime.Node,
			languageModelAccessInformation: languageModelAccessInfo,
		};
		return Object.freeze(context) as CocoonExtensionContextApi;
	}

	protected _getEntryPointShim(desc: IExtensionDescription): string | undefined {
		if (typeof desc.main === "string" && desc.main.length > 0) return desc.main.replace(/\.js$/, "");
		return undefined;
	}

	protected _createVscodeExtensionApiObject(desc: IExtensionDescription): ExtensionContextExtensionApi {
		const self = this;
		const apiObject: ExtensionContextExtensionApi = {
			get id() { return desc.identifier.id; },
			get extensionUri() { return VscodeUri.from(desc.extensionLocation); },
			get extensionPath() { return desc.extensionLocation.fsPath; },
			get isActive() { return self.isActivated(desc.identifier.id); },
			get packageJSON() { return desc; },
			get extensionKind() {
                // More accurately use desc.extensionKind if available
                if (desc.extensionKind && desc.extensionKind.length > 0) {
                    if (desc.extensionKind.some(kind => kind === 'ui' || kind === 'web')) return VscodeExtensionKind.UI;
                    if (desc.extensionKind.some(kind => kind === 'workspace')) return VscodeExtensionKind.Workspace;
                }
                // Fallback based on location
                return desc.extensionLocation.scheme === Schemas.vscodeRemote ? VscodeExtensionKind.Workspace : VscodeExtensionKind.Workspace;
            },
			get exports() { return self.getExtensionExports(desc.identifier.id); },
			activate: async (): Promise<any> => {
				if (!self.isActivated(desc.identifier.id)) {
					const reason: ExtensionActivationReason = {
						startup: false, extensionId: desc.identifier,
						activationEvent: `extension-api:${desc.identifier.id}`,
						activationKind: ActivationKind.Api,
					};
					await self.activateById(desc.identifier, reason);
				}
				return self.getExtensionExports(desc.identifier.id);
			},
		};
		return Object.freeze(apiObject);
	}

	protected _reportActivationStatusToMountain(extensionId: ExtensionIdentifier, status: ActivatedExtension): void {
		if (!status) { this._logError(`Cannot report activation status for ${extensionId.value}, status object invalid.`); return; }
		const serializableTimes = {
			startup: status.activationTimes.startup,
			codeLoadingTime: status.activationTimes.codeLoadingTime,
			activateCallTime: status.activationTimes.activateCallTime,
			activateResolvedTime: status.activationTimes.activateResolvedTime,
			activationReason: {
				startup: status.activationTimes.activationReason.startup,
				extensionId: status.activationTimes.activationReason.extensionId.value,
				activationEvent: status.activationTimes.activationReason.activationEvent,
				activationKind: status.activationTimes.activationReason.activationKind,
			},
		};
		sendNotificationToMountain("extensionActivationResult", {
			id: extensionId.value,
			success: !status.activationFailed,
			error: status.activationFailedError ? { message: status.activationFailedError.message, stack: status.activationFailedError.stack, name: status.activationFailedError.name } : null,
			activationTimes: serializableTimes,
		}).catch((e: any) => this._logError(`Failed to report activation status for ${extensionId.value}:`, e));
	}
}
--- END OF FILE extension-service-shim.ts ---