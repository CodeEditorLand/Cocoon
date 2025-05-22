/*---------------------------------------------------------------------------------------------
 * Cocoon Shim for IExtHostExtensionService (extension-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a *simulated* implementation of the VS Code IExtHostExtensionService interface
 * for a scenario where the original VS Code service is NOT run (e.g., Path B - Grove Rewrite).
 *
 * For Path A (Cocoon Sidecar running the real ExtHostExtensionService), this file is
 * primarily a reference for understanding ExtensionContext dependencies.
 *
 * Responsibilities (when acting as a simulated service):
 * - Managing a registry of known extensions (from initData).
 * - Handling extension activation requests.
 * - Loading extension code (Node.js `require`).
 * - Executing the `activate` function.
 * - Providing a shimmed `ExtensionContext`.
 * - Tracking activation status, timings, errors, and exported APIs.
 * - Communicating activation status/errors back to Mountain via IPC.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { dispose, IDisposable } from "vs/base/common/lifecycle";
import {
	URI as VSCodeInternalURI,
	UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// --- VS Code Internal Module Imports ---
import {
	// For comparing extension IDs
	CanonicalExtensionIdentifier,
	ExtensionIdentifier,
	IEnabledApiProposals,
	IExtensionDescription,
	ISerializedExtension,
} from "vs/platform/extensions/common/extensions";
import {
	IExtHostConfiguration,
	IExtHostConfigurationShape,
} from "vs/workbench/api/common/extHostConfiguration";
import {
	ActivatedExtension,
	ActivationKind,
	EmptyExtension,
	ExtensionActivationReason,
	ExtensionActivationTimes,
	ExtensionActivationTimesBuilder,
} from "vs/workbench/api/common/extHostExtensionActivator";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels";
import { IExtHostSecrets } from "vs/workbench/api/common/extHostSecrets";
// --- Service Interfaces for ExtensionContext dependencies ---
// TODO: These should be the exact interfaces from VS Code DI, used as keys for `accessor.get`.
import { IExtHostStorage } from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
import {
	IExtHostTerminalService,
	IExtHostTerminalServiceShape,
} from "vs/workbench/api/common/extHostTerminalService";
import {
	ExtensionDescriptionRegistry,
	IExtensionPointUser,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry";
// Alias
import { checkProposedApiEnabled as vscodeCheckProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";

import { sendNotificationToMountain } from "../cocoon-ipc";
import {
	EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	Extension as VscodeExtension,
	ExtensionContext as VscodeExtensionContext,
	ExtensionKind as VscodeExtensionKind,
	ExtensionMode as VscodeExtensionMode,
	ExtensionRuntime as VscodeExtensionRuntime,
	Memento as VscodeMemento,
	SecretStorage as VscodeSecretStorage,
	Uri as VscodeUri,
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
	// RpcService not directly used in this shim's constructor if it's simulating
} from "./_baseShim";

// `IExtHostCommands` might be needed if `ExtensionContext` provides command execution.

// --- Type Definitions ---

// Structure of initData relevant to this shim
interface ShimInitDataForExtSvc {
	extensions: {
		// From MainThreadExtensionService
		allExtensions: ReadonlyArray<ISerializedExtension>;

		// IDs for this host
		myExtensions: ReadonlyArray<ExtensionIdentifier>;
	};

	environment: {
		extensionEnabledProposedApi?: string[] | IEnabledApiProposals;

		appRoot?: VSCodeInternalUriComponents;

		appName?: string;

		appHost?: "desktop" | "web" | string;

		isTrusted?: boolean;

		// ...
	};

	logsLocation: VSCodeInternalUriComponents;

	remote?: { isRemote?: boolean; authority?: string };

	// ... other initData fields from ExtHostInitData
}

// For the `vscode.Extension` object provided in ExtensionContext
interface CocoonVscodeExtensionApi<T = any> extends VscodeExtension<T> {
	// Add any Cocoon-specific overrides or ensure compatibility
}

// For ExtensionContext provided to extensions
interface CocoonExtensionContextApi extends VscodeExtensionContext {
	// Ensure our specific Extension type
	readonly extension: CocoonVscodeExtensionApi<any>;

	readonly extensionRuntime: VscodeExtensionRuntime;

	// Other properties like `globalState`, `workspaceState` are already on VscodeExtensionContext
}

// Type for the loaded extension module
interface LoadedExtensionModule {
	activate?: (context: VscodeExtensionContext) => any | Promise<any>;

	deactivate?: () => void | Promise<void>;
}

// For RPC methods (called by MainThreadExtensionService)
// TODO: This MUST align with VS Code's `ExtHostExtensionServiceShape`.
interface CocoonExtHostExtensionServiceRpcShape {
	$resolveAuthority?(
		remoteAuthority: string,

		resolveAttempt?: number,
	): Promise<any>;

	$getCanonicalURI?(
		remoteAuthority: string,

		uri: VscodeUri,

		// API Uri
	): Promise<VscodeUri>;

	$setRemoteEnvironment?(env: {
		[key: string]: string | null;
	}): Promise<void>;

	$activateByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void>;

	$activate(
		extensionIdString: string /* was ExtensionIdentifier in prev. TS */,

		reason: ExtensionActivationReason,
	): Promise<boolean>;

	$deltaExtensions?(delta: {
		removed: string[] /* ids */;

		added: ISerializedExtension[];
	}): Promise<void>;
}

