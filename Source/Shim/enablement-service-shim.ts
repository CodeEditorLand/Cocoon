/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Enablement Shim (enablement-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `IWorkbenchExtensionEnablementService` (or a compatible ExtHost interface
 * like `IGlobalExtensionEnablementService`) for extensions running in Cocoon.
 * It determines if an extension is enabled or disabled, ideally by proxying requests
 * to `MainThreadExtensionEnablementService` in Mountain.
 *
 * Responsibilities:
 * - `getEnablementState(extension)`: Proxies to Mountain to get the enablement state.
 * - `setEnablement(extensions, state)`: Proxies to Mountain to change enablement state.
 * - `isEnabled(extension)`: Derived from `getEnablementState`.
 * - `onDidChangeEnablement`: Event fired when Mountain signals enablement changes.
 *
 * Key Interactions:
 * - Injected into the real `ExtHostExtensionService` via DI.
 * - Makes RPC calls to `MainThreadExtensionEnablementService` in Mountain.
 * - Receives RPC calls from Mountain (e.g., `$acceptEnablementChanged`) to trigger events.
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
	ExtHostContext,
	MainContext,
	// For RPC identifiers
} from "vs/workbench/api/common/extHost.protocol";
import {
	EnablementState,
	// Service ID for DI
	IWorkbenchExtensionEnablementService,
	// Common interface for ExtHost side
	type IGlobalExtensionEnablementService,
	// For event payload if main thread sends rich delta
	// IExtensionEnablementServiceDelta,
} from "vs/workbench/services/extensionManagement/common/extensionManagement";
// For onDidChangeEnablement payload
import type { Extension as VscodeExtensionApi } from "vscode";

