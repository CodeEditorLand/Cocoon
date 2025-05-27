/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Enablement Shim (enablement-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `IGlobalExtensionEnablementService` (or compatible shape), managing and
 * querying extension enablement states (enabled/disabled globally or per workspace).
 *
 * - Proxies state-changing (`setEnablement`) or query (`getEnablementStates` for cache updates)
 *   operations to Mountain via RPC.
 * - Maintains a local cache (`_enablementCache`) of enablement states.
 * - Synchronous `getEnablementState()` reads from this cache.
 * - Fires `onDidChangeEnablement` when Mountain signals changes via RPC (`$acceptEnablementChanged`),
 *
 *
 *   using `IExtHostExtensionService` to resolve extension IDs for the event payload.
 *
 * Key Interactions:
 * - Registered with DI (e.g., as `IWorkbenchExtensionEnablementService`).
 * - Consumed by the real `ExtHostExtensionService`.
 * - RPC with `MainContext.MainThreadExtensionEnablement`.
 * - Implements `ExtHostExtensionEnablementRpcShape` for calls from Mountain.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	ExtensionIdentifier,
	// For caching states by ExtensionIdentifier
	ExtensionIdentifierMap,
	// Could be useful if tracking sets of extensions per state
	ExtensionIdentifierSet,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";
import type { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
import {
	// VS Code's platform enum
	EnablementState,
	type IGlobalExtensionEnablementService,
} from "vs/workbench/services/extensionManagement/common/extensionManagement";
import {
	// Public API enum
	ExtensionKind as VscodeExtensionKind,
	// For _convertDescriptionToApiExtension
	Uri as VscodeUri,
	type Extension as VscodeExtensionApi,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---
type ExtensionForEnablement = IExtensionDescription;

interface MainThreadExtensionEnablementProxyShape {
	$getEnablementStates(
		extensionIds: string[],

		workspaceType?: any,
	): Promise<EnablementState[]>;

	$setEnablement(
		extensionIds: string[],

		newState: EnablementState,
	): Promise<boolean[]>;
}

interface ExtHostExtensionEnablementRpcShape {
	$acceptEnablementChanged(
		changedExtensionIdsAndStates: { id: string; state: EnablementState }[],
	): Promise<void>;

	// Changed to receive states directly
}

export class ShimExtensionEnablementService
	extends BaseCocoonShim
	implements
		IGlobalExtensionEnablementService,
		ExtHostExtensionEnablementRpcShape
{
	public readonly _serviceBrand: undefined;

	readonly #mainThreadEnablementProxy: MainThreadExtensionEnablementProxyShape | null =
		null;

	readonly #onDidChangeEnablementEmitter = new VscodeEmitter<
		readonly VscodeExtensionApi[]
	>();

	private readonly _extHostExtensionService: IExtHostExtensionService;

	private readonly _enablementCache =
		new ExtensionIdentifierMap<EnablementState>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		extHostExtensionService: IExtHostExtensionService,
	) {
		super("ExtensionEnablementService", rpcService, logService);

		this._extHostExtensionService = extHostExtensionService;

		this._logInfo("Initializing...");

		if (!this._extHostExtensionService) {
			this._logError(
				"CRITICAL DEPENDENCY MISSING: IExtHostExtensionService not provided. Enablement events and state resolution will be impaired.",
			);
		}

		if (this._rpcService) {
			this.#mainThreadEnablementProxy = this._getProxy(
				MainContext.MainThreadExtensionEnablement as ProxyIdentifier<MainThreadExtensionEnablementProxyShape>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostExtensionEnablement as ProxyIdentifier<ExtHostExtensionEnablementRpcShape>,

					this,
				);

				this._logInfo(
					"Registered self for RPC calls from Mountain (ExtHostExtensionEnablement).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostExtensionEnablement:",

					e,
				);
			}
		}

		if (!this.#mainThreadEnablementProxy) {
			this._logWarn(
				"MainThreadExtensionEnablementService RPC proxy unavailable. Setting enablement will fail; getting state will use defaults/stale cache.",
			);
		}

		// TODO: Implement initial cache population.
		// This would typically be an async method called after DI is ready, or if initData contains initial states.
		// For MVP, cache will populate as `$acceptEnablementChanged` is called or if `setEnablement` is used.
		this._populateInitialCache().catch((err) => {
			this._logError(
				"Failed to populate initial enablement state cache:",

				err,
			);
		});
	}

	private async _populateInitialCache(): Promise<void> {
		if (
			!this.#mainThreadEnablementProxy ||
			!this._extHostExtensionService
		) {
			this._logWarn(
				"Cannot populate initial enablement cache: MainThread proxy or ExtHostExtensionService unavailable.",
			);

			return;
		}

		try {
			const allExtOutput =
				await this._extHostExtensionService.getExtensions();

			if (!allExtOutput) {
				// getExtensions returns Promise<IExtensionDescription[]>
				this._logWarn(
					"Initial enablement cache population: getExtensions() returned no extensions.",
				);

				return;
			}

			const allExtDescriptions =
				allExtOutput as ReadonlyArray<IExtensionDescription>;

			const allIds = allExtDescriptions.map(
				(ext) => ext.identifier.value,
			);

			if (allIds.length > 0) {
				this._logDebug(
					`Populating initial enablement cache for ${allIds.length} extensions...`,
				);

				const states =
					await this.#mainThreadEnablementProxy.$getEnablementStates(
						allIds,
					);

				if (states.length === allIds.length) {
					allIds.forEach((id, index) => {
						this._enablementCache.set(
							new ExtensionIdentifier(id),

							states[index],
						);
					});

					this._logInfo(
						`Initial enablement cache populated with ${this._enablementCache.size} entries.`,
					);
				} else {
					this._logError(
						`Mismatch in length between extension IDs (${allIds.length}) and received states (${states.length}) during initial cache population.`,
					);
				}
			}
		} catch (err) {
			this._logError(
				"Error during initial enablement cache population:",

				refineErrorForShim(
					err,

					this._logService,

					"InitialEnablementCache",
				),
			);
		}
	}

	public getEnablementState(
		extension: ExtensionForEnablement,
	): EnablementState {
		const cachedState = this._enablementCache.get(extension.identifier);

		if (cachedState !== undefined) {
			return cachedState;
		}

		// Log only once for a given extension if its state is not found in the cache after initial attempt.
		this._logWarnOnce(
			`Enablement state for '${extension.identifier.value}' not found in cache. ` +
				`Returning default (EnabledGlobally). State may be inaccurate if initial population failed or extension is new.`,
		);

		// Fallback
		return EnablementState.EnabledGlobally;
	}

	public async setEnablement(
		extensions: ExtensionForEnablement[],

		newState: EnablementState,
	): Promise<boolean[]> {
		// Use canonical .id string
		const extensionIds = extensions.map((ext) => ext.identifier.id);

		this._logInfo(
			`API setEnablement for [${extensionIds.join(", ")}] to ${EnablementState[newState]}`,
		);

		if (!this.#mainThreadEnablementProxy) {
			this._logError(
				`Cannot setEnablement: MainThread RPC Proxy unavailable.`,
			);

			return extensions.map(() => false);
		}

		try {
			const results =
				await this.#mainThreadEnablementProxy.$setEnablement(
					extensionIds,

					newState,
				);

			// Optimistically update local cache and fire events if MainThread call seems successful
			// However, the source of truth is `$acceptEnablementChanged` from MainThread.
			// For now, we rely on MainThread to call back with `$acceptEnablementChanged`.
			results.forEach((success, index) => {
				if (success) {
					// If MainThread reports success, we can tentatively update our cache.
					// Mountain should then call $acceptEnablementChanged which will make it authoritative.
					this._enablementCache.set(
						extensions[index].identifier,

						newState,
					);
				}
			});

			return results;
		} catch (e: any) {
			this._logError(
				`RPC call $setEnablement failed:`,

				refineErrorForShim(e, this._logService, "$setEnablement RPC"),
			);

			return extensions.map(() => false);
		}
	}

	public isEnabled(extension: ExtensionForEnablement): boolean {
		const state = this.getEnablementState(extension);

		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	public isEnablementStateEnabled(state: EnablementState): boolean {
		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	public getEnablementStates(
		extensions: ExtensionForEnablement[],

		_workspaceType?: any,
	): EnablementState[] {
		this._logDebug(
			`API getEnablementStates called for ${extensions.length} extensions.`,
		);

		return extensions.map((ext) => this.getEnablementState(ext));
	}

	get onDidChangeEnablement(): VscodeEvent<readonly VscodeExtensionApi[]> {
		return this.#onDidChangeEnablementEmitter.event;
	}

	public async $acceptEnablementChanged(
		changedExtensionsData: { id: string; state: EnablementState }[],
	): Promise<void> {
		this._logInfo(
			`RPC $acceptEnablementChanged received from Mountain for ${changedExtensionsData.length} extensions.`,
		);

		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot process $acceptEnablementChanged: IExtHostExtensionService unavailable.",
			);

			return;
		}

		const changedVscodeExtensions: VscodeExtensionApi[] = [];

		const extensionIdsForLog: string[] = [];

		for (const { id: idStr, state: newState } of changedExtensionsData) {
			const extId = new ExtensionIdentifier(idStr);

			// Update local cache with the authoritative state from MainThread
			const oldState = this._enablementCache.get(extId);

			if (oldState !== newState) {
				this._enablementCache.set(extId, newState);

				this._logDebug(
					`Enablement cache updated for '${idStr}': ${oldState !== undefined ? EnablementState[oldState] : "N/A"} -> ${EnablementState[newState]}`,
				);
			} else {
				this._logDebug(
					`Enablement cache for '${idStr}' already reflects state ${EnablementState[newState]}. No change.`,
				);
			}

			extensionIdsForLog.push(`${idStr}(${EnablementState[newState]})`);

			try {
				const extDesc =
					// Real service call
					await this._extHostExtensionService.getExtension(idStr);

				if (extDesc) {
					const apiExtension =
						this._convertDescriptionToApiExtension(extDesc);

					if (apiExtension)
						changedVscodeExtensions.push(apiExtension);
					else
						this._logWarn(
							`$acceptEnablementChanged: Failed to convert IExtDesc to VscodeExtApi for ID '${idStr}'.`,
						);
				} else {
					this._logWarn(
						`$acceptEnablementChanged: Could not find IExtDesc for ID '${idStr}'.`,
					);
				}
			} catch (error) {
				this._logError(
					`$acceptEnablementChanged: Error processing ID '${idStr}':`,

					error,
				);
			}
		}

		if (changedVscodeExtensions.length > 0) {
			this.#onDidChangeEnablementEmitter.fire(
				Object.freeze(changedVscodeExtensions),
			);

			this._logInfo(
				`Fired onDidChangeEnablement for extensions: [${extensionIdsForLog.join(", ")}]`,
			);
		} else if (changedExtensionsData.length > 0) {
			this._logWarn(
				`$acceptEnablementChanged: Received ${changedExtensionsData.length} changes, but none resolved to VscodeExtensionApi objects. Event not fired.`,
			);
		}
	}

	private _convertDescriptionToApiExtension(
		desc: IExtensionDescription,
	): VscodeExtensionApi | undefined {
		// Guard
		if (!this._extHostExtensionService) return undefined;

		const isActive = this._extHostExtensionService.isActivated(
			desc.identifier,
		);

		const exports = isActive
			? this._extHostExtensionService.getExtensionExports(desc.identifier)
			: undefined;

		// Refined extensionKind mapping
		// Default
		let kind = VscodeExtensionKind.Workspace;

		if (desc.extensionKind && desc.extensionKind.length > 0) {
			if (desc.extensionKind.includes("web"))
				kind = VscodeExtensionKind.Web;
			else if (
				desc.extensionKind.includes("ui") &&
				!desc.extensionKind.includes("workspace")
			)
				kind = VscodeExtensionKind.UI;

			// If it includes 'workspace', it's Workspace, even if also 'ui'.
			// This matches VS Code's typical behavior where 'workspace' takes precedence for node hosts.
		}

		return Object.freeze({
			id: desc.identifier.value,

			extensionUri: VscodeUri.from(desc.extensionLocation),

			extensionPath: desc.extensionLocation.fsPath,

			isActive,

			// IExtensionDescription is largely compatible
			packageJSON: desc as any,

			extensionKind: kind,

			exports,

			activate: async (): Promise<any> => {
				if (
					!this._extHostExtensionService.isActivated(desc.identifier)
				) {
					await this._extHostExtensionService.activateById(
						desc.identifier,

						{
							startup: false,

							extensionId: desc.identifier,

							activationEvent: `api`,

							activationKind: ActivationKind.Api,
						},
					);
				}

				return this._extHostExtensionService.getExtensionExports(
					desc.identifier,
				);
			},
		}) as VscodeExtensionApi;
	}

	public override dispose(): void {
		super.dispose();

		this.#onDidChangeEnablementEmitter.dispose();

		this._enablementCache.clear();

		this._logInfo("Disposed.");
	}
}