// Access to DI (setup in index.ts)
declare var cocoonInstantiationService:
	| {
			invokeFunction<T>(
				callback: (accessor: { get: <Svc>(id: any) => Svc }) => T,
			): T;
	  }
	| undefined;

// This class simulates IExtHostExtensionService if Path B (Grove) was chosen,

// or serves as a detailed reference for ExtensionContext construction.
export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements CocoonExtHostExtensionServiceRpcShape
{
	/*, IExtHostExtensionService */ public readonly _serviceBrand: undefined;

	readonly #initData: ShimInitDataForExtSvc;

	#extensionRegistry: ExtensionDescriptionRegistry | null = null;

	readonly #activationTimes = new Map<string, ExtensionActivationTimes>();

	readonly #extensionExports = new Map<string, any>();

	readonly #activationErrors = new Map<string, Error>();

	readonly #activationPromises = new Map<
		string,
		Promise<ActivatedExtension>
		// Key: CanonicalExtensionIdentifier
	>();

	// Cache loaded modules for deactivate
	readonly #extensionModules = new Map<string, LoadedExtensionModule>();

	// Events from IExtHostExtensionService
	private readonly _onDidRegisterExtensions = new VscodeEmitter<void>();

	public readonly onDidRegisterExtensions: VscodeEvent<void> =
		this._onDidRegisterExtensions.event;

	// TODO: Implement onDidChangeResponsiveMode if needed

	constructor(
		initData: ShimInitDataForExtSvc,

		logService: ILogService | undefined,

		// configService obtained via DI for ExtensionContext
		// configService: IExtHostConfigurationShape | undefined
	) {
		super(
			"ExtHostExtensionService",

			undefined /* No direct RPC proxy for self */,

			logService,
		);

		this.#initData = initData;

		this._log("Initializing (Simulated ExtHostExtensionService)...");

		// TODO: Register self for RPC if Mountain calls methods on this service directly.
		// if (this._rpcService) {

		//    this._rpcService.set(ExtHostContext.ExtHostExtensionService as ProxyIdentifier<CocoonExtHostExtensionServiceRpcShape>, this);

		// }

		this._initializeRegistry();
	}

	private _initializeRegistry(): void {
		if (!this.#initData?.extensions?.allExtensions) {
			this._logError(
				"Extension registry init failed: Missing initData.extensions.allExtensions.",
			);

			this.#extensionRegistry = new ExtensionDescriptionRegistry(
				_createSimpleReaderForExtSvc(),

				[],
			);

			return;
		}

		// Only process extensions listed in myExtensions if that field is definitive for this host
		// const myExtensionIds = new Set(this.#initData.extensions.myExtensions.map(id => id.value));

		// const extensionsToLoad = this.#initData.extensions.allExtensions.filter(sExt => myExtensionIds.has(sExt.identifier.value));

		// For now, assume allExtensions are potentially relevant for this host if simulating.
		const extensionsToLoad = this.#initData.extensions.allExtensions;

		const allRevivedExtensions = extensionsToLoad
			.map((serializedExt): IExtensionDescription | null => {
				try {
					const identifier = ExtensionIdentifier.revive(
						serializedExt.identifier,
					);

					if (!identifier) {
						this._logError(
							"Failed to revive identifier:",

							serializedExt.identifier,
						);

						return null;
					}

					const extensionLocation =
						this._reviveUriDtoToInternalVSCodeUri(
							serializedExt.extensionLocation,
						);

					if (!extensionLocation) {
						this._logError(
							`Failed to revive location for ${identifier.value}:`,

							serializedExt.extensionLocation,
						);

						return null;
					}

					// Reconstruct IExtensionDescription carefully
					const description: IExtensionDescription = {
						// Mandatory fields
						identifier,

						extensionLocation,

						name: serializedExt.name,

						version: serializedExt.version,

						publisher: serializedExt.publisher,

						isBuiltin: !!serializedExt.isBuiltin,

						isUserBuiltin: !!serializedExt.isUserBuiltin,

						isUnderDevelopment: !!serializedExt.isUnderDevelopment,

						// Optional fields from ISerializedExtension
						description: serializedExt.description,

						main: serializedExt.main,

						browser: serializedExt.browser,

						// If worker is a new field
						worker: (serializedExt as any).worker,

						engines: serializedExt.engines,

						enabledApiProposals: serializedExt.enabledApiProposals,

						api: serializedExt.api,

						activationEvents: serializedExt.activationEvents,

						contributes: serializedExt.contributes,

						repository: serializedExt.repository,

						icon: serializedExt.icon,

						categories: serializedExt.categories,

						keywords: serializedExt.keywords,

						badges: serializedExt.badges,

						sponsor: serializedExt.sponsor,

						extensionDependencies:
							serializedExt.extensionDependencies,

						extensionPack: serializedExt.extensionPack,

						localizedMessages: serializedExt.localizedMessages
							? {
									default: serializedExt.localizedMessages
										.default
										? VSCodeInternalURI.revive(
												serializedExt.localizedMessages
													.default,
											)
										: undefined,

									values: serializedExt.localizedMessages
										.values,
								}
							: undefined,

						// Ensure all other fields from IExtensionDescription are covered or defaulted.
					};

					return description;
				} catch (e: any) {
					this._logError(
						`Failed to process serialized extension description for ${serializedExt?.identifier?.value || "unknown"}:`,

						e,
					);

					return null;
				}
			})
			.filter((ext): ext is IExtensionDescription => ext !== null);

		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			_createSimpleReaderForExtSvc(),

			allRevivedExtensions,
		);

		this._log(
			`Initialized extension registry with ${this.#extensionRegistry.getAllExtensionDescriptions().length} extensions.`,
		);

		this._onDidRegisterExtensions.fire();
	}

	// --- Shim's own initialization (called by index.ts if this shim is used directly) ---
	public async masterInitialize(): Promise<void> {
		this._log("Master initialization sequence (eager activations)...");

		if (!this.#extensionRegistry) {
			this._logWarn(
				"Registry not initialized, skipping eager activations.",
			);

			return;
		}

		await this._triggerEagerActivations();

		this._log("Master initialization finished.");
	}

	// --- IExtHostExtensionService API Implementation (subset for simulation) ---
	public async initialize(): Promise<void> {
		// The real service's initialize does more. For this shim, it means being ready.
		this._log("IExtHostExtensionService.initialize() called (simulated).");

		// Trigger eager activations as part of init
		return this.masterInitialize();
	}

	public terminate(_reason: string): void {
		this._logWarn(
			"IExtHostExtensionService.terminate called (simulated NOP).",
		);
	}

	public async getExtension(
		extensionIdString: string,
	): Promise<IExtensionDescription | undefined> {
		/* ... (implementation from prev. TS, using ExtensionIdentifier) ... */
		if (!this.#extensionRegistry) return undefined;

		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionRegistry.getExtensionDescription(id) || undefined;
	}

	public async getExtensions(): Promise<IExtensionDescription[]> {
		/* ... (implementation from prev. TS) ... */
		if (!this.#extensionRegistry) return Promise.resolve([]);

		return Promise.resolve(
			this.#extensionRegistry.getAllExtensionDescriptions(),
		);
	}

	public isActivated(extensionIdString: string): boolean {
		/* ... (implementation using #extensionExports, #activationErrors) ... */
		const id = new ExtensionIdentifier(extensionIdString);

		return (
			this.#extensionExports.has(id.value) ||
			this.#activationErrors.has(id.value)
		);
	}

	public getExtensionExports(extensionIdString: string): any | undefined {
		/* ... (implementation using #extensionExports) ... */
		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionExports.get(id.value);
	}

	public async activateById(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<void> {
		// Use canonical for map keys
		const canonicalId = CanonicalExtensionIdentifier.toKey(extensionId);

		// this._log(`activateById: ${extensionId.value}, Reason: ${ActivationKind[reason.activationKind]} (${reason.activationEvent || "API"})`);

		if (this.#activationPromises.has(canonicalId)) {
			// this._log(`Activation for ${extensionId.value} already requested/completed, awaiting existing promise.`);

			try {
				const existingActivationResult =
					await this.#activationPromises.get(canonicalId)!;

				if (existingActivationResult.activationFailed)
					throw (
						existingActivationResult.activationFailedError ||
						new Error(
							"Previously failed activation (no error detail).",
						)
					);

				return;
			} catch (e: any) {
				this._logError(
					`Re-entrant activation for ${extensionId.value} hit previous error:`,

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
			const activationResult = await activationPromise;

			if (activationResult.activationFailed) {
				const errorToThrow =
					activationResult.activationFailedError ||
					new Error(
						`Activation failed for ${extensionId.value} (unknown error).`,
					);

				if (!this.#activationErrors.has(canonicalId))
					this.#activationErrors.set(canonicalId, errorToThrow);

				this._reportActivationStatusToMountain(
					extensionId,

					activationResult,
				);

				throw errorToThrow;
			}

			// Success reporting handled in finally
		} catch (error: any) {
			if (!this.#activationErrors.has(canonicalId))
				this.#activationErrors.set(canonicalId, error);

			// Ensure status is reported for errors caught at this level too
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
				// Report success if no error was stored and exports are present
				const status = this.#activationPromises.get(canonicalId)!.then(
					(res) => res,

					(err) =>
						({
							activationFailed: true,

							activationFailedError: err,
						}) as ActivatedExtension,
				);

				this._reportActivationStatusToMountain(
					extensionId,

					await status,
				);
			}
		}
	}

	public async getExtensionRegistry(): Promise<ExtensionDescriptionRegistry> {
		/* ... (implementation from prev. TS) ... */
		if (!this.#extensionRegistry) {
			this._logWarn(
				"getExtensionRegistry called before init. Returning empty.",
			);

			return new ExtensionDescriptionRegistry(
				_createSimpleReaderForExtSvc(),

				[],
			);
		}

		return this.#extensionRegistry;
	}

	public async getExtensionPathIndex(): Promise<{
		findSubstr: (uri: VscodeApiUri) => IExtensionDescription | undefined;
	}> {
		/* ... (implementation from prev. TS) ... */
		this._logWarnOnce(
			"getExtensionPathIndex (simulated) returning basic mock.",
		);

		if (!this.#extensionRegistry) return { findSubstr: () => undefined };

		const extensions =
			this.#extensionRegistry.getAllExtensionDescriptions();

		return {
			findSubstr: (uri: VscodeApiUri) => {
				// uri is vscode.Uri
				if (!uri?.fsPath) return undefined;

				return extensions.find(
					(ext) =>
						ext.extensionLocation?.fsPath &&
						uri.fsPath.startsWith(ext.extensionLocation.fsPath),
				);
			},
		};
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
					`Error during background activation for event '${activationEvent}':`,

					err,
				);
			},
		);
	}

	public async $activate(
		extensionIdString: string,

		reason: ExtensionActivationReason,
	): Promise<boolean> {
		// Mountain's rpc.rs calls this with extensionId as a string.
		const extensionId = new ExtensionIdentifier(extensionIdString);

		this._log(
			`RPC $activate: ${extensionId.value}, Reason: ${ActivationKind[reason.activationKind]} (${reason.activationEvent})`,
		);

		try {
			await this.activateById(extensionId, reason);

			return true;
		} catch (e: any) {
			this._logError(
				`RPC $activate for ${extensionId.value} failed:`,

				e.message,
			);

			return false;
		}
	}

	public async $deltaExtensions(delta: {
		removed: string[];

		added: ISerializedExtension[];
	}): Promise<void> {
		this._log(
			`RPC $deltaExtensions: Added ${delta.added.length}, Removed ${delta.removed.length}`,
		);

		if (!this.#extensionRegistry) {
			this._logError("Cannot apply delta, registry not initialized.");

			return;
		}

		const newExtensions =
			this.#extensionRegistry.getAllExtensionDescriptions();

		const removedIds = new Set(
			delta.removed.map((idStr) =>
				CanonicalExtensionIdentifier.toKey(
					new ExtensionIdentifier(idStr),
				),
			),
		);

		let currentExtensions = newExtensions.filter(
			(desc) =>
				!removedIds.has(
					CanonicalExtensionIdentifier.toKey(desc.identifier),
				),
		);

		const addedDescriptions = delta.added
			.map((sExt) => {
				// Simplified revival logic (from constructor)
				try {
					const identifier = ExtensionIdentifier.revive(
						sExt.identifier,
					);

					if (!identifier) return null;

					const extensionLocation =
						this._reviveUriDtoToInternalVSCodeUri(
							sExt.extensionLocation,
						);

					if (!extensionLocation) return null;

					return {
						...sExt,

						identifier,

						extensionLocation,

						isBuiltin: !!sExt.isBuiltin,

						isUserBuiltin: !!sExt.isUserBuiltin,

						isUnderDevelopment: !!sExt.isUnderDevelopment,
					} as IExtensionDescription;
				} catch {
					return null;
				}
			})
			.filter((d) => d !== null) as IExtensionDescription[];

		currentExtensions.push(...addedDescriptions);

		this.#extensionRegistry = new ExtensionDescriptionRegistry(
			_createSimpleReaderForExtSvc(),

			currentExtensions,
		);

		this._log(
			`Extension registry updated. New count: ${this.#extensionRegistry.getAllExtensionDescriptions().length}`,
		);

		// Signal that registry has changed
		this._onDidRegisterExtensions.fire();

		// TODO: Potentially re-evaluate eager activations or trigger activations for newly added extensions if their events match.
	}

	// --- Stubs for other RPC methods if this shim aims for full IExtHostExtensionService compatibility ---
	// $setRemoteEnvironment, $updateRemoteConnectionData, etc.

	// --- Internal Helper Logic ---
	private _reviveUriDtoToInternalVSCodeUri(
		uriDto: VSCodeInternalUriComponents | undefined,
	): VSCodeInternalURI | undefined {
		if (!uriDto) return undefined;

		try {
			return VSCodeInternalURI.revive(uriDto);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VSCodeInternalURI:",

				uriDto,

				e,
			);

			return undefined;
		}
	}

	private async _triggerEagerActivations(): Promise<void> {
		this._log("Handling eager activations (event: '*')...");

		await this._triggerActivationsByEvent("*", ActivationKind.Normal);
	}

	private async _triggerActivationsByEvent(
		activationEvent: string,

		activationKind: ActivationKind,
	): Promise<void> {
		if (!this.#extensionRegistry) return;

		const candidates =
			this.#extensionRegistry.getExtensionDescriptionsForActivationEvent(
				activationEvent,
			);

		if (candidates.length > 0) {
			this._log(
				`Event '${activationEvent}' triggers activation for ${candidates.length} extensions.`,
			);

			const reasonBase: Omit<ExtensionActivationReason, "extensionId"> = {
				startup: activationEvent === "*",

				activationEvent,

				activationKind,
			};

			const promises = candidates.map((desc) =>
				this.activateById(desc.identifier, {
					...reasonBase,

					extensionId: desc.identifier,
				}).catch((err: any) => {
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
			this.#extensionRegistry?.getExtensionDescription(extensionId);

		if (!desc) {
			const error = new Error(
				`Extension description not found for activation: ${extensionId.value}`,
			);

			this.#activationErrors.set(
				CanonicalExtensionIdentifier.toKey(extensionId),

				error,
			);

			throw error;
		}

		// this._log(`Activating module: ${desc.identifier.value} (reason: ${ActivationKind[reason.activationKind]})`);

		// Proposed API Check
		let enabledProposalsSource =
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
					// Check one by one
					this._logWarn(
						`Extension '${desc.identifier.value}' requests proposed API '${proposal}' which is NOT ENABLED.`,
					);

					// TODO: Decide if activation should fail here or just log. VS Code often logs and continues.
				}
			}
		}

		const entryPoint = this._getEntryPointShim(desc);

		const activationTimesBuilder = new ExtensionActivationTimesBuilder(
			reason.startup,
		);

		if (!entryPoint) {
			/* ... (implementation for EmptyExtension from prev. TS) ... */
			this._log(
				`Extension ${desc.identifier.value} has no entry point. Activating as EmptyExtension.`,
			);

			const times = activationTimesBuilder.build();

			this.#activationTimes.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				times,
			);

			return new EmptyExtension(times);
		}

		let loadedModule: LoadedExtensionModule | undefined;

		let contextApi: CocoonExtensionContextApi | undefined;

		try {
			const modulePath = path.join(
				desc.extensionLocation.fsPath,

				entryPoint.endsWith(".js") ? entryPoint : `${entryPoint}.js`,
			);

			activationTimesBuilder.codeLoadingStart();

			// Node.js require
			loadedModule = require(modulePath) as LoadedExtensionModule;

			activationTimesBuilder.codeLoadingStop();

			this._log(
				`Module loaded for ${desc.identifier.value}. Cache for deactivate.`,
			);

			this.#extensionModules.set(
				CanonicalExtensionIdentifier.toKey(desc.identifier),

				loadedModule,
			);

			// Ensure this uses VscodeExtensionContext
			contextApi = await this._loadExtensionContextShim(desc);

			// this._log(`ExtensionContext prepared for ${desc.identifier.value}.`);

			let activationResult: any = undefined;

			if (typeof loadedModule?.activate === "function") {
				activationTimesBuilder.activateCallStart();

				// this._log(`Calling activate() for ${desc.identifier.value}...`);

				activationResult = await Promise.resolve(
					loadedModule.activate.apply(globalThis, [contextApi]),
				);

				activationTimesBuilder.activateCallStop();

				activationTimesBuilder.activateResolveStart();

				activationTimesBuilder.activateResolveStop();

				// this._log(`activate() finished for ${desc.identifier.value}. Exports type: ${typeof activationResult}`);
			} else {
				this._logWarn(
					`Extension ${desc.identifier.value} entry point loaded but no activate() function found.`,
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

				// Clear previous errors on success
			);

			return {
				activationFailed: false,

				activationFailedError: null,

				activationTimes,

				module: loadedModule || {},

				exports: activationResult,

				disposable: {
					dispose: () => {
						const moduleToDeactivate = this.#extensionModules.get(
							CanonicalExtensionIdentifier.toKey(desc.identifier),
						);

						if (
							typeof moduleToDeactivate?.deactivate === "function"
						) {
							this._log(
								`Calling deactivate() for ${desc.identifier.value}...`,
							);

							Promise.resolve(
								moduleToDeactivate.deactivate!(),
							).catch((e: any) =>
								this._logError(
									`Error in deactivate of ${desc.identifier.value}:`,

									refineError(e, this._logService),
								),
							);
						}

						if (contextApi?.subscriptions) {
							// this._log(`Disposing ${contextApi.subscriptions.length} subscriptions for ${desc.identifier.value}.`);

							dispose(contextApi.subscriptions);
						}

						this.#extensionModules.delete(
							CanonicalExtensionIdentifier.toKey(desc.identifier),

							// Clean up module cache
						);
					},
				},
			};
		} catch (error: any) {
			this._logError(
				`FAILED to load/activate ${desc.identifier.value}:`,

				error,
			);

			// Already set by activateById if error bubbles up
			// this.#activationErrors.set(CanonicalExtensionIdentifier.toKey(desc.identifier), error);

			return {
				activationFailed: true,

				activationFailedError: error,

				activationTimes: activationTimesBuilder.build(),

				module: loadedModule || {},

				exports: undefined,

				disposable: { dispose: () => {} },
			};
		}
	}

	protected async _loadExtensionContextShim(
		desc: IExtensionDescription,
	): Promise<CocoonExtensionContextApi> {
		// this._log(`Loading ExtensionContext for ${desc.identifier.value}`);

		if (!global.cocoonInstantiationService)
			throw new Error(
				"DI service (global.cocoonInstantiationService) unavailable for ExtensionContext!",
			);

		// InstantiationService
		const iService = global.cocoonInstantiationService;

		// Fetch services via DI. Ensure service IDs are correct.
		const storageService = iService.invokeFunction((accessor) =>
			accessor.get<IExtHostStorage>(IExtHostStorage),
		);

		const globalState = storageService.createMemento(
			desc.identifier.id,

			true,

			// .id for string
		);

		const workspaceState = storageService.createMemento(
			desc.identifier.id,

			false,
		);

		const storagePaths = iService.invokeFunction((accessor) =>
			accessor.get<IExtensionStoragePaths>(IExtensionStoragePaths),
		);

		const storageUri = VscodeApiUri.from(
			storagePaths.workspaceValue(desc) || desc.extensionLocation,

			// Fallback for workspaceValue
		);

		const globalStorageUri = VscodeApiUri.from(
			storagePaths.globalValue(desc),

			// Should not be undefined
		);

		let secrets: VscodeSecretStorage;

		try {
			secrets = iService.invokeFunction((accessor) =>
				accessor.get<IExtHostSecrets>(IExtHostSecrets),
			) as VscodeSecretStorage;
		} catch (e) {
			this._logWarn(
				`IExtHostSecrets not found for ${desc.identifier.id}, NOP SecretStorage. Error: ${e}`,
			);

			secrets = {
				get: () => Promise.resolve(undefined),

				store: () => Promise.resolve(),

				delete: () => Promise.resolve(),

				onDidChange: VscodeEvent.None,
			};
		}

		const logPathBaseUri = this._reviveUriDtoToInternalVSCodeUri(
			this.#initData.logsLocation,
		);

		if (!logPathBaseUri)
			throw new Error(
				"Logs location URI could not be revived for ExtensionContext.",
			);

		const logUri = VscodeApiUri.joinPath(
			VscodeApiUri.from(logPathBaseUri),

			`${desc.identifier.id}.log`,

			// Use VscodeApiUri.joinPath
		);

		let environmentVariableCollection: VscodeEnvironmentVariableCollection;

		// Create this first
		const extensionApiObject = this._createExtensionApiObjectShim(desc);

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
				`IExtHostTerminalService not found for ${desc.identifier.id}, NOP EnvVarCollection. Error: ${e}`,
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

				toArray: () => [],
			};
		}

		await Promise.all([
			(globalState as VscodeMemento).whenReady,

			(workspaceState as VscodeMemento).whenReady,
		]);

		const context: CocoonExtensionContextApi = {
			subscriptions: [],

			globalState: globalState as VscodeMemento,

			workspaceState: workspaceState as VscodeMemento,

			secrets,

			// Convert internal URI
			extensionUri: VscodeApiUri.from(desc.extensionLocation),

			extensionPath: desc.extensionLocation.fsPath,

			environmentVariableCollection,

			asAbsolutePath: (relativePath) =>
				path.join(desc.extensionLocation.fsPath, relativePath),

			// Already VscodeApiUri
			storageUri,

			storagePath: storageUri?.fsPath,

			// Already VscodeApiUri
			globalStorageUri,

			globalStoragePath: globalStorageUri.fsPath,

			// Already VscodeApiUri
			logUri,

			logPath: logUri.fsPath,

			extensionMode: desc.isUnderDevelopment
				? VscodeExtensionMode.Development
				: VscodeExtensionMode.Production,

			extension: extensionApiObject,

			extensionRuntime: VscodeExtensionRuntime.Node,

			// TODO: Implement other ExtensionContext properties like `globalศัพท์`, `workspaceศัพท์` (state sync), `extensionMode` (test/debug), `languageModelAccessInformation`.
			// languageModelAccessInformation: iService.invokeFunction(accessor => accessor.get<IExtHostLanguageModels>(IExtHostLanguageModels)).createLanguageModelAccessInformation(desc),

			// The above line for languageModelAccessInformation would require IExtHostLanguageModels to be properly shimmed and registered.
		};

		// VS Code freezes the context
		return Object.freeze(context);
	}

	protected _getEntryPointShim(
		desc: IExtensionDescription,
	): string | undefined {
		/* ... (implementation from prev. TS) ... */
		if (typeof desc.main === "string")
			return desc.main.replace(/\.js$/, "");

		if (typeof desc.browser === "string") {
			if (
				this.#initData.remote?.isRemote ||
				typeof process !== "object"
			) {
				// If in a web-like environment or remote context
				// this._log(`Using 'browser' entry point for ${desc.identifier.value}: ${desc.browser}`);

				return desc.browser.replace(/\.js$/, "");
			} else {
				this._logWarn(
					`Ignoring 'browser' field for Node-based shim ${desc.identifier.value}, 'main' preferred.`,
				);
			}
		}

		if (typeof (desc as any).worker === "string") {
			// TODO: Cocoon doesn't support worker extension hosts yet.
			this._logWarn(
				`Ignoring 'worker' field for ${desc.identifier.value} as worker hosts are not supported by Cocoon shim.`,
			);
		}

		return typeof desc.main === "string"
			? desc.main.replace(/\.js$/, "")
			: // Prioritize main for Node
				undefined;
	}

	protected _createExtensionApiObjectShim(
		desc: IExtensionDescription,
	): VscodeExtension<any> {
		/* ... (implementation from prev. TS, ensuring return type VscodeExtension<any>) ... */
		const extensionService = this;

		const extensionApiObject: VscodeExtension<any> = {
			get id() {
				return desc.identifier.id;

				// Use .id from ExtensionIdentifier
			},

			get extensionUri() {
				return VscodeApiUri.from(desc.extensionLocation);
			},

			get extensionPath() {
				return desc.extensionLocation.fsPath;
			},

			get isActive() {
				return extensionService.isActivated(desc.identifier.id);
			},

			get packageJSON() {
				return desc as any;

				// Cast if IExtensionDescription is not directly assignable
			},

			get extensionKind() {
				// Determine based on extension manifest or context
				// If desc.extensionKind is present and is ExtensionHostKind, map it to vscode.ExtensionKind
				// For Cocoon, it's usually Workspace or UI (if UI extensions run here)
				// Default for Cocoon
				return VscodeExtensionKind.Workspace;
			},

			get exports() {
				return extensionService.getExtensionExports(desc.identifier.id);
			},

			activate: async (): Promise<any> => {
				if (!extensionService.isActivated(desc.identifier.id)) {
					const reason: ExtensionActivationReason = {
						startup: false,

						extensionId: desc.identifier,

						activationEvent: `extension.activateApiCall`,

						activationKind: ActivationKind.Api,
					};

					await extensionService.activateById(
						desc.identifier,

						reason,
					);
				}

				return extensionService.getExtensionExports(desc.identifier.id);
			},
		};

		return Object.freeze(extensionApiObject);
	}

	protected _reportActivationStatusToMountain(
		extensionId: ExtensionIdentifier,

		status: ActivatedExtension,
	): void {
		/* ... (implementation from prev. TS, ensure status.activationTimes is serializable) ... */
		if (!status) {
			this._logError(
				`Cannot report activation status for ${extensionId.value}, status object is undefined.`,
			);

			return;
		}

		const serializableTimes = {
			// Ensure activationTimes is plain data
			startup: status.activationTimes.startup,

			codeLoadingTime: status.activationTimes.codeLoadingTime,

			activateCallTime: status.activationTimes.activateCallTime,

			activateResolvedTime: status.activationTimes.activateResolvedTime,

			activationReason: status.activationTimes.activationReason,
		};

		// this._log(`Reporting activation status for ${extensionId.value}: success=${!status.activationFailed}`);

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

	public dispose(): void {
		// If BaseCocoonShim has a dispose
		super.dispose();

		this._onDidRegisterExtensions.dispose();

		this._onDidChangeResponsiveMode.dispose();

		// TODO: Iterate over #activationPromises and dispose any disposables from ActivatedExtension if they are stored and managed.
		// Current ActivatedExtension.disposable is NOP for this shim, but full VS Code might do more.
		this.#activationPromises.clear();

		this.#extensionModules.forEach((module) => {
			// Attempt to call deactivate on any loaded modules
			if (typeof module.deactivate === "function") {
				try {
					module.deactivate();
				} catch (e) {
					this._logError(
						"Error during mass deactivation on dispose:",

						e,
					);
				}
			}
		});

		this.#extensionModules.clear();

		this._log("Disposed.");
	}
}

// Helper for ExtensionDescriptionRegistry (from VS Code's extHostExtensionService)
// This provides the `readActivationEvents` method.
function _createSimpleReaderForExtSvc(): IExtensionPointUser<any>[] {
	return [
		{
			description: {
				name: "cocoon-activation-event-reader",

				version: "0.0.1",

				publisher: "cocoon-internal",

				engines: { vscode: "*" },

				// Mock
			},

			// Not strictly how IExtensionPointUser works, but targets registry's need
			name: "activationEvents",

			read: (desc: IExtensionDescription) => desc.activationEvents || [],

			more: (collector, desc) => {
				/* NOP for 'more' (accept/contribute) */
				// Using Telugu for "more" as a placeholder
			},
		},
	] as any[];
}
