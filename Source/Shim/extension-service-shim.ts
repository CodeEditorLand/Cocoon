// --- START OF FILE extension-service-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Shim for IExtHostExtensionService (extension-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a *simulated* implementation of the VS Code IExtHostExtensionService interface
 * for the Cocoon sidecar environment.
 *
 * Responsibilities:
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
import { URI } from "vs/base/common/uri"; // VS Code internal URI for initData revival
// --- VS Code Internal Module Imports ---
import {
	ExtensionIdentifier,
	IEnabledApiProposals,
	IExtensionDescription,
	ISerializedExtension,
} from "vs/platform/extensions/common/extensions";
import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands"; // For ExtensionContext
import {
	IExtHostConfiguration,
	IExtHostConfigurationShape,
} from "vs/workbench/api/common/extHostConfiguration";
import {
	ActivatedExtension,
	ActivationKind, // Enum for activation kind
	EmptyExtension,
	ExtensionActivationReason,
	ExtensionActivationTimes,
	ExtensionActivationTimesBuilder,
} from "vs/workbench/api/common/extHostExtensionActivator";
import { IExtHostLanguageModels } from "vs/workbench/api/common/extHostLanguageModels"; // For ExtensionContext
import { IExtHostSecrets } from "vs/workbench/api/common/extHostSecrets";
// --- Service Interfaces for ExtensionContext dependencies ---
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
import { checkProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";
// EventEmitter from 'events' is not directly used for public API, VscodeEmitter is preferred.
import {
	EnvironmentVariableCollection,
	Extension,
	ExtensionContext,
	ExtensionKind,
	ExtensionMode,
	ExtensionRuntime,
	Memento,
	SecretStorage,
	Uri as VscodeUri,
} from "vscode"; // Assuming from 'vscode' API shim

import { sendNotificationToMountain } from "../cocoon-ipc";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

// Structure of initData relevant to this shim
interface ShimInitDataForExtensionService {
	extensions: {
		// This part should be IExtensionHostExtensionsInitParams
		allExtensions: ISerializedExtension[]; // Raw from main thread
		myExtensions: ExtensionIdentifier[]; // IDs of extensions to run in this host
	};
	environment: {
		extensionEnabledProposedApi?: string[] | IEnabledApiProposals; // Can be string array or object
		appRoot?: UriComponents;
		appName?: string;
		appHost?: string;
		appUriScheme?: string;
		appLanguage?: string;
		isTrusted?: boolean;
		// ... other env properties
	};
	logsLocation: UriComponents; // VS Code internal URI components
	machineId: string;
	sessionId: string;
	remote?: {
		isRemote?: boolean;
		authority?: string;
		connectionToken?: string;
	};
	// ... other initData properties for IExtHostInitDataService
}
interface UriComponents {
	scheme: string;
	authority?: string;
	path: string;
	query?: string;
	fragment?: string;
	fsPath?: string;
	external?: string;
	$mid?: 1;
}

// For ExtensionContext
interface CocoonExtensionContext extends ExtensionContext {
	// Add any Cocoon-specific extensions to the context if needed, though aiming for vscode.ExtensionContext compatibility.
	// Note: vscode.ExtensionContext already has most of these properties.
	// We are essentially re-typing it for clarity of what this shim constructs.
	readonly extension: Extension<any>; // This is vscode.Extension<T>
	readonly extensionRuntime: ExtensionRuntime;
}

// Type for the loaded extension module
interface ExtensionModule {
	activate?: (context: ExtensionContext) => any | Promise<any>;
	deactivate?: () => void | Promise<void>;
}

// For the activator internal logic (subset of what real ExtHostExtensionActivator provides)
interface ShimActivator {
	isActivated: (id: ExtensionIdentifier) => boolean;
	getActivatedExtension: (
		id: ExtensionIdentifier,
	) => ActivatedExtension | undefined;
}

// For RPC methods (called by MainThreadExtensionService)
// TODO: Align with ExtHostExtensionServiceShape from extHost.protocol.ts
interface ExtHostExtensionServiceShapeForRpc {
	$resolveAuthority?(
		remoteAuthority: string,
		resolveAttempt?: number,
	): Promise<any>; // These were on original JS, may not be on IExtHostExtensionService
	$getCanonicalURI?(
		remoteAuthority: string,
		uri: VscodeUri,
	): Promise<VscodeUri>;
	$setRemoteEnvironment?(env: {
		[key: string]: string | null;
	}): Promise<void>;

	// From IExtHostExtensionService
	$activateByEvent(
		activationEvent: string,
		activationKind: ActivationKind,
	): Promise<void>;
	$activate(
		extensionId: ExtensionIdentifier,
		reason: ExtensionActivationReason,
	): Promise<boolean>;
	// $deltaExtensions might be used instead of $startExtensionHost in newer VS Code
	$deltaExtensions?(delta: {
		removed: string[];
		added: ISerializedExtension[];
	}): Promise<void>;
	// Older $startExtensionHost
	$startExtensionHost?(delta: {
		removed: ExtensionIdentifier[];
		added: IExtensionDescription[];
	}): Promise<void>;
}

// Global instantiation service (assume it's set elsewhere by index.ts)
declare var cocoonInstantiationService:
	| {
			invokeFunction<T>(
				callback: (accessor: { get: <Svc>(id: any) => Svc }) => T,
			): T;
	  }
	| undefined; // Make it possibly undefined for safety checks

export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements ExtHostExtensionServiceShapeForRpc
/* and IExtHostExtensionService */ {
	public readonly _serviceBrand: undefined; // For IExtHostExtensionService
	readonly #initData: ShimInitDataForExtensionService;
	// #configService is not directly used by this class's methods, but by ExtensionContext creation.
	// It would be fetched from DI during _loadExtensionContextShim.
	#extensionRegistry: ExtensionDescriptionRegistry | null = null;
	readonly #activator: ShimActivator;
	readonly #activationTimes = new Map<string, ExtensionActivationTimes>();
	readonly #extensionExports = new Map<string, any>();
	readonly #activationErrors = new Map<string, Error>();
	// Store promises for ongoing or completed activations to handle re-entrant calls.
	readonly #activationPromises = new Map<
		string,
		Promise<ActivatedExtension>
	>();

	// Events from IExtHostExtensionService
	private readonly _onDidRegisterExtensions = new VscodeEmitter<void>();
	public readonly onDidRegisterExtensions: VscodeEvent<void> =
		this._onDidRegisterExtensions.event;
	private readonly _onDidChangeResponsiveMode = new VscodeEmitter<any>(); // Type this with ResponsiveMode
	public readonly onDidChangeResponsiveMode: VscodeEvent<any> =
		this._onDidChangeResponsiveMode.event;

	constructor(
		initData: ShimInitDataForExtensionService, // Received from index.ts
		logService: ILogService | undefined,
		// rpcService is inherited from BaseCocoonShim, not directly passed here.
		// configService is obtained via DI when creating ExtensionContext.
	) {
		super(
			"ExtHostExtensionService",
			undefined /* rpcService from base */,
			logService,
		);
		this.#initData = initData;
		this._log("Initializing...");

		// TODO: Register self for RPC if needed, using ExtHostContext.ExtHostExtensionService
		// if (this._rpcService) {
		//    this._rpcService.set(ExtHostContext.ExtHostExtensionService as ProxyIdentifier<ExtHostExtensionServiceShapeForRpc>, this);
		// }

		// --- Initialize Extension Registry ---
		if (!initData?.extensions?.allExtensions) {
			this._logError(
				"Initialization failed: Missing extensions data in initData.extensions.allExtensions.",
			);
			this.#extensionRegistry = new ExtensionDescriptionRegistry(
				_createSimpleReader(),
				[],
			);
		} else {
			const allExtensions = initData.extensions.allExtensions
				.map((extDesc): IExtensionDescription | null => {
					try {
						// Revive ISerializedExtension to IExtensionDescription
						const identifier = ExtensionIdentifier.revive(
							extDesc.identifier,
						);
						if (!identifier) {
							this._logError(
								"Failed to revive identifier for extension:",
								extDesc.identifier,
							);
							return null;
						}
						const extensionLocation = this._reviveUriDto(
							extDesc.extensionLocation,
						);
						if (!extensionLocation) {
							this._logError(
								`Failed to revive extensionLocation for ${identifier.value}:`,
								extDesc.extensionLocation,
							);
							return null;
						}
						// Reconstruct IExtensionDescription
						// This needs to map all fields from ISerializedExtension to IExtensionDescription
						const description: IExtensionDescription = {
							...extDesc, // Spread serialized fields
							identifier,
							extensionLocation,
							// Ensure required fields from IExtensionDescription are present and correctly typed
							isBuiltin: !!extDesc.isBuiltin,
							isUserBuiltin: !!extDesc.isUserBuiltin,
							isUnderDevelopment: !!extDesc.isUnderDevelopment,
							// main, browser, etc. are already strings or undefined
							// contributes, activationEvents are already in ISerializedExtension
							// engines, keywords, categories, etc.
							// TODO: Ensure all IExtensionDescription fields are correctly populated from ISerializedExtension.
						};
						return description;
					} catch (e: any) {
						this._logError(
							`Failed to process extension description for ${extDesc?.identifier?.value || "unknown"}:`,
							e,
						);
						return null;
					}
				})
				.filter((ext): ext is IExtensionDescription => ext !== null);

			this.#extensionRegistry = new ExtensionDescriptionRegistry(
				_createSimpleReader(),
				allExtensions,
			);
			this._log(
				`Initialized registry with ${this.#extensionRegistry.getAllExtensionDescriptions().length} extensions.`,
			);
			this._onDidRegisterExtensions.fire(); // Fire event after initial registry setup
		}

		// --- Setup Activator Logic ---
		this.#activator = {
			isActivated: (id) =>
				this.#extensionExports.has(id.value) ||
				this.#activationErrors.has(id.value),
			getActivatedExtension: (id) => {
				const activationFailedError = this.#activationErrors.get(
					id.value,
				);
				return {
					activationFailed: !!activationFailedError,
					activationFailedError: activationFailedError || null,
					activationTimes:
						this.#activationTimes.get(id.value) ||
						ExtensionActivationTimes.NONE,
					module: null, // Shim doesn't store raw module here
					exports: this.#extensionExports.get(id.value),
					disposable: { dispose: () => {} }, // NOP disposable
				};
			},
		};
	}

	// --- Shim's own initialization (called by index.ts) ---
	public async initializeMaster(): Promise<void> {
		// Renamed from initialize_shim to avoid conflict
		this._log(
			"Starting master initialization (eager activations, etc.)...",
		);
		if (!this.#extensionRegistry) {
			this._logWarn(
				"Cannot initialize master, extension registry is invalid.",
			);
			return;
		}
		// The original _doHandleExtensionPointsShim was a NOP. In a real scenario,
		// this would involve processing contributions from manifests.
		// this._doHandleExtensionPointsShim(this.#extensionRegistry.getAllExtensionDescriptions());
		await this._handleEagerExtensionsShim();
		this._log("Master initialization finished.");
	}

	// --- IExtHostExtensionService Public API Implementation ---
	public async initialize(): Promise<void> {
		// This is the one called by VS Code's ExtHostMain usually
		// This method in the real ExtHostExtensionService does a lot more, including setting up RPC.
		// For this shim, we assume RPC is set up by index.ts.
		// The primary role here for the shim, if it *were* the real service, would be _initialize.
		// Since this is a shim *of* the service, its main async task is eager activation.
		this._log(
			"IExtHostExtensionService.initialize() called (delegating to master init for eager).",
		);
		return this.initializeMaster();
	}

	public terminate(reason: string): void {
		this._logWarn(
			`IExtHostExtensionService.terminate called: ${reason}. (No-op in shim)`,
		);
	}

	public async getExtension(
		extensionIdString: string,
	): Promise<IExtensionDescription | undefined> {
		if (!this.#extensionRegistry) return undefined;
		const id = new ExtensionIdentifier(extensionIdString);
		return this.#extensionRegistry.getExtensionDescription(id) || undefined;
	}

	public async getExtensions(): Promise<IExtensionDescription[]> {
		if (!this.#extensionRegistry) return Promise.resolve([]);
		return Promise.resolve(
			this.#extensionRegistry.getAllExtensionDescriptions(),
		);
	}

	public isActivated(extensionIdString: string): boolean {
		const id = new ExtensionIdentifier(extensionIdString);
		return this.#activator.isActivated(id);
	}

	public getExtensionExports(extensionIdString: string): any | undefined {
		const id = new ExtensionIdentifier(extensionIdString);
		return this.#extensionExports.get(id.value);
	}

	public async activateById(
		extensionId: ExtensionIdentifier,
		reason: ExtensionActivationReason,
	): Promise<void> {
		// This is the method usually called by other ExtHost services or by the API factory.
		// The `activateByIdWithErrors` was a naming from the original JS. Let's align with `activateById`.
		this._log(
			`activateById: ${extensionId.value}, Reason: ${ActivationKind[reason.activationKind]} (${reason.activationEvent || "API"})`,
		);

		if (this.#activationPromises.has(extensionId.value)) {
			this._log(
				`Activation for ${extensionId.value} already requested/completed, awaiting existing promise.`,
			);
			try {
				const existingActivationResult =
					await this.#activationPromises.get(extensionId.value)!;
				if (existingActivationResult.activationFailed) {
					throw (
						existingActivationResult.activationFailedError ||
						new Error("Previously failed activation.")
					);
				}
				return; // Succeeded or will succeed
			} catch (e: any) {
				this._logError(
					`Re-entrant activation for ${extensionId.value} encountered previous error:`,
					e,
				);
				throw e;
			}
		}

		const activationPromise = this._activateExtensionShim(
			extensionId,
			reason,
		);
		this.#activationPromises.set(extensionId.value, activationPromise);

		try {
			const activationResult = await activationPromise;
			if (activationResult.activationFailed) {
				const errorToThrow =
					activationResult.activationFailedError ||
					new Error(`Activation failed for ${extensionId.value}`);
				if (!this.#activationErrors.has(extensionId.value)) {
					// Ensure error is stored
					this.#activationErrors.set(extensionId.value, errorToThrow);
				}
				this._reportActivationStatus(extensionId); // Report status before throwing
				throw errorToThrow;
			}
			// Success is handled by finally block for reporting
		} catch (error: any) {
			// Error already logged by _activateExtensionShim if it originated there.
			// Ensure it's stored if it's a new error from this level.
			if (!this.#activationErrors.has(extensionId.value)) {
				this.#activationErrors.set(extensionId.value, error);
			}
			// Report status if not already done due to this error.
			if (
				!this.#activationPromises.get(extensionId.value)?.then(
					(res) => res.activationFailed,
					() => true,
				)
			) {
				// Avoid double reporting
				this._reportActivationStatus(extensionId);
			}
			throw error; // Re-throw to the caller
		} finally {
			// Report status on success.
			if (
				!this.#activationErrors.has(extensionId.value) &&
				this.#extensionExports.has(extensionId.value)
			) {
				this._reportActivationStatus(extensionId);
			}
		}
	}

	public async getExtensionRegistry(): Promise<ExtensionDescriptionRegistry> {
		if (!this.#extensionRegistry) {
			this._logWarn(
				"Attempted to get extension registry before it was initialized. Creating empty one.",
			);
			this.#extensionRegistry = new ExtensionDescriptionRegistry(
				_createSimpleReader(),
				[],
			); // Should not happen if constructor ran
		}
		return this.#extensionRegistry!; // Assert not null after check or creation
	}

	public async getExtensionPathIndex(): Promise<{
		findSubstr: (uri: VscodeUri) => IExtensionDescription | undefined;
	}> {
		// Implementation from previous step, seems fine.
		// TODO: Ensure VscodeUri is compatible with internal URI if used for fsPath comparison.
		this._logWarnOnce("getExtensionPathIndex returning basic mock.");
		if (!this.#extensionRegistry) return { findSubstr: () => undefined };
		const extensions =
			this.#extensionRegistry.getAllExtensionDescriptions();
		return {
			findSubstr: (uri: VscodeUri) => {
				if (!uri?.fsPath) return undefined;
				return extensions.find(
					(ext) =>
						ext.extensionLocation?.fsPath &&
						uri.fsPath.startsWith(ext.extensionLocation.fsPath),
				);
			},
		};
	}

	// --- Remote/Web Worker Host stubs (as in original) ---
	public registerRemoteAuthorityResolver = (
		_authorityPrefix: string,
		_resolver: any,
	): IDisposable => {
		this._logWarnOnce(
			"API not implemented: registerRemoteAuthorityResolver",
		);
		return { dispose: () => {} };
	};
	// ... other remote stubs like getRemoteExecServer ...
	public async $resolveAuthority(
		_remoteAuthority: string,
		_resolveAttempt?: number,
	): Promise<any> {
		throw new Error("Not implemented in shim: $resolveAuthority");
	}
	public async $getCanonicalURI(
		_remoteAuthority: string,
		uri: VscodeUri,
	): Promise<VscodeUri> {
		return uri;
	}
	public readonly onDidChangeRemoteConnectionData = VscodeEvent.None;
	public getRemoteConnectionData = () => null;
	public async $setRemoteEnvironment(_env: {
		[key: string]: string | null;
	}): Promise<void> {
		/* No-op */
	}

	// --- RPC Methods called by Main Thread ---
	public async $activateByEvent(
		activationEvent: string,
		activationKind: ActivationKind,
	): Promise<void> {
		this._log(
			`$activateByEvent received: ${activationEvent} (Kind: ${ActivationKind[activationKind]})`,
		);
		// Fire and forget activation attempts for the event
		this._activateByEventShim(activationEvent, activationKind).catch(
			(err) => {
				this._logError(
					`Error during background activation for event '${activationEvent}':`,
					err,
				);
			},
		);
	}

	public async $activate(
		extensionIdRaw: { _lower?: string; value: string } | string,
		reason: ExtensionActivationReason,
	): Promise<boolean> {
		// Ensure extensionId can be revived or is a string
		const idString =
			typeof extensionIdRaw === "string"
				? extensionIdRaw
				: extensionIdRaw.value;
		const extensionId = new ExtensionIdentifier(idString);

		this._log(
			`$activate RPC received for ${extensionId.value}, reason: ${ActivationKind[reason.activationKind]} (${reason.activationEvent})`,
		);
		try {
			await this.activateById(extensionId, reason);
			return true;
		} catch (e: any) {
			this._logError(
				`$activate RPC for ${extensionId.value} failed:`,
				e.message,
			);
			return false;
		}
	}

	// TODO: Implement $deltaExtensions or $startExtensionHost if Mountain uses them to update the extension list.
	// This would involve updating this.#extensionRegistry and potentially triggering re-scans or activations.
	public async $deltaExtensions(delta: {
		removed: string[];
		added: ISerializedExtension[];
	}): Promise<void> {
		this._logWarn("$deltaExtensions RPC received, STUBBED.", delta);
		// 1. Remove extensions: iterate delta.removed, find in registry, remove.
		// 2. Add extensions: iterate delta.added, revive ISerializedExtension, add to registry.
		// 3. Fire this._onDidRegisterExtensions.fire();
		// 4. Potentially re-evaluate eager activations.
	}
	public async $startExtensionHost(delta: {
		removed: ExtensionIdentifier[];
		added: IExtensionDescription[];
	}): Promise<void> {
		this._logWarn("$startExtensionHost RPC received, STUBBED.", delta);
	}

	// --- Shim Internal Helper Logic ---
	protected _reviveUriDto(
		uriDto: UriComponents | undefined,
	): URI | undefined {
		// Input is DTO
		if (!uriDto) return undefined;
		try {
			// URI.revive is designed for VS Code internal URI components which might include $mid
			return URI.revive(uriDto as any); // Cast if UriComponents doesn't perfectly match what URI.revive expects
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO in ExtensionService:",
				uriDto,
				e,
			);
			return undefined;
		}
	}

	protected async _handleEagerExtensionsShim(): Promise<void> {
		this._log("Handling eager extension activations ('*' event)...");
		await this._activateByEventShim("*", ActivationKind.Normal); // Provide a default activationKind
		this._log("Eager activation handling complete.");
	}

	protected async _activateByEventShim(
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
				`Triggering activation for ${candidates.length} extensions on event: '${activationEvent}'`,
			);
			const activationReason: ExtensionActivationReason = {
				startup: activationEvent === "*",
				extensionId: new ExtensionIdentifier("trigger.activationEvent"), // Generic trigger ID
				activationEvent,
				activationKind,
			};
			const promises = candidates.map((desc) =>
				this.activateById(desc.identifier, {
					...activationReason,
					extensionId: desc.identifier,
				}).catch((err: any) => {
					this._logError(
						`Background activation failed for ${desc.identifier.value} on event '${activationEvent}':`,
						err.message,
					);
				}),
			);
			await Promise.allSettled(promises); // Wait for all to attempt, regardless of individual success/failure
		}
	}

	protected async _activateExtensionShim(
		extensionId: ExtensionIdentifier,
		reason: ExtensionActivationReason,
	): Promise<ActivatedExtension> {
		const desc =
			this.#extensionRegistry?.getExtensionDescription(extensionId);
		if (!desc) {
			const error = new Error(
				`Extension description not found: ${extensionId.value}`,
			);
			this.#activationErrors.set(extensionId.value, error); // Store error
			throw error;
		}
		this._log(
			`Attempting to activate: ${desc.identifier.value} (reason: ${ActivationKind[reason.activationKind]})`,
		);

		// Check proposed API access
		let enabledProposalsSource =
			this.#initData.environment.extensionEnabledProposedApi;
		let enabledProposalsArray: string[] = [];
		if (Array.isArray(enabledProposalsSource)) {
			enabledProposalsArray = enabledProposalsSource;
		} else if (
			typeof enabledProposalsSource === "object" &&
			enabledProposalsSource !== null
		) {
			// Handle IEnabledApiProposals { [extensionId: string]: string[] }
			const specificProposals = (
				enabledProposalsSource as IEnabledApiProposals
			)[extensionId.value];
			if (Array.isArray(specificProposals)) {
				enabledProposalsArray = specificProposals;
			}
			// Also consider '*' for globally enabled proposals if the structure supports it
			const globalProposals = (
				enabledProposalsSource as IEnabledApiProposals
			)["*"];
			if (Array.isArray(globalProposals)) {
				enabledProposalsArray = [
					...new Set([...enabledProposalsArray, ...globalProposals]),
				];
			}
		}

		const canUseProposed = checkProposedApiEnabled(
			desc,
			enabledProposalsArray,
		);
		if (
			desc.enabledApiProposals &&
			desc.enabledApiProposals.length > 0 &&
			!canUseProposed
		) {
			this._logWarn(
				`Extension '${desc.identifier.value}' requests proposed API ([${desc.enabledApiProposals.join(", ")}]) but is NOT ENABLED for them. Activation proceeds, but API calls may fail.`,
			);
		}

		const entryPoint = this._getEntryPointShim(desc);
		const activationTimesBuilder = new ExtensionActivationTimesBuilder(
			reason.startup,
		);

		if (!entryPoint) {
			this._log(
				`Extension ${desc.identifier.value} has no main/browser/worker entry point. Activating as EmptyExtension.`,
			);
			const times = activationTimesBuilder.build();
			this.#activationTimes.set(desc.identifier.value, times);
			return new EmptyExtension(times);
		}

		this._log(
			`Loading entry point '${entryPoint}' for ${desc.identifier.value} from ${desc.extensionLocation.fsPath}`,
		);
		let extensionModule: ExtensionModule | undefined;
		let context: CocoonExtensionContext | undefined;

		try {
			const modulePath = path.join(
				desc.extensionLocation.fsPath,
				entryPoint.endsWith(".js") ? entryPoint : `${entryPoint}.js`,
			);
			activationTimesBuilder.codeLoadingStart();
			extensionModule = require(modulePath) as ExtensionModule; // Node.js require
			activationTimesBuilder.codeLoadingStop();
			this._log(`Module loaded for ${desc.identifier.value}.`);

			context = await this._loadExtensionContextShim(desc);
			this._log(
				`ExtensionContext prepared for ${desc.identifier.value}.`,
			);

			let activationResult: any = undefined;
			if (typeof extensionModule?.activate === "function") {
				activationTimesBuilder.activateCallStart();
				this._log(`Calling activate() for ${desc.identifier.value}...`);
				activationResult = await Promise.resolve(
					extensionModule.activate.apply(globalThis, [context]),
				);
				activationTimesBuilder.activateCallStop();
				activationTimesBuilder.activateResolveStart(); // Assume resolve is instant
				activationTimesBuilder.activateResolveStop();
				this._log(
					`activate() finished for ${desc.identifier.value}. Exports type: ${typeof activationResult}`,
				);
			} else {
				this._logWarn(
					`Extension ${desc.identifier.value} has entry point but no activate() function.`,
				);
				activationTimesBuilder.activateCallStop();
				activationTimesBuilder.activateResolveStop();
			}

			this.#extensionExports.set(desc.identifier.value, activationResult);
			const activationTimes = activationTimesBuilder.build();
			this.#activationTimes.set(desc.identifier.value, activationTimes);
			// No error stored if successful up to this point
			this.#activationErrors.delete(desc.identifier.value);

			return {
				activationFailed: false,
				activationFailedError: null,
				activationTimes,
				module: extensionModule || {},
				exports: activationResult,
				disposable: {
					dispose: () => {
						if (typeof extensionModule?.deactivate === "function") {
							this._log(
								`Calling deactivate() for ${desc.identifier.value}...`,
							);
							Promise.resolve(
								extensionModule.deactivate!(),
							).catch((e: any) =>
								this._logError(
									`Error in deactivate of ${desc.identifier.value}:`,
									e,
								),
							);
						}
						if (context?.subscriptions) {
							this._log(
								`Disposing ${context.subscriptions.length} subscriptions for ${desc.identifier.value}.`,
							);
							dispose(context.subscriptions); // VS Code's dispose helper
						}
					},
				},
			};
		} catch (error: any) {
			this._logError(
				`FAILED to load/activate ${desc.identifier.value}:`,
				error,
			);
			// Store error for future re-entrant checks and for getActivatedExtension
			this.#activationErrors.set(desc.identifier.value, error);
			return {
				activationFailed: true,
				activationFailedError: error,
				activationTimes: activationTimesBuilder.build(), // Timings up to failure
				module: extensionModule || {},
				exports: undefined,
				disposable: { dispose: () => {} },
			};
		}
	}

	protected async _loadExtensionContextShim(
		desc: IExtensionDescription,
	): Promise<CocoonExtensionContext> {
		this._log(`Loading ExtensionContext for ${desc.identifier.value}`);
		if (!global.cocoonInstantiationService) {
			throw new Error(
				"Cannot load ExtensionContext: InstantiationService (global.cocoonInstantiationService) not available!",
			);
		}
		const instantiationService = global.cocoonInstantiationService;

		// These are service IDs (decorators)
		const extHostStorageId = IExtHostStorage; // Assuming IExtHostStorage is the service identifier
		const extHostStoragePathsId = IExtensionStoragePaths;
		const extHostSecretsId = IExtHostSecrets;
		const extHostTerminalId = IExtHostTerminalService;
		const extHostLangModelsId = IExtHostLanguageModels;
		// const extHostCommandsId = IExtHostCommands; // For extension.exports.executeCommand
		// const extHostConfigId = IExtHostConfiguration; // For config access within context

		const storageService = instantiationService.invokeFunction((accessor) =>
			accessor.get<IExtHostStorage>(extHostStorageId),
		);
		const globalState = storageService.createMemento(
			desc.identifier.value,
			true,
		); // isGlobal = true
		const workspaceState = storageService.createMemento(
			desc.identifier.value,
			false,
		); // isGlobal = false

		const storagePathsService = instantiationService.invokeFunction(
			(accessor) =>
				accessor.get<IExtensionStoragePaths>(extHostStoragePathsId),
		);
		const storageUri = storagePathsService.workspaceValue(desc); // Uri | undefined
		const globalStorageUri = storagePathsService.globalValue(desc); // Uri (should always be defined)

		let secretsApi: SecretStorage;
		try {
			secretsApi = instantiationService.invokeFunction((accessor) =>
				accessor.get<IExtHostSecrets>(extHostSecretsId),
			) as SecretStorage; // Cast if IExtHostSecrets is the service and SecretStorage is the API shape
		} catch (e) {
			this._logWarn(
				`IExtHostSecrets service not found for ${desc.identifier.value}, providing NOP SecretStorage. Error: ${e}`,
			);
			secretsApi = {
				get: () => Promise.resolve(undefined),
				store: () => Promise.resolve(),
				delete: () => Promise.resolve(),
				onDidChange: VscodeEvent.None,
			};
		}

		const logPathUri = URI.joinPath(
			this._reviveUriDto(this.#initData.logsLocation)!,
			`${desc.identifier.value}.log`,
		);

		let termEnvCollection: EnvironmentVariableCollection;
		try {
			const terminalService = instantiationService.invokeFunction(
				(accessor) =>
					accessor.get<IExtHostTerminalServiceShape>(
						extHostTerminalId,
					),
			);
			termEnvCollection =
				terminalService.getEnvironmentVariableCollection(
					this._createExtensionApiObjectShim(desc) as any,
				); // Cast to any if type mismatch
		} catch (e) {
			this._logWarn(
				`IExtHostTerminalService not found for ${desc.identifier.value}, providing NOP EnvironmentVariableCollection. Error: ${e}`,
			);
			termEnvCollection = {
				persistent: true,
				replace: () => {},
				append: () => {},
				prepend: () => {},
				get: () => undefined,
				forEach: () => {},
				delete: () => {},
				clear: () => {},
				[Symbol.iterator]: function* () {},
			} as EnvironmentVariableCollection;
		}

		await Promise.all([
			(globalState as Memento).whenReady,
			(workspaceState as Memento).whenReady,
		]); // Ensure Mementos are ready

		const context: CocoonExtensionContext = {
			subscriptions: [],
			globalState: globalState as Memento, // Cast if createMemento returns internal type
			workspaceState: workspaceState as Memento,
			secrets: secretsApi,
			extensionUri: VscodeUri.from(desc.extensionLocation), // Convert internal URI to vscode.Uri
			extensionPath: desc.extensionLocation.fsPath,
			environmentVariableCollection: termEnvCollection,
			asAbsolutePath: (relativePath) =>
				path.join(desc.extensionLocation.fsPath, relativePath),
			storageUri: storageUri ? VscodeUri.from(storageUri) : undefined,
			storagePath: storageUri?.fsPath,
			globalStorageUri: VscodeUri.from(globalStorageUri),
			globalStoragePath: globalStorageUri.fsPath,
			logUri: VscodeUri.from(logPathUri),
			logPath: logPathUri.fsPath,
			extensionMode: desc.isUnderDevelopment
				? ExtensionMode.Development
				: ExtensionMode.Production,
			extension: this._createExtensionApiObjectShim(
				desc,
			) as Extension<any>, // Cast to vscode.Extension<any>
			extensionRuntime: ExtensionRuntime.Node, // Cocoon runs in Node.js
			// TODO: Implement other ExtensionContext properties like globalEffect, workspaceEffect, etc.
			// These are related to state synchronization and might be complex.
		};
		return Object.freeze(context);
	}

	protected _getEntryPointShim(
		desc: IExtensionDescription,
	): string | undefined {
		// Check 'main' (Node), then 'browser' (Web), then 'worker' (Web Worker)
		// VS Code resolution order might be more complex (e.g. based on host type)
		if (typeof desc.main === "string")
			return desc.main.replace(/\.js$/, "");
		if (typeof desc.browser === "string") {
			this._logWarn(
				`Using 'browser' field as entry point for Node-based shim ${desc.identifier.value}: ${desc.browser}`,
			);
			return desc.browser.replace(/\.js$/, "");
		}
		if (typeof (desc as any).worker === "string") {
			// worker might not be on IExtensionDescription
			this._logWarn(
				`Using 'worker' field as entry point for Node-based shim ${desc.identifier.value}: ${(desc as any).worker}`,
			);
			return (desc as any).worker.replace(/\.js$/, "");
		}
		return undefined;
	}

	protected _createExtensionApiObjectShim(
		desc: IExtensionDescription,
	): Extension<any> {
		// Return vscode.Extension<any>
		const extensionService = this; // Capture `this`
		const extensionApiObject: Extension<any> = {
			get id() {
				return desc.identifier.value;
			},
			get extensionUri() {
				return VscodeUri.from(desc.extensionLocation);
			}, // Convert internal URI
			get extensionPath() {
				return desc.extensionLocation.fsPath;
			},
			get isActive() {
				return extensionService.isActivated(desc.identifier.value);
			},
			get packageJSON() {
				return desc as any;
			}, // Cast as IRelaxedExtensionDescription might be needed if fields differ
			get extensionKind() {
				// Determine based on initData and potentially desc.extensionKind
				// return desc.extensionKind ?? (this.#initData.remote?.isRemote ? ExtensionKind.Workspace : ExtensionKind.UI);
				// A simpler approach for Cocoon (local process host):
				return ExtensionKind.Workspace; // Or UI if it hosts UI extensions
			},
			get exports() {
				return extensionService.getExtensionExports(
					desc.identifier.value,
				);
			},
			activate: async (): Promise<any> => {
				if (!extensionService.isActivated(desc.identifier.value)) {
					// Reason for direct activation via API
					const reason: ExtensionActivationReason = {
						startup: false,
						extensionId: desc.identifier,
						activationEvent: `extension.activate()`, // Generic reason
						activationKind: ActivationKind.Api,
					};
					await extensionService.activateById(
						desc.identifier,
						reason,
					);
				}
				return extensionService.getExtensionExports(
					desc.identifier.value,
				);
			},
			// TODO: Add contributes if needed and if IExtensionDescription has it in a usable format
			// get contributes() { return desc.contributes; }
		};
		return Object.freeze(extensionApiObject);
	}

	protected _reportActivationStatus(extensionId: ExtensionIdentifier): void {
		const status = this.#activator.getActivatedExtension(extensionId);
		if (!status) {
			this._logError(
				`Could not get activation status for ${extensionId.value} to report.`,
			);
			return;
		}
		this._log(
			`Reporting activation status for ${extensionId.value}: success=${!status.activationFailed}`,
		);
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
			activationTimes: status.activationTimes, // Ensure this is serializable
		}).catch((e: any) =>
			this._logError(
				`Failed to report activation status for ${extensionId.value}:`,
				e,
			),
		);
	}
}

// Helper for ExtensionDescriptionRegistry (simplified)
function _createSimpleReader(): IExtensionPointUser<any>[] {
	// This needs to return an array of objects that conform to IExtensionPointUser.
	// The key part is providing a way for the registry to read activationEvents.
	return [
		{
			// Minimal IExtensionPointUser, focusing on what ExtensionDescriptionRegistry uses for activation events
			name: "activationEventsReader", // Arbitrary name for the user
			description: {
				name: "cocoon-shim-activation-reader",
				version: "0.0.1",
				publisher: "cocoon-internal",
			}, // Mock description
			read: (desc: IExtensionDescription) => desc.activationEvents || [], // Actual reader function
			এদিকে: (collector, desc) => {
				/* NOP for ' এদিকে' (accept) */
			},
		},
	] as any[]; // Cast if the simple object doesn't fully match IExtensionPointUser
}
// --- END OF FILE extension-service-shim.ts ---
