/*---------------------------------------------------------------------------------------------
 * Cocoon Shim for IExtHostExtensionService (extension-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a *simulated* implementation of the VS Code IExtHostExtensionService interface
 * for the Cocoon sidecar environment (Path B approach).
 *
 * **NOTE:** In Path A (using the real VS Code code), this shim file is NOT used at runtime.
 * Instead, the real `ExtHostExtensionService` is instantiated via DI, and Mountain provides
 * shims for its *dependencies* (like IExtHostRpcService, IExtHostStorage, etc.).
 * This file represents the logic needed if simulating the service itself.
 *
 * Responsibilities (when used as a shim):
 * - Managing a registry of known extensions (received from Mountain via initData).
 * - Handling extension activation requests triggered by events or direct calls.
 * - Loading extension code (using Node.js `require`) from the filesystem path provided
 *   in the extension description.
 * - Executing the `activate` function of the loaded extension module.
 * - Providing a shimmed `ExtensionContext` object to the `activate` function, populated
 *   with other shimmed services (Storage, Secrets, Config, etc.) obtained via DI.
 * - Tracking activation status, timings, errors, and exported APIs.
 * - Communicating activation status/errors back to Mountain via IPC.
 *--------------------------------------------------------------------------------------------*/

// For internal eventing if needed (not directly used for public API events)
import { EventEmitter } from "events";
import * as path from "path";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
	// For public API events
} from "vs/base/common/event";
import { dispose, IDisposable } from "vs/base/common/lifecycle";
// --- VS Code Internal Module Imports (need bundling/availability) ---
import {
	ExtensionIdentifier,
	IExtensionDescription,
	// Assuming initData provides this structure
	ISerializedExtension,
} from "vs/platform/extensions/common/extensions";
// For ExtensionContext.secrets.get/store (often uses commands)
import { IExtHostCommands } from "vs/workbench/api/common/extHostCommands";
// Used by ExtensionContext
import { IExtHostConfiguration } from "vs/workbench/api/common/extHostConfiguration";
import {
	// Type for the result of _activateExtensionShim
	ActivatedExtension,
	EmptyExtension,
	// Type for the reason parameter
	ExtensionActivationReason,
	ExtensionActivationTimes,
	ExtensionActivationTimesBuilder,
} from "vs/workbench/api/common/extHostExtensionActivator";
import { IExtHostSecrets } from "vs/workbench/api/common/extHostSecrets";
// --- Shimmed Service Interfaces (dependencies obtained via Cocoon's DI) ---
import {
	IExtHostMementoService,
	IExtHostStorage,
	// IExtHostMementoService might be closer to what createMemento needs
} from "vs/workbench/api/common/extHostStorage";
import { IExtensionStoragePaths } from "vs/workbench/api/common/extHostStoragePaths";
import {
	IExtHostTerminalService,
	IExtHostTerminalServiceShape,
	// For env var collection
} from "vs/workbench/api/common/extHostTerminalService";
import {
	ExtensionDescriptionRegistry,
	// For _createSimpleReader
	IExtensionPointUser,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry";
import { checkProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";

// For reporting activation status
import { sendNotificationToMountain } from "../cocoon-ipc";
// Assume shimmed or real vscode.Uri
import { Uri } from "../Shim/out/vscode";
// IExtHostRpcService not directly used by this shim's constructor
import { BaseCocoonShim, ILogService } from "./_baseShim";

// Add other necessary service interfaces for ExtensionContext

// --- Type Definitions ---

// Structure of initData relevant to this shim
interface ShimInitData {
	extensions?: {
		// Or IExtensionDescription if already revived
		allExtensions: ISerializedExtension[];
	};

	environment: {
		extensionEnabledProposedApi?: string[];

		appRoot?: {
			fsPath: string;

			scheme?: string;

			authority?: string;

			path?: string;

			query?: string;

			fragment?: string;

			external?: string;

			// UriComponents
		};

		appName?: string;

		appHost?: string;

		appUriScheme?: string;

		appLanguage?: string;

		isTrusted?: boolean;

		// ... other env properties
	};

	// UriComponents
	logsLocation?: { fsPath: string };

	machineId?: string;

	sessionId?: string;

	remote?: { isRemote?: boolean };

	// ... other initData properties
}

// For ExtensionContext
interface ShimExtensionContext {
	subscriptions: IDisposable[];

	// Should be vscode.Memento
	globalState: any;

	// Should be vscode.Memento
	workspaceState: any;

	// Should be vscode.SecretStorage
	secrets: any;

	extensionUri: Uri;

	extensionPath: string;

	// Should be vscode.EnvironmentVariableCollection
	environmentVariableCollection: any;

	asAbsolutePath(relativePath: string): string;

	storageUri: Uri | undefined;

	storagePath: string | undefined;

	globalStorageUri: Uri;

	globalStoragePath: string;

	logUri: Uri;

	logPath: string;

	// vscode.ExtensionMode
	extensionMode: number;

	// The vscode.Extension object
	extension: ShimVscodeExtension;

	// vscode.ExtensionRuntime
	extensionRuntime: number;
}

// For the vscode.Extension object provided in ExtensionContext
interface ShimVscodeExtension {
	readonly id: string;

	readonly extensionUri: Uri;

	readonly extensionPath: string;

	readonly isActive: boolean;

	readonly packageJSON: IExtensionDescription;

	// vscode.ExtensionKind
	readonly extensionKind: number;

	exports: any;

	activate(): Promise<any>;
}

// For the activator internal logic
interface ShimActivator {
	isActivated: (id: ExtensionIdentifier) => boolean;

	getActivatedExtension: (
		id: ExtensionIdentifier,

		// Allow undefined if not found
	) => ActivatedExtension | undefined;
}

// For RPC methods (called by MainThread)
interface ExtHostExtensionServiceShape {
	$startExtensionHost(delta: {
		removed: ExtensionIdentifier[];

		added: IExtensionDescription[];
	}): Promise<void>;

	$activateByEvent(
		activationEvent: string,

		activationKind: number /*ActivationKind*/,
	): Promise<void>;

	$activate(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<boolean>;

	$deltaExtensions(delta: {
		removed: ExtensionIdentifier[];

		added: IExtensionDescription[];
	}): Promise<void>;

	// For remote/web worker parts (not fully implemented in shim)
	$resolveAuthority(
		remoteAuthority: string,

		resolveAttempt: number,
	): Promise<any>;

	$getCanonicalURI(remoteAuthority: string, uri: Uri): Promise<Uri>;

	$setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void>;
}

// Global instantiation service (assume it's set elsewhere)
declare var cocoonInstantiationService: {
	invokeFunction<T>(
		callback: (accessor: { get: <Svc>(id: any) => Svc }) => T,
	): T;
};

export class ShimExtHostExtensionService
	extends BaseCocoonShim
	implements ExtHostExtensionServiceShape
{
	public readonly _serviceBrand: undefined;

	readonly #initData: ShimInitData;

	// Shim instance
	readonly #configService?: IExtHostConfiguration;

	#extensionRegistry: ExtensionDescriptionRegistry | null = null;

	readonly #activator: ShimActivator;

	// Key: id.value
	readonly #activationTimes = new Map<string, ExtensionActivationTimes>();

	// Key: id.value
	readonly #extensionExports = new Map<string, any>();

	// Key: id.value
	readonly #activationErrors = new Map<string, Error>();

	readonly #activationStarted = new Map<
		string,
		Promise<ActivatedExtension>
		// Key: id.value, tracks pending activations
	>();

	constructor(
		initData: ShimInitData,

		logService: ILogService | undefined,

		configService?: IExtHostConfiguration,
	) {
		super(
			"ExtHostExtensionService",

			undefined /* rpcService not directly used */,

			logService,
		);

		this.#initData = initData;

		this.#configService = configService;

		this._log("Initializing...");

		if (!initData?.extensions?.allExtensions) {
			this._logError(
				"Initialization failed: Missing extensions data in initData.",
			);

			this.#extensionRegistry = new ExtensionDescriptionRegistry(
				_createSimpleReader(),

				[],
			);
		} else {
			const allExtensions = initData.extensions.allExtensions
				.map((extDesc): IExtensionDescription | null => {
					// Ensure extDesc matches ISerializedExtension
					try {
						const revivedIdentifier = ExtensionIdentifier.revive(
							extDesc.identifier,
						);

						if (!revivedIdentifier) {
							this._logError(
								`Failed to revive extension identifier for raw: ${JSON.stringify(extDesc.identifier)}`,
							);

							return null;
						}

						const revivedLocation = this._reviveUri(
							extDesc.extensionLocation as any /* UriComponents */,
						);

						if (!revivedLocation) {
							this._logError(
								`Failed to revive extension location for ${revivedIdentifier.value}`,
							);

							return null;
						}

						return {
							...extDesc,

							identifier: revivedIdentifier,

							extensionLocation: revivedLocation,

							// Ensure all fields of IExtensionDescription are present or correctly defaulted
							isBuiltin: extDesc.isBuiltin || false,

							isUserBuiltin: extDesc.isUserBuiltin || false,

							isUnderDevelopment:
								extDesc.isUnderDevelopment || false,

							// etc. for all IExtensionDescription fields
							// Cast after ensuring all fields
						} as IExtensionDescription;
					} catch (e: any) {
						this._logError(
							`Failed to revive extension description for ${extDesc?.identifier?.value}:`,

							e,
						);

						return null;
					}
				})
				// Type guard
				.filter((ext): ext is IExtensionDescription => ext !== null);

			this.#extensionRegistry = new ExtensionDescriptionRegistry(
				_createSimpleReader(),

				allExtensions,
			);

			this._log(
				`Initialized registry with ${this.#extensionRegistry.getAllExtensionDescriptions().length} extensions.`,
			);
		}

		this.#activator = {
			isActivated: (id) =>
				this.#extensionExports.has(id.value) ||
				this.#activationErrors.has(id.value),

			getActivatedExtension: (id) => {
				const activationFailed = this.#activationErrors.has(id.value);

				const activationFailedError = this.#activationErrors.get(
					id.value,
				);

				return {
					activationFailed: activationFailed,

					// Ensure null if undefined
					activationFailedError: activationFailedError || null,

					activationTimes:
						this.#activationTimes.get(id.value) ||
						ExtensionActivationTimes.NONE,

					// Shim doesn't easily store raw module here for this getter
					module: null,

					exports: this.#extensionExports.get(id.value),

					disposable: {
						dispose: () => {
							/* No-op for shim */
						},
					},
				};
			},
		};
	}

	public async initialize_shim(): Promise<void> {
		this._log("Starting initialize_shim...");

		if (!this.#extensionRegistry) {
			this._logWarn(
				"Cannot initialize shim, extension registry is invalid.",
			);

			return;
		}

		this._doHandleExtensionPointsShim(
			this.#extensionRegistry.getAllExtensionDescriptions(),
		);

		await this._handleEagerExtensionsShim();

		this._log("initialize_shim finished.");
	}

	public async initialize(): Promise<void> {
		return this.initialize_shim();
	}

	public terminate(reason: string): void {
		this._logWarn(`Terminate called: ${reason}`);
	}

	public async getExtension(
		extensionIdString: string,
	): Promise<IExtensionDescription | undefined> {
		if (!this.#extensionRegistry) return undefined;

		const id = new ExtensionIdentifier(extensionIdString);

		// Ensure undefined if not found
		return this.#extensionRegistry.getExtensionDescription(id) || undefined;
	}

	public getExtensions(): Promise<IExtensionDescription[]> {
		if (!this.#extensionRegistry) return Promise.resolve([]);

		return Promise.resolve(
			this.#extensionRegistry.getAllExtensionDescriptions(),
		);
	}

	public isActivated(extensionIdString: string): boolean {
		if (!this.#activator) return false;

		const id = new ExtensionIdentifier(extensionIdString);

		return this.#activator.isActivated(id);
	}

	public getExtensionExports(extensionIdString: string): any | undefined {
		if (!this.#extensionExports) return undefined;

		const id = new ExtensionIdentifier(extensionIdString);

		return this.#extensionExports.get(id.value);
	}

	public async activateByIdWithErrors(
		extensionIdString: string,

		reason: ExtensionActivationReason,
	): Promise<void> {
		const id = new ExtensionIdentifier(extensionIdString);

		this._log(
			`Activation requested: ${id.value}, Reason: ${reason.activationEvent || "API"}`,
		);

		// Check if activation is already in progress or completed
		if (this.#activationStarted.has(id.value)) {
			this._log(
				`Activation already in progress or completed for ${id.value}, awaiting existing result.`,
			);

			try {
				const existingActivation = await this.#activationStarted.get(
					id.value,
				);

				if (existingActivation?.activationFailed) {
					throw (
						existingActivation.activationFailedError ||
						new Error("Previously failed activation.")
					);
				}

				// If it succeeded or is in progress and will succeed, this await handles it.
				return;
			} catch (e: any) {
				this._logError(
					`Re-entrant activation for ${id.value} encountered previous error:`,

					e,
				);

				// Rethrow previous error
				throw e;
			}
		}

		const activationPromise = this._activateExtensionShim(id, reason);

		// Store the promise
		this.#activationStarted.set(id.value, activationPromise);

		try {
			const activationResult = await activationPromise;

			if (activationResult.activationFailed) {
				this._logError(`Activation failed for ${id.value}.`);

				this.#activationErrors.set(
					id.value,

					activationResult.activationFailedError ||
						new Error("Unknown activation error"),
				);

				throw (
					activationResult.activationFailedError ||
					new Error("Unknown activation error")
				);
			} else {
				this._log(`Activation successful for ${id.value}.`);
			}
		} catch (error: any) {
			this._logError(`Activation threw error for ${id.value}:`, error);

			if (!this.#activationErrors.has(id.value)) {
				this.#activationErrors.set(id.value, error);
			}

			// Report status before re-throwing
			this._reportActivationStatus(id);

			throw error;
		} finally {
			// Report status if not already done in catch block (i.e., on success)
			if (!this.#activationErrors.has(id.value)) {
				this._reportActivationStatus(id);
			}

			// Do not remove from #activationStarted here, as other callers might still be awaiting it.
			// Consider a more robust mechanism if activations can be cancelled or retried.
		}
	}

	public async getExtensionRegistry(): Promise<ExtensionDescriptionRegistry> {
		if (!this.#extensionRegistry) {
			throw new Error("Extension registry not initialized");
		}

		return this.#extensionRegistry;
	}

	public async getExtensionPathIndex(): Promise<{
		findSubstr: (uri: Uri) => IExtensionDescription | undefined;
	}> {
		this._logWarnOnce("getExtensionPathIndex returning basic mock.");

		if (!this.#extensionRegistry) return { findSubstr: () => undefined };

		const extensions =
			this.#extensionRegistry.getAllExtensionDescriptions();

		return {
			findSubstr: (uri: Uri) => {
				if (!uri?.fsPath) return undefined;

				return extensions.find(
					(ext) =>
						ext.extensionLocation?.fsPath &&
						uri.fsPath.startsWith(ext.extensionLocation.fsPath),
				);
			},
		};
	}

	// --- Remote/Web Worker Host stubs ---
	public registerRemoteAuthorityResolver = (
		authorityPrefix: string,

		resolver: any,
	): IDisposable => {
		this._logWarnOnce(
			"API not implemented: registerRemoteAuthorityResolver",
		);

		return { dispose: () => {} };
	};

	// getRemoteExecServer and other remote methods remain stubs
	public async $resolveAuthority(
		remoteAuthority: string,

		resolveAttempt: number,
	): Promise<any> {
		throw new Error("Not implemented in shim: $resolveAuthority");
	}

	public async $getCanonicalURI(
		remoteAuthority: string,

		uri: Uri,
	): Promise<Uri> {
		return uri;
	}

	public readonly onDidChangeRemoteConnectionData = VscodeEvent.None;

	public getRemoteConnectionData = () => null;

	public async $setRemoteEnvironment(env: {
		[key: string]: string | null;
	}): Promise<void> {
		/* No-op */
	}

	// --- RPC Methods called by Main Thread ---
	public async $startExtensionHost(delta: {
		removed: ExtensionIdentifier[];

		added: IExtensionDescription[];
	}): Promise<void> {
		this._logWarn(
			"$startExtensionHost delta received, basic handling implemented.",

			delta,
		);

		// TODO: Implement delta processing for this.#extensionRegistry
		return Promise.resolve();
	}

	public async $activateByEvent(
		activationEvent: string,

		activationKind: number,
	): Promise<void> {
		this._log(
			`$activateByEvent received: ${activationEvent} (Kind: ${activationKind})`,
		);

		// Do not await here, let it run in background
		this._activateByEventShim(activationEvent, activationKind).catch(
			(err) => {
				this._logError(
					`Error during background activation for event ${activationEvent}:`,

					err,
				);
			},
		);

		return Promise.resolve();
	}

	public async $activate(
		extensionIdRaw: { _lower: string; value: string },

		reason: ExtensionActivationReason,
	): Promise<boolean> {
		const extensionId = ExtensionIdentifier.revive(extensionIdRaw);

		if (!extensionId) {
			this._logError(
				`$activate received invalid extensionId:`,

				extensionIdRaw,
			);

			return false;
		}

		this._log(
			`$activate received for ${extensionId.value}, reason: ${reason?.activationEvent}`,
		);

		try {
			await this.activateByIdWithErrors(extensionId.value, reason);

			return true;
		} catch (e) {
			return false;
		}
	}

	public async $deltaExtensions(delta: {
		removed: ExtensionIdentifier[];

		added: IExtensionDescription[];
	}): Promise<void> {
		this._logWarn(
			"$deltaExtensions received, basic handling implemented.",

			delta,
		);

		// TODO: Implement delta processing
		return Promise.resolve();
	}

	// --- Shim Internal Helper Logic ---
	protected _reviveUri(
		uriComponents:
			| {
					scheme: string;

					path: string;

					fsPath?: string;

					external?: string;

					[key: string]: any;
			  }
			| undefined,
	): Uri | undefined {
		if (!uriComponents) return undefined;

		try {
			// Uri.revive is more robust if uriComponents has $mid and other VS Code specific marshalling aids
			// If uriComponents is just {scheme, path, ...} Uri.parse or Uri.from might be better
			// Prefer fsPath if available
			if (uriComponents.fsPath) return Uri.file(uriComponents.fsPath);

			// Cast as any if it's just plain components
			return Uri.from(uriComponents as any);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI components:",

				uriComponents,

				e,
			);

			return undefined;
		}
	}

	protected _doHandleExtensionPointsShim(
		extensions: ReadonlyArray<IExtensionDescription>,
	): void {
		this._log(
			`Simulating processing extension points for ${extensions.length} extensions (No-op).`,
		);
	}

	protected async _handleEagerExtensionsShim(): Promise<void> {
		this._log("Handling eager extension activations (*)...");

		// Provide a default activationKind
		await this._activateByEventShim("*", 0 /* ActivationKind.Normal */);

		this._log("Eager activation handling complete.");
	}

	protected async _activateByEventShim(
		activationEvent: string,

		activationKind: number,
	): Promise<void> {
		if (!this.#extensionRegistry) return Promise.resolve();

		const candidates =
			this.#extensionRegistry.getExtensionDescriptionsForActivationEvent(
				activationEvent,
			);

		if (candidates.length > 0) {
			this._log(
				`Triggering activation for ${candidates.length} extensions on event: ${activationEvent}`,
			);

			const promises = candidates.map((desc) =>
				this.activateByIdWithErrors(desc.identifier.value, {
					startup: activationEvent === "*",

					extensionId: desc.identifier,

					activationEvent,

					activationKind: activationKind,
				}).catch((err: any) => {
					this._logError(
						`Background activation failed for ${desc.identifier.value} on event ${activationEvent}: ${err.message}`,
					);
				}),
			);

			await Promise.allSettled(promises);
		}
	}

	protected async _activateExtensionShim(
		extensionId: ExtensionIdentifier,

		reason: ExtensionActivationReason,
	): Promise<ActivatedExtension> {
		const desc =
			this.#extensionRegistry?.getExtensionDescription(extensionId);

		if (!desc) {
			throw new Error(
				`Extension description not found: ${extensionId.value}`,
			);
		}

		if (this.#extensionExports.has(extensionId.value)) {
			this._log(`Extension ${extensionId.value} is already activated.`);

			// Assert not undefined
			return this.#activator.getActivatedExtension(extensionId)!;
		}

		if (this.#activationErrors.has(extensionId.value)) {
			this._log(
				`Extension ${extensionId.value} previously failed activation.`,
			);

			throw this.#activationErrors.get(extensionId.value);
		}

		const proposedApiAccess =
			this.#initData.environment.extensionEnabledProposedApi || [];

		const canUseProposed = checkProposedApiEnabled(desc, proposedApiAccess);

		if (
			desc.enabledApiProposals &&
			desc.enabledApiProposals.length > 0 &&
			!canUseProposed
		) {
			this._logError(
				`Extension '${extensionId.value}' CANNOT use proposed API (${desc.enabledApiProposals.join(", ")})`,
			);
		}

		const entryPoint = this._getEntryPointShim(desc);

		const activationTimesBuilder = new ExtensionActivationTimesBuilder(
			reason.startup,
		);

		if (!entryPoint) {
			this._log(
				`Extension ${extensionId.value} has no main/browser entry point. Activating as EmptyExtension.`,
			);

			const times = activationTimesBuilder.build();

			this.#activationTimes.set(extensionId.value, times);

			return new EmptyExtension(times);
		}

		this._log(
			`Attempting to load entry point '${entryPoint}' for ${extensionId.value}`,
		);

		let extensionModule:
			| { activate?: Function; deactivate?: Function }

			// Type for the loaded module
			| undefined;

		let context: ShimExtensionContext | undefined;

		try {
			const modulePath = path.join(
				desc.extensionLocation.fsPath,

				entryPoint.endsWith(".js") ? entryPoint : `${entryPoint}.js`,
			);

			activationTimesBuilder.codeLoadingStart();

			// Node.js require
			extensionModule = require(modulePath);

			activationTimesBuilder.codeLoadingStop();

			this._log(`Module loaded successfully for ${extensionId.value}.`);

			context = await this._loadExtensionContextShim(desc);

			this._log(`ExtensionContext prepared for ${extensionId.value}.`);

			let activationResult: any;

			if (typeof extensionModule?.activate === "function") {
				activationTimesBuilder.activateCallStart();

				this._log(
					`Calling activate() function for ${extensionId.value}...`,
				);

				activationResult = await Promise.resolve(
					extensionModule.activate.apply(globalThis, [context]),
				);

				activationTimesBuilder.activateCallStop();

				// Assume resolve is instant for shim
				activationTimesBuilder.activateResolveStart();

				activationTimesBuilder.activateResolveStop();

				this._log(
					`activate() function finished for ${extensionId.value}.`,
				);
			} else {
				this._logWarn(
					`Extension ${extensionId.value} has an entry point but no activate() function.`,
				);

				activationTimesBuilder.activateCallStop();

				activationTimesBuilder.activateResolveStop();
			}

			this.#extensionExports.set(extensionId.value, activationResult);

			const activationTimes = activationTimesBuilder.build();

			this.#activationTimes.set(extensionId.value, activationTimes);

			return {
				activationFailed: false,

				activationFailedError: null,

				activationTimes: activationTimes,

				// Provide empty object if undefined
				module: extensionModule || {},

				exports: activationResult,

				disposable: {
					dispose: () => {
						if (typeof extensionModule?.deactivate === "function") {
							this._log(
								`Calling deactivate() for ${extensionId.value}...`,
							);

							Promise.resolve(
								extensionModule.deactivate!(),
							).catch((e: any) =>
								this._logError(
									`Error in deactivate of ${extensionId.value}:`,

									e,
								),
							);
						}

						if (context?.subscriptions) {
							this._log(
								`Disposing ${context.subscriptions.length} subscriptions for ${extensionId.value}.`,
							);

							dispose(context.subscriptions);
						}
					},
				},
			};
		} catch (error: any) {
			this._logError(
				`FAILED to load/activate ${extensionId.value}:`,

				error,
			);

			this.#activationErrors.set(extensionId.value, error);

			return {
				activationFailed: true,

				activationFailedError: error,

				activationTimes: activationTimesBuilder.build(),

				module: extensionModule || {},

				exports: undefined,

				disposable: { dispose: () => {} },
			};
		}
	}

	protected async _loadExtensionContextShim(
		desc: IExtensionDescription,
	): Promise<ShimExtensionContext> {
		this._log(`Loading ExtensionContext for ${desc.identifier.value}`);

		if (!global.cocoonInstantiationService) {
			throw new Error(
				"Cannot load ExtensionContext: InstantiationService not available!",
			);
		}

		const instantiationService = global.cocoonInstantiationService;

		// Get services via DI - ensure correct service IDs and interfaces are used
		const storageService = instantiationService.invokeFunction(
			(accessor) => accessor.get<IExtHostStorage>(IExtHostStorage),

			// Use IExtHostStorage
		);

		const globalState = storageService.createMemento(
			desc.identifier.value,

			true,
		);

		const workspaceState = storageService.createMemento(
			desc.identifier.value,

			false,
		);

		const storagePathsService = instantiationService.invokeFunction(
			(accessor) =>
				accessor.get<IExtensionStoragePaths>(IExtensionStoragePaths),
		);

		const storagePathUri = storagePathsService.workspaceValue(desc);

		const globalStoragePathUri = storagePathsService.globalValue(desc);

		// Should be vscode.SecretStorage
		let secretsApi: any;

		try {
			secretsApi = instantiationService.invokeFunction((accessor) =>
				accessor.get<IExtHostSecrets>(IExtHostSecrets),
			);
		} catch {
			this._logWarn(
				`IExtHostSecrets service not found, providing basic stub for ${desc.identifier.value}`,
			);

			secretsApi = {
				/* basic stub */ get: () => Promise.resolve(undefined),

				store: () => Promise.resolve(),

				delete: () => Promise.resolve(),

				onDidChange: VscodeEvent.None,
			};
		}

		const logBasePath =
			this.#initData.logsLocation?.fsPath ||
			path.join(process.cwd(), ".vscode-shim-data", "logs");

		const logUri = Uri.file(
			path.join(logBasePath, `${desc.identifier.value}.log`),
		);

		// Should be vscode.EnvironmentVariableCollection
		let termEnvCollection: any;

		try {
			const terminalService = instantiationService.invokeFunction(
				(accessor) =>
					accessor.get<IExtHostTerminalServiceShape>(
						IExtHostTerminalService,
					),
			);

			termEnvCollection =
				terminalService.getEnvironmentVariableCollection(
					this._createExtensionApiObjectShim(desc) as any,

					// Cast to any if ShimVscodeExtension is not directly compatible
				);
		} catch (e: any) {
			this._logWarn(
				`IExtHostTerminalService not found or failed, providing stub env collection for ${desc.identifier.value}`,

				e,
			);

			termEnvCollection = {
				/* basic stub with methods */ persistent: true,

				replace: () => {},

				append: () => {},

				prepend: () => {},

				get: () => undefined,

				forEach: () => {},

				delete: () => {},

				clear: () => {},

				[Symbol.iterator]: function* () {},
			};
		}

		await Promise.all([
			(globalState as any).whenReady,

			(workspaceState as any).whenReady,
		]);

		const context: ShimExtensionContext = {
			subscriptions: [],

			globalState,

			workspaceState,

			secrets: secretsApi,

			extensionUri: desc.extensionLocation,

			extensionPath: desc.extensionLocation.fsPath,

			environmentVariableCollection: termEnvCollection,

			asAbsolutePath: (relativePath) =>
				path.join(desc.extensionLocation.fsPath, relativePath),

			storageUri: storagePathUri,

			storagePath: storagePathUri?.fsPath,

			// Assume global path is always available
			globalStorageUri: globalStoragePathUri!,

			globalStoragePath: globalStoragePathUri!.fsPath,

			logUri: logUri,

			logPath: logUri.fsPath,

			extensionMode: desc.isUnderDevelopment
				? 2 /* Development */
				: 1 /* Production */,

			extension: this._createExtensionApiObjectShim(desc),

			// Node
			extensionRuntime: 1,
		};

		return Object.freeze(context);
	}

	protected _getEntryPointShim(
		desc: IExtensionDescription,
	): string | undefined {
		if (typeof desc.main === "string")
			return desc.main.replace(/\.js$/, "");

		if (typeof desc.browser === "string") {
			// VS Code uses 'browser' for web extensions
			this._logWarn(
				`Using 'browser' field as entry point for ${desc.identifier.value}: ${desc.browser}`,
			);

			return desc.browser.replace(/\.js$/, "");
		}

		return undefined;
	}

	protected _createExtensionApiObjectShim(
		desc: IExtensionDescription,
	): ShimVscodeExtension {
		const extensionService = this;

		return Object.freeze({
			id: desc.identifier.value,

			extensionUri: desc.extensionLocation,

			extensionPath: desc.extensionLocation.fsPath,

			get isActive() {
				return extensionService.isActivated(desc.identifier.value);

				// Use getter for dynamic check
			},

			packageJSON: desc,

			extensionKind: this.#initData.remote?.isRemote
				? 2 /* Workspace */
				: // vscode.ExtensionKind
					1 /* UI */,

			get exports() {
				return extensionService.getExtensionExports(
					desc.identifier.value,
				);

				// Use getter
			},

			activate: async () => {
				if (!extensionService.isActivated(desc.identifier.value)) {
					await extensionService.activateByIdWithErrors(
						desc.identifier.value,

						{
							// Generic reason
							activationEvent: `extension.activate()`,

							extensionId: desc.identifier,

							activationKind: 0 /* ActivationKind.Normal */,

							// Explicit activation is not startup
							startup: false,
						},
					);
				}

				return extensionService.getExtensionExports(
					desc.identifier.value,
				);
			},
		});
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
					}
				: null,

			activationTimes: status.activationTimes,
		}).catch((e: any) =>
			this._logError(
				`Failed to report activation status for ${extensionId.value}:`,

				e,
			),
		);
	}
}

function _createSimpleReader(): IExtensionPointUser<any>[] {
	// The real ExtensionDescriptionRegistry takes an array of IExtensionPointUser<T>
	// For a shim, if we don't process extension points deeply, an empty array or a mock might suffice.
	// The JS version used an object with a `readActivationEvents` method.
	// The TS type `IExtensionPointUser` is more complex.
	// Let's adapt the simple reader to satisfy a basic contract if possible, or simplify.
	// For this shim, we only need `readActivationEvents`.
	return [
		{
			description: {
				name: "cocoon-shim-activation-reader",

				version: "0.0.0",

				publisher: "cocoon",
			},

			// This might not be strictly correct for IExtensionPointUser structure
			name: "activationEvents",

			// This is what registry needs for activation
			read: (desc: IExtensionDescription) => desc.activationEvents || [],
		},

		// Cast to any if the simple object doesn't fully match IExtensionPointUser
	] as any;
}

// Original JS export
// export { ShimExtHostExtensionService };

// Class is already exported
