/*
 * File: Cocoon/Source/Shim/ExtensionService.ts
 * Responsibility: Simulates the VS Code extension host environment within the Cocoon sidecar, enabling Node.js extensions to run and interact with the Mountain backend via Vine IPC while providing activation, context management, and dependency injection for extension services.
 * Modified: 2025-06-07 05:37:39 UTC
 * Dependency: ../cocoon-ipc, path, vs/base/common/network, vs/platform/instantiation/common/instantiation, vs/workbench/api/common/extHostLanguageModels, vs/workbench/api/common/extHostSecretState, vs/workbench/api/common/extHostSecrets, vs/workbench/api/common/extHostStorage, vs/workbench/api/common/extHostStoragePaths, vs/workbench/api/common/extHostTelemetry
 * Export: ShimExtHostExtensionService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Simulated IExtHostExtensionService
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # WARNING: SIMULATED / REFERENCE IMPLEMENTATION                                          #
 * ##########################################################################################
 * This file provides a *simulated* implementation of the VS Code `IExtHostExtensionService`.
 * It is NOT intended for use in the standard Cocoon "Path A" (which uses the real
 * `ExtHostExtensionService`). Its primary purposes are:
 *
 *  1. To support alternative Cocoon execution paths where VS Code's original
 *     `ExtHostExtensionService` might not be run.
 *  2. To serve as a detailed, self-contained reference for understanding the structure and
 *     dependencies of `vscode.ExtensionContext`, aiding `Cocoon/index.ts` DI setup.
 *
 * This shim simulates extension registration, CJS loading, activation, and the
 * meticulous creation of `ExtensionContext` objects, using an injected
 * `IInstantiationService` to access other (potentially shimmed) ExtHost services.
 * Advanced features are simplified or stubbed.
 *
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
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
import { Schemas } from "vs/base/common/network";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	CanonicalExtensionIdentifier,
	ExtensionIdentifier,
	type IExtensionDescription,
	type ISerializedExtension,
} from "vs/platform/extensions/common/extensions";
import { type IInstantiationService } from "vs/platform/instantiation/common/instantiation";
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
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
import {
	ExtensionGlobalMemento,
	ExtensionMemento,
} from "vs/workbench/api/common/extHostMemento";
import { ExtensionSecrets } from "vs/workbench/api/common/extHostSecrets";
import { IExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
import { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry"; // For createTelemetryLogger
import {
	IExtHostTerminalService,
	type IExtHostTerminalServiceShape,
} from "vs/workbench/api/common/extHostTerminalService";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader as VscodeActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry";

import { sendNotificationToMountain } from "../cocoon-ipc";
import {
	ICocoonExtHostProposedApis,
	type IExtHostProposedApisShape,
} from "../index";
// DI Key
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
	type TelemetryLogger as VscodeTelemetryLogger, // For createTelemetryLogger return type
} from "../Shim/out/vscode";
// API types
import {
	BaseCocoonShim,
	type ILogServiceForShim as ILogService,
} from "./_baseShim";

interface ShimInitDataForSimulatedExtSvc extends ExtHostInitData {
	extensions: {
		allExtensions: ReadonlyArray<ISerializedExtension>;
		myExtensions: ReadonlyArray<ExtensionIdentifier>;
		activationEvents: { [extensionId: string]: string[] };
	};
}
interface LoadedExtensionModuleShim extends IExtensionModule {}
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
}
interface ExtensionContextExtensionApi {
	readonly id: string;
	readonly extensionUri: VscodeUri;
	readonly extensionPath: string;
	readonly isActive: boolean;
	readonly packageJSON: IExtensionDescription;
	readonly extensionKind: VscodeExtensionKind;
	readonly exports: any;
	activate(): Promise<any>;
}
type CocoonExtensionContextApi = Omit<
	VscodeExtensionContext,
	"extension" | "createTelemetryLogger"
> & {
	// Omit and re-add with correct type
	extension: ExtensionContextExtensionApi;
	createTelemetryLogger(
		sender?: vscode.TelemetrySender,
	): VscodeTelemetryLogger;
};

class CocoonActivationEventsReader implements VscodeActivationEventsReader {
	private readonly _map = new ExtensionIdentifierMap<string[]>();
	constructor(activationEvents: { [extensionId: string]: string[] }) {
		this.addActivationEvents(activationEvents);
	}
	public readActivationEvents(desc: IExtensionDescription): string[] {
		return this._map.get(desc.identifier) ?? desc.activationEvents ?? [];
	}
	public addActivationEvents(newEvents: {
		[extensionId: string]: string[];
	}): void {
		for (const idStr in newEvents) {
			if (Object.prototype.hasOwnProperty.call(newEvents, idStr)) {
				this._map.set(new ExtensionIdentifier(idStr), newEvents[idStr]);
			}
		}
	}
}

/** Simulated implementation of `IExtHostExtensionService`. See file header. */
export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements CocoonExtHostExtensionServiceRpcShape
{
	public readonly _serviceBrand: undefined;
	readonly #initData: ShimInitDataForSimulatedExtSvc;
	#extensionRegistry: ExtensionDescriptionRegistry;
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
	private readonly _onDidRegisterExtensions = this._instanceDisposables.add(
		new VscodeEmitter<void>(),
	);
	public readonly onDidRegisterExtensions: VscodeEvent<void> =
		this._onDidRegisterExtensions.event;
	private readonly _instantiationService: IInstantiationService;
	private readonly _proposedApiService: IExtHostProposedApisShape; // Use DI'd service

	constructor(
		initData: ShimInitDataForSimulatedExtSvc,
		logService: ILogService | undefined,
		instantiationService: IInstantiationService,
	) {
		super(
			"SimulatedExtHostExtensionService",
			undefined,
			logService as ILogServiceForShim | undefined,
		);
		this.#initData = initData;
		this._instantiationService = instantiationService;
		this._proposedApiService = this._instantiationService.get(
			ICocoonExtHostProposedApis,
		); // Get via DI

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
		this._onDidRegisterExtensions.fire();
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
					if (!identifier) {
						this._logWarn(
							"Failed to revive extension identifier:",
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
							`Failed to revive extensionLocation for '${identifier.value}'. Skipping.`,
							"DTO:",
							sExt.extensionLocation,
						);
						return null;
					}
					return {
						...sExt,
						identifier,
						extensionLocation,
						isBuiltin: !!sExt.isBuiltin,
						isUserBuiltin: !!sExt.isUserBuiltin,
						isUnderDevelopment: !!sExt.isUnderDevelopment,
						enabledApiProposals:
							sExt.enabledApiProposals || undefined,
						browser: sExt.browser || undefined,
						desktop: sExt.desktop || undefined,
						main: sExt.main || undefined,
					} as IExtensionDescription;
				} catch (e: any) {
					this._logError(
						"Error reviving serialized extension. Skipping.",
						"Data:",
						sExt,
						"Error:",
						e,
					);
					return null;
				}
			})
			.filter((desc): desc is IExtensionDescription => desc !== null);
	}

	public async anaylábInitialize(): Promise<void> {
		this._logInfo(
			"Simulated master initialization: Triggering eager activations ('*') now...",
		);
		await this._triggerActivationsByEvent("*", ActivationKind.Normal);
		this._logInfo(
			"Simulated master initialization and eager activations finished.",
		);
	}
	public async initialize(): Promise<void> {
		return this.anaylábInitialize();
	}
	public terminate(_reason: string): void {
		this._logWarn(`Simulated terminate('${_reason}') called. NOP.`);
	}
	public async getExtension(
		extensionIdString: string,
	): Promise<IExtensionDescription | undefined> {
		return (
			this.#extensionRegistry.getExtensionDescription(
				new ExtensionIdentifier(extensionIdString),
			) || undefined
		);
	}
	public async getExtensions(): Promise<IExtensionDescription[]> {
		return this.#extensionRegistry.getAllExtensionDescriptions();
	}
	public isActivated(extensionIdString: string): boolean {
		const canonicalId = CanonicalExtensionIdentifier.toKey(
			new ExtensionIdentifier(extensionIdString),
		);
		return (
			this.#extensionExports.has(canonicalId) ||
			this.#activationErrors.has(canonicalId)
		);
	}
	public getExtensionExports(extensionIdString: string): any | undefined {
		return this.#extensionExports.get(
			CanonicalExtensionIdentifier.toKey(
				new ExtensionIdentifier(extensionIdString),
			),
		);
	}

	public async activateById(
		extensionId: ExtensionIdentifier,
		reason: ExtensionActivationReason,
	): Promise<void> {
		const canonicalId = CanonicalExtensionIdentifier.toKey(extensionId);
		if (this.#activationPromises.has(canonicalId)) {
			this._logDebug(
				`Activation for '${extensionId.value}' already in progress/completed. Awaiting.`,
			);
			try {
				const existingResult =
					await this.#activationPromises.get(canonicalId)!;
				if (existingResult.activationFailed)
					throw existingResult.activationFailedError;
				return;
			} catch (e: any) {
				this._logError(
					`Re-entrant await for activation of '${extensionId.value}' failed:`,
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
				const error =
					result.activationFailedError ||
					new Error(
						`Simulated activation failed for ${extensionId.value}`,
					);
				this.#activationErrors.set(canonicalId, error);
				this._reportActivationStatusToMountain(extensionId, result);
				throw error;
			}
		} catch (error: any) {
			if (!this.#activationErrors.has(canonicalId)) {
				this.#activationErrors.set(
					canonicalId,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
			this._reportActivationStatusToMountain(extensionId, {
				activationFailed: true,
				activationFailedError: this.#activationErrors.get(canonicalId)!,
				module: {},
				exports: undefined,
				disposable: Disposable.None,
				activationTimes:
					this.#activationTimes.get(canonicalId) ||
					new ExtensionActivationTimesBuilder(reason.startup).build(),
			});
			throw error;
		} finally {
			if (
				!this.#activationErrors.has(canonicalId) &&
				this.#extensionExports.has(canonicalId)
			) {
				const status = await this.#activationPromises.get(canonicalId)!;
				this._reportActivationStatusToMountain(extensionId, status);
			}
		}
	}
	public async $activateByEvent(
		activationEvent: string,
		activationKind: ActivationKind,
	): Promise<void> {
		this._logInfo(
			`RPC $activateByEvent: Event='${activationEvent}', Kind=${ActivationKind[activationKind]}`,
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
		this._logInfo(
			`RPC $activate: Ext='${extensionId.value}', Reason: Kind=${ActivationKind[reason.activationKind]}, Event='${reason.activationEvent}'`,
		);
		try {
			await this.activateById(extensionId, reason);
			return true;
		} catch (e: any) {
			this._logError(
				`RPC $activate for '${extensionId.value}' failed: ${e.message}`,
			);
			return false;
		}
	}
	public async $deltaExtensions(delta: {
		removed: string[];
		added: ISerializedExtension[];
		addActivationEvents?: { [id: string]: string[] };
	}): Promise<void> {
		this._logInfo(
			`RPC $deltaExtensions: Added: ${delta.added.length}, Removed: ${delta.removed.length}, ActivationEvents: ${delta.addActivationEvents ? Object.keys(delta.addActivationEvents).length : 0}`,
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
			`Simulated Extension registry updated by delta. New total: ${newDescs.length}`,
		);
		this._onDidRegisterExtensions.fire();
	}

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

	private async _triggerActivationsByEvent(
		activationEvent: string,
		activationKind: ActivationKind,
	): Promise<void> {
		if (!this.#extensionRegistry) {
			this._logWarn(
				"Cannot trigger activations: ExtensionRegistry unavailable.",
			);
			return;
		}
		const candidates =
			this.#extensionRegistry.getExtensionDescriptionsForActivationEvent(
				activationEvent,
			);
		if (candidates.length > 0) {
			this._logDebug(
				`Found ${candidates.length} candidate(s) for event '${activationEvent}'.`,
			);
			const reasonBase: Omit<ExtensionActivationReason, "extensionId"> = {
				startup: activationEvent === "*",
				activationEvent,
				activationKind,
			};
			await Promise.allSettled(
				candidates.map((desc) =>
					this.activateById(desc.identifier, {
						...reasonBase,
						extensionId: desc.identifier,
					}).catch((_err) => {
						/* errors logged by activateById */
					}),
				),
			);
		} else {
			this._logDebug(`No extensions for event '${activationEvent}'.`);
		}
	}

	private async _activateExtensionModule(
		extensionId: ExtensionIdentifier,
		reason: ExtensionActivationReason,
	): Promise<ActivatedExtension> {
		const desc =
			this.#extensionRegistry.getExtensionDescription(extensionId);
		if (!desc) {
			throw new Error(
				`Simulated: Extension description not found for '${extensionId.value}'.`,
			);
		}

		// Use injected ICocoonExtHostProposedApis service for checks
		if (desc.enabledApiProposals && this._proposedApiService) {
			for (const proposal of desc.enabledApiProposals) {
				if (
					!this._proposedApiService.isProposedApiEnabled(
						desc.identifier,
						proposal,
					)
				) {
					this._logWarn(
						`Simulated Proposed API Check: Extension '${desc.identifier.value}' requests proposed API '${proposal}', which is NOT ENABLED. API may be unavailable.`,
					);
				}
			}
		} else if (desc.enabledApiProposals && !this._proposedApiService) {
			this._logWarn(
				`Proposed API service unavailable, cannot check proposals for '${desc.identifier.value}'.`,
			);
		}

		const entryPoint = this._getEntryPointShim(desc); // Refined logic
		const activationTimesBuilder = new ExtensionActivationTimesBuilder(
			reason.startup,
		);
		if (!entryPoint) {
			this._logInfo(
				`Simulated Activation: Ext '${desc.identifier.value}' has no CJS entry point. Activating as EmptyExtension.`,
			);
			const times = activationTimesBuilder.build();
			this.#activationTimes.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),
				times,
			);
			this.#extensionExports.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),
				undefined,
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
			this._logDebug(
				`Simulated Activation: Loading CJS module for '${desc.identifier.value}' from: ${modulePath}`,
			);
			activationTimesBuilder.codeLoadingStart();
			loadedModule = require(modulePath) as LoadedExtensionModuleShim;
			activationTimesBuilder.codeLoadingStop();
			this._logDebug(
				`Simulated Activation: Module loaded for '${desc.identifier.value}'.`,
			);
			this.#extensionModulesCache.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),
				loadedModule,
			);
			contextApi = await this._loadExtensionContextShim(desc);
			this._logDebug(
				`Simulated Activation: ExtensionContext created for '${desc.identifier.value}'.`,
			);
			let activationResult: any = undefined;
			if (typeof loadedModule?.activate === "function") {
				this._logDebug(
					`Simulated Activation: Calling activate() for '${desc.identifier.value}'...`,
				);
				activationTimesBuilder.activateCallStart();
				activationResult = await Promise.resolve(
					loadedModule.activate.apply(globalThis, [
						contextApi as VscodeExtensionContext,
					]),
				);
				activationTimesBuilder.activateCallStop();
				this._logDebug(
					`Simulated Activation: activate() for '${desc.identifier.value}' completed.`,
				);
			} else {
				this._logWarn(
					`Simulated Activation: Ext '${desc.identifier.value}' ('${entryPoint}') has no activate().`,
				);
				activationTimesBuilder.activateCallStop();
			}
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
			);
			return {
				activationFailed: false,
				activationFailedError: null,
				activationTimes,
				module: loadedModule || {},
				exports: activationResult,
				disposable: new DisposableStore(),
			};
		} catch (error: any) {
			this._logError(
				`Simulated Activation FAILED for '${desc.identifier.value}'. Entry: '${entryPoint}'. Error:`,
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
		const iService = this._instantiationService;
		if (!iService) {
			throw new Error(
				"SimulatedExtHostExtensionService: IInstantiationService unavailable for ExtensionContext.",
			);
		}
		this._logDebug(
			`Loading ExtensionContext for '${desc.identifier.value}'...`,
		);

		const storageService = iService.get<IExtHostStorage>(IExtHostStorage);
		const globalState = new ExtensionGlobalMemento(desc, storageService);
		const workspaceState = new ExtensionMemento(
			desc.identifier.value,
			false,
			storageService,
		);
		await Promise.all([globalState.whenReady, workspaceState.whenReady]);

		const storagePathsService = iService.get<IExtensionStoragePaths>(
			IExtensionStoragePaths,
		);
		const storageUri = VscodeUri.from(
			storagePathsService.workspaceValue(desc) || desc.extensionLocation,
		); // Use VscodeUri.from for safety
		const globalStorageUri = VscodeUri.from(
			storagePathsService.globalValue(desc),
		); // Use VscodeUri.from

		let secretsApiObject: VscodeSecretStorage;
		try {
			const secretStateService =
				iService.get<IExtHostSecretState>(IExtHostSecretState);
			secretsApiObject = new ExtensionSecrets(desc, secretStateService);
		} catch (e: any) {
			this._logWarn(
				`IExtHostSecretState DI failed for '${desc.identifier.value}'. SecretStorage NOP. Err: ${e.message || e}`,
			);
			secretsApiObject = {
				get: () => Promise.resolve(undefined),
				store: () => Promise.resolve(),
				delete: () => Promise.resolve(),
				onDidChange: VscodeEvent.None,
			};
		}

		const initDataService = iService.get<IExtHostInitDataService>(
			IExtHostInitDataService,
		);
		const logPathBaseUriDto = initDataService.value.logsLocation;
		if (!logPathBaseUriDto) {
			throw new Error(
				`Logs location URI unavailable for ExtensionContext of '${desc.identifier.value}'.`,
			);
		}
		const logUri = VscodeUri.joinPath(
			VscodeUri.from(VSCodeInternalURI.revive(logPathBaseUriDto)),
			`${desc.identifier.value}.log`,
		);

		let envVarCollectionApiObject: VscodeEnvironmentVariableCollection;
		const extensionApiObjectForContext =
			this._createVscodeExtensionApiObject(desc);
		try {
			const terminalService = iService.get<IExtHostTerminalServiceShape>(
				IExtHostTerminalService,
			);
			envVarCollectionApiObject =
				terminalService.getEnvironmentVariableCollection(
					extensionApiObjectForContext as VscodeExtension<any>,
				);
		} catch (e: any) {
			this._logWarn(
				`IExtHostTerminalService DI failed for '${desc.identifier.value}'. EnvVarCollection NOP. Err: ${e.message || e}`,
			);
			envVarCollectionApiObject = {
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

		let langModelAccessInfoApiObject: VscodeLanguageModelAccessInformation;
		try {
			const langModelsService = iService.get<IExtHostLanguageModels>(
				IExtHostLanguageModels,
			);
			langModelAccessInfoApiObject =
				langModelsService.createLanguageModelAccessInformation(desc);
		} catch (e: any) {
			this._logWarn(
				`IExtHostLanguageModels DI failed for '${desc.identifier.value}'. LMAI NOP. Err: ${e.message || e}`,
			);
			langModelAccessInfoApiObject = {
				get accessAllowed() {
					return false;
				},
				onDidChange: VscodeEvent.None,
			};
		}

		const telemetryService =
			iService.get<IExtHostTelemetry>(IExtHostTelemetry);

		const context: VscodeExtensionContext = {
			subscriptions: [],
			globalState: globalState as VscodeMemento,
			workspaceState: workspaceState as VscodeMemento,
			secrets: secretsApiObject,
			extensionUri: VscodeUri.from(desc.extensionLocation),
			extensionPath: desc.extensionLocation.fsPath,
			environmentVariableCollection: envVarCollectionApiObject,
			asAbsolutePath: (relativePath: string) =>
				path.join(desc.extensionLocation.fsPath, relativePath),
			storageUri,
			storagePath:
				storageUri?.scheme === Schemas.file ? storageUri.fsPath : null,
			globalStorageUri,
			globalStoragePath: globalStorageUri.fsPath,
			logUri,
			logPath: logUri.fsPath,
			// Simplified mode for this simulated service. A real service might check initData.environment.isExtensionDevelopmentDebug etc.
			extensionMode: desc.isUnderDevelopment
				? VscodeExtensionMode.Development
				: VscodeExtensionMode.Production,
			extension: extensionApiObjectForContext as VscodeExtension<any>,
			extensionRuntime: VscodeExtensionRuntime.Node,
			languageModelAccessInformation: langModelAccessInfoApiObject,
			createTelemetryLogger: (sender?: vscode.TelemetrySender) => {
				// Added createTelemetryLogger
				// In VS Code, ExtHostTelemetry has an instantiateLogger method.
				// This simulated service might call a simplified version or a method on the real IExtHostTelemetry.
				if (
					telemetryService &&
					typeof (telemetryService as any).instantiateLogger ===
						"function"
				) {
					return (telemetryService as any).instantiateLogger(
						desc,
						sender,
					) as VscodeTelemetryLogger;
				}
				this._logWarn(
					`Cannot create telemetry logger for '${desc.identifier.value}': IExtHostTelemetry or instantiateLogger unavailable. Returning NOP logger.`,
				);
				// Return a NOP logger
				return {
					logUsage: () => {},
					logError: () => {},
					sendOnDidChangeEnablement: VscodeEvent.None,
					dispose: () => {},
					getLoggers: () => [],
					isEnabled: false,
					onDidChangeEnablement: VscodeEvent.None,
				} as any;
			},
		};
		return Object.freeze(context) as CocoonExtensionContextApi;
	}

	protected _getEntryPointShim(
		desc: IExtensionDescription,
	): string | undefined {
		if (typeof desc.main === "string" && desc.main.length > 0) {
			let entry = desc.main;
			if (entry.endsWith(".js") || entry.endsWith(".mjs")) {
				// Handle both .js and .mjs
				entry = entry.substring(0, entry.lastIndexOf("."));
			}
			return entry;
		}
		return undefined;
	}

	protected _createVscodeExtensionApiObject(
		desc: IExtensionDescription,
	): ExtensionContextExtensionApi {
		const self = this;
		const apiObject: ExtensionContextExtensionApi = {
			get id() {
				return desc.identifier.id;
			},
			get extensionUri() {
				return VscodeUri.from(desc.extensionLocation);
			},
			get extensionPath() {
				return desc.extensionLocation.fsPath;
			},
			get isActive() {
				return self.isActivated(desc.identifier.value);
			},
			get packageJSON() {
				return desc;
			},
			get extensionKind() {
				if (desc.extensionKind?.includes("web"))
					return VscodeExtensionKind.Web;
				if (desc.extensionKind?.includes("workspace"))
					return VscodeExtensionKind.Workspace;
				if (desc.extensionKind?.includes("ui"))
					return VscodeExtensionKind.UI;
				return VscodeExtensionKind.Workspace; // Default for Node host
			},
			get exports() {
				return self.getExtensionExports(desc.identifier.value);
			},
			activate: async (): Promise<any> => {
				if (!self.isActivated(desc.identifier.value)) {
					const reason: ExtensionActivationReason = {
						startup: false,
						extensionId: desc.identifier,
						activationEvent: `api`,
						activationKind: ActivationKind.Api,
					};
					await self.activateById(desc.identifier, reason);
				}
				return self.getExtensionExports(desc.identifier.value);
			},
		};
		return Object.freeze(apiObject);
	}

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
				`Cannot report activation for '${extensionId.value}': Invalid status object.`,
				"Status:",
				status,
			);
			return;
		}
		const serializableTimes = {
			startup: status.activationTimes.startup,
			codeLoadingTime: status.activationTimes.codeLoadingTime,
			activateCallTime: status.activationTimes.activateCallTime,
			activateResolvedTime: status.activationTimes.activateResolvedTime,
			activationReason: {
				startup: status.activationTimes.activationReason.startup,
				extensionId:
					status.activationTimes.activationReason.extensionId.value,
				activationEvent:
					status.activationTimes.activationReason.activationEvent,
				activationKind:
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
			id: extensionId.value,
			success: !status.activationFailed,
			error: errorPayload,
			activationTimes: serializableTimes,
		}).catch((e: any) =>
			this._logError(
				`Failed to send activation status for '${extensionId.value}' to Mountain:`,
				e,
			),
		);
	}

	public override dispose(): void {
		super.dispose();
		this.#activationPromises.clear();
		this.#activationErrors.clear();
		this.#extensionExports.clear();
		this.#extensionModulesCache.clear();
		this.#activationTimes.clear();
		this._logInfo(
			"Disposed SimulatedExtHostExtensionService and cleared caches.",
		);
	}
}
