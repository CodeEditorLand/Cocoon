/*
 * File: Cocoon/Source/Shim/EnablementService.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:40 UTC
 * Dependency: vs/workbench/api/common/extHostExtensionActivator, vs/workbench/api/common/extHostExtensionService
 * Export: ShimExtensionEnablementService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Enablement Shim
 * --------------------------------------------------------------------------------------------
 * Implements `IGlobalExtensionEnablementService` (or compatible shape), managing and
 * querying extension enablement states (enabled/disabled globally or per workspace).
 *
 * - Proxies state-changing (`setEnablement`) or query (`getEnablementStates` for cache updates)
 *   operations to Mountain via RPC.
 * - Maintains a local cache (`_enablementCache`) of enablement states, populated initially
 *   and updated by RPC calls from Mountain.
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
	ExtensionIdentifierMap, // For caching states by ExtensionIdentifier
	ExtensionIdentifierSet, // Useful if tracking sets of extensions per state
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator"; // For _convertDescriptionToApiExtension
import type { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
import {
	EnablementState, // VS Code's platform enum
	type IGlobalExtensionEnablementService, // Target VS Code interface
} from "vs/workbench/services/extensionManagement/common/extensionManagement";
import {
	ExtensionKind as VscodeExtensionKind, // Public API enum
	Uri as VscodeUri, // For _convertDescriptionToApiExtension
	type Extension as VscodeExtensionApi,
} from "vscode";

// Assuming resolved to API shim

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---
type ExtensionForEnablement = IExtensionDescription; // Type alias for clarity

interface MainThreadExtensionEnablementProxyShape {
	// Note: VS Code's protocol might use ExtensionIdentifier DTOs instead of raw strings for extensionIds.
	// Assuming string[] for simplicity matching current shim.
	$getEnablementStates(
		extensionIds: string[],
		workspaceType?: any,
	): Promise<EnablementState[]>;
	$setEnablement(
		extensionIds: string[],
		newState: EnablementState,
	): Promise<boolean[]>;
}

// RPC shape this service implements for calls from Mountain.
interface ExtHostExtensionEnablementRpcShape {
	$acceptEnablementChanged(
		changedExtensionsData: { id: string; state: EnablementState }[],
	): Promise<void>;
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
	readonly #onDidChangeEnablementEmitter = this._instanceDisposables.add(
		new VscodeEmitter<readonly VscodeExtensionApi[]>(),
	);
	public readonly onDidChangeEnablement: VscodeEvent<
		readonly VscodeExtensionApi[]
	> = this.#onDidChangeEnablementEmitter.event;

	private readonly _extHostExtensionService: IExtHostExtensionService;
	private readonly _enablementCache =
		new ExtensionIdentifierMap<EnablementState>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		extHostExtensionService: IExtHostExtensionService, // Injected dependency
	) {
		super("ExtensionEnablementService", rpcService, logService);
		this._extHostExtensionService = extHostExtensionService;
		this._logInfo("Initializing...");

		if (!this._extHostExtensionService) {
			this._logError(
				"CRITICAL DEPENDENCY MISSING: IExtHostExtensionService not provided. Enablement events and state resolution will be severely impaired.",
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
				"MainThreadExtensionEnablementService RPC proxy unavailable. Setting enablement will fail; getting state will use defaults or potentially stale cache.",
			);
		}

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
			if (!allExtOutput || allExtOutput.length === 0) {
				this._logDebug(
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
				// TODO: Pass workspaceType if Mountain's $getEnablementStates requires it.
				const states =
					await this.#mainThreadEnablementProxy.$getEnablementStates(
						allIds /*, workspaceType */,
					);
				if (states.length === allIds.length) {
					allIds.forEach((idStr, index) => {
						const extId = new ExtensionIdentifier(idStr); // Ensure we use ExtensionIdentifier for map key
						this._enablementCache.set(extId, states[index]);
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
		} catch (err: any) {
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
		this._logWarnOnce(
			`Enablement state for '${extension.identifier.value}' not found in cache. ` +
				`Returning default (EnabledGlobally). State may be inaccurate if initial population failed or extension is new.`,
		);
		return EnablementState.EnabledGlobally; // Fallback
	}

	public async setEnablement(
		extensions: ExtensionForEnablement[],
		newState: EnablementState,
	): Promise<boolean[]> {
		const extensionIds = extensions.map((ext) => ext.identifier.value); // Use string IDs for RPC
		this._logInfo(
			`API setEnablement for [${extensionIds.join(", ").substring(0, 100)}...] to ${EnablementState[newState]}`,
		);

		if (!this.#mainThreadEnablementProxy) {
			this._logError(
				`Cannot setEnablement: MainThread RPC Proxy unavailable.`,
			);
			return extensions.map(() => false); // Indicate failure for all
		}

		try {
			const results =
				await this.#mainThreadEnablementProxy.$setEnablement(
					extensionIds,
					newState,
				);
			// Optimistically update local cache for extensions where MainThread reported success.
			// The authoritative update will come via $acceptEnablementChanged.
			results.forEach((success, index) => {
				if (success) {
					this._enablementCache.set(
						extensions[index].identifier,
						newState,
					);
					this._logDebug(
						`Optimistically updated cache for '${extensions[index].identifier.value}' to ${EnablementState[newState]} pending MainThread confirmation.`,
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
		// Helper from VS Code
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
			const oldState = this._enablementCache.get(extId);
			if (oldState !== newState) {
				// Update cache only if state truly changed or was not present
				this._enablementCache.set(extId, newState);
				this._logDebug(
					`Authoritative enablement cache updated for '${idStr}': ${oldState !== undefined ? EnablementState[oldState] : "N/A"} -> ${EnablementState[newState]}`,
				);
				extensionIdsForLog.push(
					`${idStr}(${EnablementState[newState]})`,
				); // Log only if it's a real change for the event
				try {
					const extDesc =
						await this._extHostExtensionService.getExtension(idStr); // From real service
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
			} else {
				this._logDebug(
					`Enablement cache for '${idStr}' already reflects state ${EnablementState[newState]}. No effective change for event firing.`,
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
			this._logDebug(
				`$acceptEnablementChanged: Received ${changedExtensionsData.length} changes, but none resulted in a state change that would fire an event or no extensions were found for the event payload.`,
			);
		}
	}

	private _convertDescriptionToApiExtension(
		desc: IExtensionDescription,
	): VscodeExtensionApi | undefined {
		if (!this._extHostExtensionService) {
			this._logError(
				"_convertDescriptionToApiExtension: IExtHostExtensionService unavailable. Cannot determine active state or exports.",
			);
			return undefined; // Cannot proceed without this service
		}
		const isActive = this._extHostExtensionService.isActivated(
			desc.identifier,
		);
		const exports = isActive
			? this._extHostExtensionService.getExtensionExports(desc.identifier)
			: undefined;

		let kind = VscodeExtensionKind.Workspace; // Default for Cocoon-like Node host
		if (desc.extensionKind && desc.extensionKind.length > 0) {
			if (desc.extensionKind.includes("web"))
				kind = VscodeExtensionKind.Web;
			// UI extensions in a Node host are typically Workspace kind unless they are *only* web and UI.
			// If it can run in 'workspace', that usually takes precedence for `extensionKind` property.
			else if (
				desc.extensionKind.includes("ui") &&
				!desc.extensionKind.includes("workspace")
			)
				kind = VscodeExtensionKind.UI;
		}

		return Object.freeze({
			id: desc.identifier.value,
			extensionUri: VscodeUri.from(desc.extensionLocation), // VscodeUri from internal URI
			extensionPath: desc.extensionLocation.fsPath,
			isActive,
			packageJSON: desc as any, // IExtensionDescription is largely compatible
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
		super.dispose(); // Base class handles _onDidChangeEnablementEmitter via _instanceDisposables
		this._enablementCache.clear();
		this._logInfo("Disposed.");
	}
}
