/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Enablement Shim (enablement-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IWorkbenchExtensionEnablementService` interface (or a compatible
 * ExtHost version like `IGlobalExtensionEnablementService`). This service is responsible
 * for managing the enablement state of extensions (e.g., enabled globally, enabled for
 * the current workspace, disabled).
 *
 * In a typical VS Code architecture, the extension host (ExtHost) version of this service
 * would synchronize enablement states with the MainThread. For Cocoon, this shim
 * proxies requests to determine or change enablement states to a
 * `MainThreadExtensionEnablementService` running in the Mountain host process via RPC.
 *
 * Responsibilities:
 * - Implementing methods like `getEnablementState(extension)`, `setEnablement(extensions, state)`,
 *
 *
 *
 *   and `isEnabled(extension)`.
 * - Proxying these operations to Mountain via RPC.
 * - Managing and firing the `onDidChangeEnablement` event when Mountain signals that
 *   extension enablement states have changed (via an RPC call like `$acceptEnablementChanged`).
 * - Handling the challenge of synchronous API methods (`getEnablementState`, `isEnabled`)
 *   that ideally rely on asynchronously fetched or cached data.
 *
 * Key Interactions:
 * - Registered with Dependency Injection in `Cocoon/index.ts`. It's often a dependency
 *   for the real `ExtHostExtensionService`.
 * - Makes RPC calls to `MainContext.MainThreadExtensionEnablement` on Mountain.
 * - Receives RPC calls from Mountain (e.g., `$acceptEnablementChanged`) to trigger
 *   its `onDidChangeEnablement` event.
 * - Critically depends on `IExtHostExtensionService` (the real one) to resolve extension IDs
 *   to full `vscode.Extension` API objects for the `onDidChangeEnablement` event payload.
 * - Uses `BaseCocoonShim` for common utilities.
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
// Dependency to resolve extension IDs to full API objects
import type { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
// Import VS Code's service interfaces and enums
import {
	// Enum for enablement states
	EnablementState,
	// This is often the MainThread/Workbench service ID
	// IWorkbenchExtensionEnablementService,

	// Common interface for ExtHost side
	type IGlobalExtensionEnablementService,
	// For richer event payload if used
	// IExtensionEnablementServiceDelta,
} from "vs/workbench/services/extensionManagement/common/extensionManagement";
// For onDidChangeEnablement event payload type `vscode.Extension[]`
import type { Extension as VscodeExtensionApi } from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/** Alias for IExtensionDescription, representing the extension info this service operates on. */
type ExtensionForEnablement = IExtensionDescription;

/**
 * Defines the RPC interface for the `MainThreadExtensionEnablementService` expected on Mountain.
 */
interface MainThreadExtensionEnablementProxyShape {
	/**
	 * Retrieves the enablement states for multiple extensions.
	 * @param extensionIds An array of canonical extension ID strings.
	 * @param workspaceType Optional parameter indicating workspace context (not fully used in this shim).
	 * @returns A promise resolving to an array of `EnablementState` values, corresponding to `extensionIds`.
	 */
	$getEnablementStates(
		extensionIds: string[],

		workspaceType?: any,
	): Promise<EnablementState[]>;

	/**
	 * Sets the enablement state for multiple extensions.
	 * @param extensionIds An array of canonical extension ID strings.
	 * @param newState The new `EnablementState` to apply.
	 * @returns A promise resolving to an array of booleans, indicating success for each extension.
	 */
	$setEnablement(
		extensionIds: string[],

		newState: EnablementState,
	): Promise<boolean[]>;

	// If VS Code uses this
	// Optional: $isIgnored?(extensionId: string): Promise<boolean>;
}

/**
 * Defines the RPC interface for this `ExtHostExtensionEnablementService`, for methods called BY Mountain.
 */
interface ExtHostExtensionEnablementRpcShape {
	/**
	 * Called by the main thread when the enablement of one or more extensions changes.
	 * @param changedExtensionIds An array of canonical string identifiers for extensions whose enablement changed.
	 */
	$acceptEnablementChanged(changedExtensionIds: string[]): Promise<void>;
}

/**
 * Cocoon's implementation of `IGlobalExtensionEnablementService`.
 * Manages and proxies extension enablement states.
 */
export class ShimExtensionEnablementService
	extends BaseCocoonShim
	implements
		IGlobalExtensionEnablementService,
		ExtHostExtensionEnablementRpcShape
{
	// Required by VS Code's service types
	public readonly _serviceBrand: undefined;

	readonly #mainThreadEnablementProxy: MainThreadExtensionEnablementProxyShape | null =
		null;

	readonly #onDidChangeEnablementEmitter = new VscodeEmitter<
		readonly VscodeExtensionApi[]
	>();

	// Dependency on the real ExtHostExtensionService to convert IDs to VscodeExtensionApi objects for events.
	// This should be injected via DI.
	private readonly _extHostExtensionService: IExtHostExtensionService;

	/**
	 * Creates an instance of ShimExtensionEnablementService.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 * @param extHostExtensionService The real IExtHostExtensionService, required for event payloads.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		// Injected dependency
		extHostExtensionService: IExtHostExtensionService,
	) {
		super("ExtensionEnablementService", rpcService, logService);

		this._extHostExtensionService = extHostExtensionService;

		this._log(`Initializing...`);

		if (this._rpcService) {
			// Assuming standard MainContext identifier. Adjust if custom.
			const mainThreadProxyId =
				MainContext.MainThreadExtensionEnablement as ProxyIdentifier<MainThreadExtensionEnablementProxyShape>;

			if (mainThreadProxyId) {
				this.#mainThreadEnablementProxy =
					this._getProxy(mainThreadProxyId);
			} else {
				this._logError(
					"ProxyIdentifier for MainThreadExtensionEnablementService not found in MainContext. RPC calls will fail.",
				);
			}

			// Register self for RPC calls from Mountain (e.g., $acceptEnablementChanged)
			// Assuming standard ExtHostContext identifier.
			const selfRpcId =
				ExtHostContext.ExtHostExtensionEnablement as ProxyIdentifier<ExtHostExtensionEnablementRpcShape>;

			if (selfRpcId) {
				try {
					this._rpcService.set(selfRpcId, this);

					this._log(
						"Registered self for RPC calls (ExtHostExtensionEnablement).",
					);
				} catch (e: any) {
					this._logError(
						"Failed to set self for RPC (ExtHostExtensionEnablement):",

						e,
					);
				}
			} else {
				this._logError(
					"ProxyIdentifier for self (ExtHostExtensionEnablement) not found in ExtHostContext.",
				);
			}
		}

		if (!this.#mainThreadEnablementProxy) {
			this._logWarn(
				"MainThreadExtensionEnablementService RPC proxy not available. Enablement state will be STUBBED and rely on defaults.",
			);
		}

		if (!this._extHostExtensionService) {
			this._logError(
				"CRITICAL: IExtHostExtensionService dependency not provided. `onDidChangeEnablement` event may not function correctly.",
			);
		}
	}

	// --- IGlobalExtensionEnablementService / IWorkbenchExtensionEnablementService methods ---

	/**
	 * Gets the enablement state of a single extension.
	 * NOTE: This is a synchronous API method. In a real distributed environment,
	 *
	 *
	 *
	 * fetching this state is asynchronous. A proper implementation relies on a
	 * cache populated by the main thread. This shim currently returns a default
	 * stubbed value and logs a warning.
	 * @param extension The extension description.
	 * @returns The `EnablementState` of the extension (stubbed).
	 */
	public getEnablementState(
		extension: ExtensionForEnablement,
	): EnablementState {
		this._logWarnOnce(
			`getEnablementState for '${extension.identifier.value}' - STUBBED. This synchronous API relies on a cache not fully implemented in this shim. Returning EnabledGlobally as default.`,
		);

		// TODO: Implement a cache that is updated by `$acceptEnablementChanged` or an initial fetch.
		// For now, assume enabled if no proxy or error.
		if (!this.#mainThreadEnablementProxy) {
			// Fallback if no proxy
			return EnablementState.EnabledGlobally;
		}

		// A synchronous call to an async backend is problematic.
		// A real implementation would consult a local, synchronized cache.
		// As a temporary measure, we can't make an async call here.
		// Placeholder
		return EnablementState.EnabledGlobally;
	}

	/**
	 * Sets the enablement state for one or more extensions.
	 * @param extensions An array of extension descriptions.
	 * @param newState The desired `EnablementState`.
	 * @returns A promise resolving to an array of booleans indicating success for each extension.
	 */
	public async setEnablement(
		extensions: ExtensionForEnablement[],

		newState: EnablementState,
	): Promise<boolean[]> {
		// Use .id for canonical string
		const extensionIds = extensions.map((ext) => ext.identifier.id);

		this._log(
			`setEnablement for [${extensionIds.join(", ")}] to state ${EnablementState[newState]}`,
		);

		if (!this.#mainThreadEnablementProxy) {
			this._logError(
				`setEnablement for [${extensionIds.join(", ")}] - RPC Proxy unavailable. Operation failed.`,
			);

			// Indicate failure for all
			return extensions.map(() => false);
		}

		try {
			return await this.#mainThreadEnablementProxy.$setEnablement(
				extensionIds,

				newState,
			);
		} catch (e: any) {
			this._logError(
				`RPC $setEnablement failed:`,

				refineErrorForShim(e, this._logService),
			);

			return extensions.map(() => false);
		}
	}

	/**
	 * Checks if an extension is currently enabled (either globally or for the workspace).
	 * Relies on `getEnablementState`.
	 * @param extension The extension description.
	 * @returns `true` if the extension is considered enabled, `false` otherwise.
	 */
	public isEnabled(extension: ExtensionForEnablement): boolean {
		// Uses the (currently stubbed) synchronous method
		const state = this.getEnablementState(extension);

		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	/**
	 * Helper to check if a given `EnablementState` means the extension is effectively enabled.
	 * @param state The `EnablementState`.
	 * @returns `true` if the state represents an enabled extension.
	 */
	public isEnablementStateEnabled(state: EnablementState): boolean {
		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	/**
	 * Gets the enablement states for multiple extensions.
	 * NOTE: Synchronous API, relies on stubbed `getEnablementState` and would need a cache.
	 * @param extensions Array of extension descriptions.
	 * @param _workspaceType Optional workspace context (unused in this shim).
	 * @returns An array of `EnablementState` values.
	 */
	public getEnablementStates(
		extensions: ExtensionForEnablement[],

		_workspaceType?: any,
	): EnablementState[] {
		// this._logService?.trace(`getEnablementStates for ${extensions.length} extensions (using stubbed getEnablementState).`);

		return extensions.map((ext) => this.getEnablementState(ext));
	}

	/**
	 * An event that fires when the enablement state of any extension changes.
	 * The event payload is an array of `vscode.Extension` API objects.
	 */
	get onDidChangeEnablement(): VscodeEvent<readonly VscodeExtensionApi[]> {
		return this.#onDidChangeEnablementEmitter.event;
	}

	// --- ExtHostExtensionEnablementRpcShape methods (called BY Mountain) ---

	/**
	 * Called by Mountain when extension enablement states have changed.
	 * It resolves the extension IDs to `vscode.Extension` API objects and fires the
	 * `onDidChangeEnablement` event.
	 * @param changedExtensionIdsFromMain An array of canonical string IDs of extensions whose enablement changed.
	 */
	public async $acceptEnablementChanged(
		changedExtensionIdsFromMain: string[],
	): Promise<void> {
		this._log(
			`RPC $acceptEnablementChanged received for IDs: [${changedExtensionIdsFromMain.join(", ")}]`,
		);

		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot process $acceptEnablementChanged: IExtHostExtensionService (real) is not available to resolve extension descriptions for the event payload.",
			);

			return;
		}

		const changedVscodeExtensions: VscodeExtensionApi[] = [];

		for (const idStr of changedExtensionIdsFromMain) {
			// The real ExtHostExtensionService.getExtension(id) returns a promise of IExtensionDescription | undefined
			// Then, this IExtensionDescription needs to be converted to a vscode.Extension object.
			// ShimExtHostExtensions._createApiExtensionObject is a good example of this conversion.
			const extDesc =
				await this._extHostExtensionService.getExtension(idStr);

			if (extDesc) {
				// This conversion logic should ideally live within ExtHostExtensionService or a shared utility.
				// For now, using a simplified conversion.
				const apiExtension =
					this._convertDescriptionToApiExtension(extDesc);

				if (apiExtension) {
					changedVscodeExtensions.push(apiExtension);
				}
			} else {
				this._logWarn(
					`$acceptEnablementChanged: Could not find extension description for ID '${idStr}' via IExtHostExtensionService.`,
				);
			}
		}

		if (changedVscodeExtensions.length > 0) {
			this.#onDidChangeEnablementEmitter.fire(
				Object.freeze(changedVscodeExtensions),
			);

			this._log(
				`Fired onDidChangeEnablement event with ${changedVscodeExtensions.length} extensions.`,
			);
		} else if (changedExtensionIdsFromMain.length > 0) {
			this._logWarn(
				`$acceptEnablementChanged: Received IDs, but none could be resolved to VscodeExtensionApi objects. Event not fired.`,
			);
		}

		// TODO: If implementing a cache for getEnablementState, this is where the cache should be updated
		// by fetching the new states for `changedExtensionIdsFromMain` via RPC.
	}

	/**
	 * Simplified helper to convert `IExtensionDescription` to a `VscodeExtensionApi`-like object.
	 * A more complete version exists in `ShimExtHostExtensions` or the real `ExtHostExtensionService`.
	 */
	private _convertDescriptionToApiExtension(
		desc: IExtensionDescription,
	): VscodeExtensionApi | undefined {
		// Guard
		if (!this._extHostExtensionService) return undefined;

		// This is a simplified mock. The real conversion is more complex and handled by ExtHostExtensionService.
		// It should ideally reuse the logic from `ShimExtHostExtensions._createApiExtensionObject` or similar.
		return {
			id: desc.identifier.value,

			// Assuming local file path
			extensionPath: desc.extensionLocation.fsPath,

			isActive: this._extHostExtensionService.isActivated(
				desc.identifier.value,
			),

			// IExtensionDescription is close enough for packageJSON
			packageJSON: desc as any,

			// Simplified default
			extensionKind: VscodeExtensionKind.Workspace,

			exports: this._extHostExtensionService.getExtensionExports(
				desc.identifier.value,
			),

			activate: () =>
				this._extHostExtensionService
					.activateById(desc.identifier, {
						startup: false,

						activationEvent: `api`,

						activationKind: ActivationKind.Api,

						extensionId: desc.identifier,
					})
					.then(() =>
						this._extHostExtensionService.getExtensionExports(
							desc.identifier.value,
						),
					),

			// Added
			extensionUri: VscodeUri.from(desc.extensionLocation),
		} as VscodeExtensionApi;
	}

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this.#onDidChangeEnablementEmitter.dispose();
	}
}