import {
	BaseCocoonShim,
	refineError,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

// Represents the IExtensionDescription or a compatible structure used by this service.
type ExtensionForEnablement = IExtensionDescription;

// RPC Shape for MainThreadExtensionEnablementService
// TODO: This MUST align with Mountain's MainThread implementation.
interface MainThreadExtensionEnablementProxyShape {
	$getEnablementStates(
		extensionIds: string[],

		workspaceType?: /* WorkspaceType */ any,

		// Or individual $getEnablementState
	): Promise<EnablementState[]>;

	$setEnablement(
		extensionIds: string[],

		newState: EnablementState,
	): Promise<boolean[]>;

	// Some versions have this
	// $isIgnored?(extensionId: string): Promise<boolean>;
}

// RPC Shape for methods on this ExtHost service called by Mountain
// TODO: This MUST align with VS Code's ExtHostExtensionEnablementShape or similar.
interface ExtHostExtensionEnablementRpcShape {
	/**
	 * Called by the main thread when the enablement of one or more extensions changes.
	 * @param extensionIds Array of string identifiers for extensions whose enablement changed.
	 */
	// Or takes IExtensionEnablementServiceDelta
	$acceptEnablementChanged(extensionIds: string[]): Promise<void>;
}

export class ShimExtensionEnablementService
	extends BaseCocoonShim
	implements
		IGlobalExtensionEnablementService,
		ExtHostExtensionEnablementRpcShape
{
	// For IWorkbenchExtensionEnablementService DI
	public readonly _serviceBrand: undefined;

	readonly #mainThreadEnablementProxy: MainThreadExtensionEnablementProxyShape | null =
		null;

	readonly #onDidChangeEnablementEmitter = new VscodeEmitter<
		readonly VscodeExtensionApi[]
		// Payload is vscode.Extension[]
	>();

	// TODO: This service needs access to IExtHostExtensionService to resolve extension IDs to IExtensionDescription
	// for the onDidChangeEnablement event payload. This is a common pattern in VS Code ExtHost services.
	// This would be injected via constructor or fetched from DI later.
	// For now, this dependency is implicit and needs to be addressed.
	// private _extHostExtensionService: IExtHostExtensionService | undefined;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,

		// Potential future: @IExtHostExtensionService extHostExtensionService: IExtHostExtensionService
	) {
		super("ExtensionEnablementService", rpcService, logService);

		this._log(`Initializing...`);

		if (this._rpcService) {
			// TODO: Use the correct MainContext identifier for MainThreadExtensionEnablementService
			// This identifier might not be in the standard MainContext enum if it's a newer/more specific service.
			// It might be something like `MainContext.MainThreadExtensionEnablement`.
			const proxyId =
				MainContext[
					"MainThreadExtensionEnablementService" as keyof typeof MainContext
					// Try a potential name
				] ||
				MainContext[
					"MainThreadExtensionEnablement" as keyof typeof MainContext
					// Another potential name
				];

			if (proxyId) {
				this.#mainThreadEnablementProxy = this._getProxy(
					proxyId as ProxyIdentifier<MainThreadExtensionEnablementProxyShape>,
				);
			} else {
				this._logError(
					"ProxyIdentifier for MainThreadExtensionEnablementService not found in MainContext. RPC calls will fail.",
				);
			}

			// Register self for RPC calls from Mountain
			try {
				// TODO: Use the correct ExtHostContext identifier.
				const selfProxyId =
					ExtHostContext[
						"ExtHostExtensionEnablementService" as keyof typeof ExtHostContext
					] ||
					ExtHostContext[
						"ExtHostExtensionEnablement" as keyof typeof ExtHostContext
					];

				if (selfProxyId) {
					this._rpcService.set(
						selfProxyId as ProxyIdentifier<ExtHostExtensionEnablementRpcShape>,

						this,
					);

					this._log(
						"Registered self for RPC calls (ExtHostExtensionEnablementService).",
					);
				} else {
					this._logError(
						"ProxyIdentifier for self (ExtHostExtensionEnablementService) not found in ExtHostContext.",
					);
				}
			} catch (e: any) {
				this._logError("Failed to set self for RPC:", e);
			}
		}

		if (!this.#mainThreadEnablementProxy) {
			this._logWarn(
				"MainThreadExtensionEnablementService proxy not available. Enablement state will be STUBBED.",
			);
		}
	}

	// --- IGlobalExtensionEnablementService / IWorkbenchExtensionEnablementService methods ---

	public getEnablementState(
		extension: ExtensionForEnablement,
	): EnablementState {
		// Can be verbose
		// this._log(`getEnablementState for ${extension.identifier.value}`);

		if (this.#mainThreadEnablementProxy) {
			// The proxy method $getEnablementStates typically takes an array of IDs.
			// For a single extension, we could call it with a single-element array.
			// Or, MainThread might have a singular $getEnablementState(id).
			// TODO: This should ideally be an async method returning Promise<EnablementState>.
			// The interface IGlobalExtensionEnablementService.getEnablementState is synchronous.
			// This implies either the ExtHost service has a cache populated by the main thread,

			// or this method is not intended for direct RPC for each call.
			// VS Code's real ExtHostExtensionEnablementService maintains a cache.
			this._logWarnOnce(
				`getEnablementState for ${extension.identifier.value} - RPC STUBBED, returning EnabledGlobally. Sync API with async backend is tricky.`,
			);

			// MVP Stub, as direct RPC is async
			return EnablementState.EnabledGlobally;
		}

		this._logWarn(
			`getEnablementState for ${extension.identifier.value} - RPC Proxy unavailable, STUBBED, returning EnabledGlobally.`,
		);

		return EnablementState.EnabledGlobally;
	}

	public async setEnablement(
		extensions: ExtensionForEnablement[],

		newState: EnablementState,
	): Promise<boolean[]> {
		// Use .id for string from ExtensionIdentifier
		const extensionIds = extensions.map((e) => e.identifier.id);

		this._log(
			`setEnablement for [${extensionIds.join(", ")}] to state ${EnablementState[newState]}`,
		);

		if (!this.#mainThreadEnablementProxy) {
			this._logError(
				`setEnablement for [${extensionIds.join(", ")}] - RPC Proxy unavailable, operation failed.`,
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

				refineError(e, this._logService),
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

	// This utility method was in the original JS.
	public isEnablementStateEnabled(state: EnablementState): boolean {
		switch (state) {
			case EnablementState.EnabledGlobally:
			// Workspace specific enablement
			case EnablementState.EnabledWorkspace:
				return true;

			// All other states (Disabled*, DisabledByEnvironment, etc.)
			default:
				return false;
		}
	}

	public getEnablementStates(
		extensions: ExtensionForEnablement[],

		_workspaceType?: /* WorkspaceType */ any,
	): EnablementState[] {
		// Verbose
		// this._log(`getEnablementStates for ${extensions.length} extensions`);

		// Similar to getEnablementState, this is sync but backend is async.
		// VS Code's real service would use a cache.
		// TODO: Implement caching or make this async if interface allows.
		// Uses stubbed getEnablementState
		return extensions.map((ext) => this.getEnablementState(ext));
	}

	public get onDidChangeEnablement(): VscodeEvent<
		readonly VscodeExtensionApi[]
	> {
		return this.#onDidChangeEnablementEmitter.event;
	}

	// --- ExtHostExtensionEnablementRpcShape methods (called by Mountain) ---
	public async $acceptEnablementChanged(
		changedExtensionIdsFromMain: string[],
	): Promise<void> {
		this._log(
			`RPC $acceptEnablementChanged for IDs: [${changedExtensionIdsFromMain.join(", ")}]`,
		);

		// TODO: Critical: This service needs access to `IExtHostExtensionService` to resolve
		// string IDs back to `IExtensionDescription` (or `vscode.Extension`) objects
		// to fire the `onDidChangeEnablementEmitter` with the correct payload type.
		// Example:
		// Needs to be injected or DI'd
		// const extHostSvc = this._getExtHostExtensionService();

		// if (extHostSvc) {

		//     const changedExtensionsPromises = changedExtensionIdsFromMain.map(idStr => extHostSvc.getExtension(idStr));

		//     const resolvedExtensions = (await Promise.all(changedExtensionsPromises)).filter(ext => !!ext) as IExtensionDescription[];

		//     if (resolvedExtensions.length > 0) {

		// Convert IExtensionDescription to vscode.Extension if necessary for the event
		//
		//         const apiExtensions = resolvedExtensions.map(desc => this._convertToApiExtension(desc));

		//         this.#onDidChangeEnablementEmitter.fire(Object.freeze(apiExtensions));

		//     }

		// } else {

		//     this._logError("Cannot fire onDidChangeEnablement: IExtHostExtensionService not available to resolve extension descriptions.");

		// }

		this._logWarnOnce(
			"$acceptEnablementChanged received but not fully implemented to fetch Extension objects and fire event correctly.",
		);

		// For now, fire with empty array or attempt to create dummy extensions if only IDs are available for the event type.
		// The event type `readonly VscodeExtensionApi[]` implies we need the full API object.
		// If it were `readonly ExtensionIdentifier[]`, it would be simpler.
		// Fire with empty for now
		this.#onDidChangeEnablementEmitter.fire([]);
	}

	// Helper placeholder (would need full Extension object construction logic from ExtHostExtensionService)
	// private _convertToApiExtension(desc: IExtensionDescription): VscodeExtensionApi {

	// This is a simplified mock. The real conversion is complex.
	//
	//     return {

	//         id: desc.identifier.value,

	//         extensionPath: desc.extensionLocation.fsPath,

	// This service doesn't know activation state
	//         isActive: false,

	//         packageJSON: desc as any,

	// Placeholder
	//         extensionKind: ExtensionKind.Workspace,

	//         exports: undefined,

	//         activate: () => Promise.resolve(),

	//     } as VscodeExtensionApi;

	// }

	public dispose(): void {
		super.dispose();

		this.#onDidChangeEnablementEmitter.dispose();
	}
}
