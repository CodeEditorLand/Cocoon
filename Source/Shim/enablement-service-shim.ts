/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Enablement Shim (enablement-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IWorkbenchExtensionEnablementService` interface (or a compatible
 * ExtHost version like `IGlobalExtensionEnablementService` from VS Code). This service
 * is responsible for managing and querying the enablement state of extensions (e.g.,
 *
 * enabled globally, enabled for the current workspace, disabled).
 *
 * In a typical VS Code architecture, the extension host (ExtHost) version of this service
 * would synchronize enablement states with its counterpart on the MainThread. For Cocoon,
 *
 * this shim proxies requests to determine or change enablement states to a
 * `MainThreadExtensionEnablementService` (assumed to exist on Mountain) via RPC.
 *
 * Responsibilities:
 * - Implementing methods such as `getEnablementState(extension)`,
 *
 *   `setEnablement(extensions, state)`, and `isEnabled(extension)`.
 * - Proxying these state-changing or query operations to Mountain via RPC calls.
 * - Managing and firing the `onDidChangeEnablement` event when Mountain signals (via an
 *   RPC call like `$acceptEnablementChanged`) that the enablement states of one or
 *   more extensions have changed.
 * - Addressing the challenge of synchronous API methods like `getEnablementState()` and
 *   `isEnabled()`. These methods, by VS Code API design, are synchronous, but in a
 *   distributed environment, the underlying data is often fetched asynchronously.
 *   A robust implementation requires a local cache that is kept synchronized with the
 *   MainThread. This shim currently STUBS the synchronous methods due to the lack
 *   of such a cache, returning default values and logging warnings.
 *
 * Key Interactions:
 * - Registered with DependencyInjection (DI) in `Cocoon/index.ts`, typically as
 *   `IWorkbenchExtensionEnablementService` or `IGlobalExtensionEnablementService`.
 *   It's often a dependency for the real `ExtHostExtensionService`.
 * - Makes RPC calls to `MainContext.MainThreadExtensionEnablement` on Mountain.
 * - Implements `ExtHostExtensionEnablementRpcShape` to receive RPC calls from Mountain
 *   (e.g., `$acceptEnablementChanged`) which trigger its `onDidChangeEnablement` event.
 * - Critically depends on an injected instance of the real `IExtHostExtensionService` to
 *   resolve extension IDs to full `vscode.Extension` API objects, which are needed for
 *   the payload of the `onDidChangeEnablement` event.
 * - Uses `BaseCocoonShim` for common utilities like logging, RPC proxy management,
 *
 *   and error refinement.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// For proxying to MainThreadExtensionEnablement
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// For ActivationKind in _convertDescriptionToApiExtension
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";
// Dependency to resolve extension IDs to full API objects
import type { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
// Import VS Code's service interfaces and enums related to extension enablement
import {
	// Enum for enablement states (e.g., EnabledGlobally, Disabled)
	EnablementState,
	// Common interface for ExtHost side
	type IGlobalExtensionEnablementService,
	// This is often the MainThread/Workbench service DI key
	// IWorkbenchExtensionEnablementService,
	// For richer event payload if used in onDidChangeEnablement
	// type IExtensionEnablementServiceDelta,
} from "vs/workbench/services/extensionManagement/common/extensionManagement";
// For onDidChangeEnablement event payload type `vscode.Extension[]`
import {
	// Needed for _convertDescriptionToApiExtension
	ExtensionKind as VscodeExtensionKind,
	// Needed for _convertDescriptionToApiExtension
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

/** Alias for `IExtensionDescription`, representing the extension information this service operates on. */
type ExtensionForEnablement = IExtensionDescription;

/**
 * Defines the RPC interface for the `MainThreadExtensionEnablementService` expected on Mountain.
 * Method names and parameters must align with Mountain's implementation.
 */
interface MainThreadExtensionEnablementProxyShape {
	/**
	 * Retrieves the enablement states for multiple extensions from the main thread.
	 * @param extensionIds An array of canonical extension ID strings (e.g., "publisher.name").
	 * @param workspaceType Optional parameter indicating workspace context (e.g., UI, Workspace).
	 *                      This shim currently does not make deep use of `workspaceType`.
	 * @returns A promise resolving to an array of `EnablementState` enum values,
	 *
	 *          corresponding to the order of `extensionIds`.
	 */
	$getEnablementStates(
		extensionIds: string[],

		workspaceType?: any,
	): Promise<EnablementState[]>;

	/**
	 * Sets the enablement state for multiple extensions on the main thread.
	 * @param extensionIds An array of canonical extension ID strings.
	 * @param newState The new `EnablementState` to apply to these extensions.
	 * @returns A promise resolving to an array of booleans, where each boolean indicates
	 *          whether the enablement state was successfully changed for the corresponding extension.
	 */
	$setEnablement(
		extensionIds: string[],

		newState: EnablementState,
	): Promise<boolean[]>;

	// Optional: If VS Code's protocol includes checking if an extension is ignored by policy:
	// $isIgnored?(extensionId: string): Promise<boolean>;
}

/**
 * Defines the RPC interface for this `ExtHostExtensionEnablementService`, for methods called BY Mountain.
 */
interface ExtHostExtensionEnablementRpcShape {
	/**
	 * Called by the main thread (Mountain) when the enablement state of one or more extensions
	 * has changed (e.g., due to user action in VS Code UI, settings sync, or CLI).
	 * @param changedExtensionIds An array of canonical string identifiers for extensions
	 *                            whose enablement state has changed.
	 */
	$acceptEnablementChanged(changedExtensionIds: string[]): Promise<void>;
}

/**
 * Cocoon's implementation of `IGlobalExtensionEnablementService`.
 * It manages and proxies extension enablement states to/from Mountain and handles
 * related events.
 */
export class ShimExtensionEnablementService
	extends BaseCocoonShim
	implements
		IGlobalExtensionEnablementService,
		ExtHostExtensionEnablementRpcShape
{
	// Required by VS Code's service types for DI
	public readonly _serviceBrand: undefined;

	readonly #mainThreadEnablementProxy: MainThreadExtensionEnablementProxyShape | null =
		null;

	readonly #onDidChangeEnablementEmitter = new VscodeEmitter<
		readonly VscodeExtensionApi[]
	>();

	// Dependency on the real ExtHostExtensionService to convert extension IDs to VscodeExtensionApi objects for events.
	// This is crucial for providing meaningful event payloads to extensions.
	private readonly _extHostExtensionService: IExtHostExtensionService;

	/**
	 * Creates an instance of ShimExtensionEnablementService.
	 * @param rpcService The RPC service adapter for communication with Mountain.
	 * @param logService The logging service instance.
	 * @param extHostExtensionService The real `IExtHostExtensionService` instance, injected via DI.
	 *                                This is required for resolving extension descriptions for event payloads.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		// Injected dependency
		extHostExtensionService: IExtHostExtensionService,
	) {
		super("ExtensionEnablementService", rpcService, logService);

		this._extHostExtensionService = extHostExtensionService;

		// Use Info for major lifecycle events
		this._logInfo(`Initializing...`);

		if (this._rpcService) {
			const mainThreadProxyId =
				MainContext.MainThreadExtensionEnablement as ProxyIdentifier<MainThreadExtensionEnablementProxyShape>;

			if (mainThreadProxyId) {
				this.#mainThreadEnablementProxy =
					this._getProxy(mainThreadProxyId);
			} else {
				// This is less critical if `getEnablementState` relies purely on a cache populated by `$acceptEnablementChanged`.
				// However, `setEnablement` would fail.
				this._logError(
					"ProxyIdentifier for MainThreadExtensionEnablementService not found in MainContext. RPC calls for enablement will fail.",
				);
			}

			// Register self to handle RPC calls from Mountain (e.g., $acceptEnablementChanged).
			const selfRpcId =
				ExtHostContext.ExtHostExtensionEnablement as ProxyIdentifier<ExtHostExtensionEnablementRpcShape>;

			if (selfRpcId) {
				try {
					this._rpcService.set(selfRpcId, this);

					this._logInfo(
						"Registered self for RPC calls from Mountain (ExtHostExtensionEnablement).",
					);
				} catch (e: any) {
					this._logError(
						"Failed to register self as RPC target for ExtHostExtensionEnablement:",

						e,
					);
				}
			} else {
				this._logError(
					"ProxyIdentifier for self (ExtHostExtensionEnablement) not found in ExtHostContext. Cannot receive enablement updates from Mountain via RPC.",
				);
			}
		}

		if (!this.#mainThreadEnablementProxy) {
			this._logWarn(
				"MainThreadExtensionEnablementService RPC proxy is not available. " +
					"Setting enablement states will fail. Getting states will rely on defaults or cached values if implemented.",
			);
		}

		if (!this._extHostExtensionService) {
			// This is a critical issue for the `onDidChangeEnablement` event.
			this._logError(
				"CRITICAL DEPENDENCY MISSING: IExtHostExtensionService was not provided. " +
					"The `onDidChangeEnablement` event will not be able to provide `vscode.Extension` objects in its payload and may malfunction.",
			);
		}
	}

	// --- IGlobalExtensionEnablementService / IWorkbenchExtensionEnablementService methods ---

	/**
	 * Gets the enablement state of a single extension.
	 *
	 * **NOTE:** This is a synchronous API method. In a distributed environment like Cocoon,
	 *
	 * fetching this state accurately from Mountain is an asynchronous operation. A correct
	 * implementation of this synchronous method relies on a local cache of enablement states
	 * that is kept synchronized by the main thread (Mountain) via RPC calls (e.g.,
	 *
	 * `$acceptEnablementChanged` and potentially an initial bulk update).
	 *
	 * This shim currently **STUBS** this method due to the absence of such a cache.
	 * It returns a default value (`EnablementState.EnabledGlobally`) and logs a warning.
	 *
	 * @param extension The `IExtensionDescription` of the extension to query.
	 * @returns The `EnablementState` of the extension. In this stub, it defaults to `EnabledGlobally`.
	 */
	public getEnablementState(
		extension: ExtensionForEnablement,
	): EnablementState {
		this._logWarnOnce(
			`getEnablementState for '${extension.identifier.value}' - STUBBED. ` +
				"This synchronous API method currently returns a default value (EnabledGlobally) as a " +
				"full enablement state cache is not yet implemented in this shim. " +
				"For accurate state, an asynchronous query or a synchronized cache is required.",
		);

		// TODO: Implement a local cache for enablement states. This cache should be:
		// 1. Populated initially, perhaps by an RPC call like `$getAllEnablementStates()` from MainThread or during `$initialize`.
		// 2. Updated whenever `$acceptEnablementChanged` is called by MainThread.
		// Without a cache, this synchronous method cannot provide real-time accurate data from Mountain.

		// Fallback behavior if the proxy to MainThread is unavailable (though this method should use a cache).
		if (!this.#mainThreadEnablementProxy) {
			return EnablementState.EnabledGlobally;
		}

		// Placeholder: A real implementation would consult its synchronized local cache here.
		return EnablementState.EnabledGlobally;
	}

	/**
	 * Sets the enablement state for one or more extensions. This operation is asynchronous
	 * and proxies the request to Mountain.
	 * @param extensions An array of `IExtensionDescription` objects for the extensions whose state is to be changed.
	 * @param newState The desired `EnablementState` to apply.
	 * @returns A promise resolving to an array of booleans, where each boolean indicates
	 *          whether the enablement state change was successful for the corresponding extension.
	 *          Failures can occur if the RPC proxy is unavailable or if Mountain reports an issue.
	 */
	public async setEnablement(
		extensions: ExtensionForEnablement[],

		newState: EnablementState,
	): Promise<boolean[]> {
		// Use canonical .id for RPC
		const extensionIds = extensions.map((ext) => ext.identifier.id);

		this._logInfo(
			`API setEnablement called for [${extensionIds.join(", ")}] to state ${EnablementState[newState]}`,
		);

		if (!this.#mainThreadEnablementProxy) {
			this._logError(
				`Cannot setEnablement for [${extensionIds.join(", ")}]: MainThreadExtensionEnablement RPC Proxy is unavailable. Operation failed.`,
			);

			// Indicate failure for all if proxy is missing.
			return extensions.map(() => false);
		}

		try {
			const results =
				await this.#mainThreadEnablementProxy.$setEnablement(
					extensionIds,

					newState,
				);

			this._logDebug(
				`RPC $setEnablement for [${extensionIds.join(", ")}] completed. Results: [${results.join(", ")}]`,
			);

			return results;
		} catch (e: any) {
			this._logError(
				`RPC call $setEnablement for [${extensionIds.join(", ")}] failed:`,

				refineErrorForShim(e, this._logService, "$setEnablement RPC"),
			);

			// Indicate failure for all on RPC error.
			return extensions.map(() => false);
		}
	}

	/**
	 * Checks if an extension is currently considered enabled (i.e., its state is
	 * `EnablementState.EnabledGlobally` or `EnablementState.EnabledWorkspace`).
	 * This method relies on the (currently stubbed) synchronous `getEnablementState`.
	 * @param extension The `IExtensionDescription` of the extension to check.
	 * @returns `true` if the extension is considered enabled based on its `EnablementState`, `false` otherwise.
	 */
	public isEnabled(extension: ExtensionForEnablement): boolean {
		const state = this.getEnablementState(extension);

		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	/**
	 * Helper method to determine if a given `EnablementState` signifies that an
	 * extension is effectively enabled.
	 * @param state The `EnablementState` to check.
	 * @returns `true` if the state represents an enabled extension, `false` otherwise.
	 */
	public isEnablementStateEnabled(state: EnablementState): boolean {
		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	/**
	 * Gets the enablement states for multiple extensions.
	 * **NOTE:** This is a synchronous API method and currently relies on the stubbed
	 * `getEnablementState`. It would require a synchronized cache for accurate results.
	 * @param extensions An array of `IExtensionDescription` objects.
	 * @param _workspaceType Optional workspace context (currently unused by this shim).
	 * @returns An array of `EnablementState` values, corresponding to the input extensions.
	 */
	public getEnablementStates(
		extensions: ExtensionForEnablement[],

		_workspaceType?: any,
	): EnablementState[] {
		this._logDebug(
			`API getEnablementStates called for ${extensions.length} extensions (using stubbed getEnablementState).`,
		);

		return extensions.map((ext) => this.getEnablementState(ext));
	}

	/**
	 * An event that fires when the enablement state of any extension changes.
	 * The event payload is a readonly array of `vscode.Extension` API objects
	 * for the extensions whose states have changed.
	 */
	get onDidChangeEnablement(): VscodeEvent<readonly VscodeExtensionApi[]> {
		return this.#onDidChangeEnablementEmitter.event;
	}

	// --- ExtHostExtensionEnablementRpcShape methods (called BY Mountain) ---

	/**
	 * {@inheritDoc ExtHostExtensionEnablementRpcShape.$acceptEnablementChanged}
	 *
	 *
	 * Called by Mountain when the enablement states of one or more extensions have changed.
	 * This method resolves the provided extension IDs to `vscode.Extension` API objects
	 * (using the injected `IExtHostExtensionService`) and then fires the
	 * `onDidChangeEnablement` event.
	 * @param changedExtensionIdsFromMain An array of canonical string IDs (e.g., "publisher.name")
	 *                                    of extensions whose enablement state has changed on Mountain.
	 */
	public async $acceptEnablementChanged(
		changedExtensionIdsFromMain: string[],
	): Promise<void> {
		this._logInfo(
			`RPC $acceptEnablementChanged received from Mountain for IDs: [${changedExtensionIdsFromMain.join(", ")}]`,
		);

		// TODO: If a cache for `getEnablementState` is implemented, this is the place to invalidate
		// or update the cache entries for `changedExtensionIdsFromMain`. This might involve
		// an RPC call like `$getEnablementStates(changedExtensionIdsFromMain)` if Mountain doesn't
		// push the new states directly with this event.

		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot process $acceptEnablementChanged: The real IExtHostExtensionService dependency is not available. " +
					"Unable to resolve extension descriptions to create vscode.Extension objects for the onDidChangeEnablement event payload.",
			);

			return;
		}

		const changedVscodeExtensions: VscodeExtensionApi[] = [];

		for (const idStr of changedExtensionIdsFromMain) {
			try {
				// The real ExtHostExtensionService.getExtension(id) returns a promise of IExtensionDescription | undefined.
				const extDesc =
					await this._extHostExtensionService.getExtension(idStr);

				if (extDesc) {
					const apiExtension =
						this._convertDescriptionToApiExtension(extDesc);

					if (apiExtension) {
						changedVscodeExtensions.push(apiExtension);
					} else {
						this._logWarn(
							`$acceptEnablementChanged: Failed to convert IExtensionDescription to VscodeExtensionApi for ID '${idStr}'.`,
						);
					}
				} else {
					this._logWarn(
						`$acceptEnablementChanged: Could not find IExtensionDescription for ID '${idStr}' via IExtHostExtensionService. It might have been uninstalled or is not known.`,
					);
				}
			} catch (error) {
				this._logError(
					`$acceptEnablementChanged: Error processing extension ID '${idStr}':`,

					error,
				);
			}
		}

		if (changedVscodeExtensions.length > 0) {
			this.#onDidChangeEnablementEmitter.fire(
				Object.freeze(changedVscodeExtensions),

				// Ensure payload is immutable
			);

			this._logInfo(
				`Fired onDidChangeEnablement event with ${changedVscodeExtensions.length} affected extensions.`,
			);
		} else if (changedExtensionIdsFromMain.length > 0) {
			this._logWarn(
				`$acceptEnablementChanged: Received ${changedExtensionIdsFromMain.length} changed IDs, but none could be resolved to ` +
					`VscodeExtensionApi objects. The onDidChangeEnablement event was not fired.`,
			);
		}
	}

	/**
	 * Simplified helper to convert an `IExtensionDescription` (internal VS Code type)
	 * to a `VscodeExtensionApi`-like object (public API type for `vscode.Extension`).
	 * A more complete and accurate conversion is typically handled by the real `ExtHostExtensionService`
	 * or a dedicated utility within VS Code's API implementation.
	 * @param desc The `IExtensionDescription` to convert.
	 * @returns A `VscodeExtensionApi` object, or `undefined` if conversion is not possible (e.g., missing dependencies).
	 */
	private _convertDescriptionToApiExtension(
		desc: IExtensionDescription,
	): VscodeExtensionApi | undefined {
		if (!this._extHostExtensionService) {
			this._logError(
				"_convertDescriptionToApiExtension: IExtHostExtensionService unavailable, cannot create API extension object.",
			);

			return undefined;
		}

		// This conversion should align with how `vscode.Extension<T>` is structured.
		// The real ExtHostExtensionService has more sophisticated logic for determining extensionKind, etc.
		const isActive = this._extHostExtensionService.isActivated(
			desc.identifier,

			// Check activation status
		);

		const exports = isActive
			? this._extHostExtensionService.getExtensionExports(desc.identifier)
			: // Get exports only if active
				undefined;

		return Object.freeze({
			// Ensure the API object is immutable
			id: desc.identifier.value,

			// Convert internal URI to API URI
			extensionUri: VscodeUri.from(desc.extensionLocation),

			// fsPath for local file system paths
			extensionPath: desc.extensionLocation.fsPath,

			isActive: isActive,

			// IExtensionDescription is largely compatible with the packageJSON shape expected by the API
			packageJSON: desc as any,

			extensionKind: desc.extensionKind?.includes("ui")
				? VscodeExtensionKind.UI
				: // Simplified mapping
					VscodeExtensionKind.Workspace,

			exports: exports,

			activate: async (): Promise<any> => {
				// Activation from vscode.Extension<T>.activate()
				if (
					!this._extHostExtensionService.isActivated(desc.identifier)
				) {
					await this._extHostExtensionService.activateById(
						desc.identifier,

						{
							startup: false,

							extensionId: desc.identifier,

							// Example activation reason
							activationEvent: `onLanguage:${desc.identifier.value}`,

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

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this.#onDidChangeEnablementEmitter.dispose();

		this._logInfo("Disposed.");
	}
}
