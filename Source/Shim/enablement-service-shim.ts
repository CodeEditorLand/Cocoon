/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Enablement Shim (enablement-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IWorkbenchExtensionEnablementService` (or a relevant ExtHost subset)
 * for extensions running in Cocoon. It determines if an extension is enabled or disabled
 * based on global/workspace settings, potentially proxying requests to Mountain.
 *
 * Responsibilities:
 * - `getEnablementState(extension)`: Determines the enablement state of an extension.
 *   For MVP, this might be a stub or rely on initData. Ideally, proxies to Mountain.
 * - `setEnablement(extensions, state)`: Allows changing the enablement state, proxied to Mountain.
 * - `isEnabled(extension)`: Convenience method based on `getEnablementState`.
 * - `onDidChangeEnablement`: Event fired when enablement states change (requires notifications from Mountain).
 *
 * Key Interactions:
 * - Provides enablement status, often used by `ExtHostExtensionService` during activation.
 * - May interact with `MainThreadExtensionEnablementService` via RPC or IPC.
 * - Uses `EnablementState` enum from VS Code services.
 *--------------------------------------------------------------------------------------------*/

// Needed if proxying state checks/changes via direct IPC
// import { sendToMountainAndWait } from "../cocoon-ipc";

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// Assuming bundled
import {
	ExtensionIdentifier,
	type IExtensionDescription,
	// For Extension type
} from "vs/platform/extensions/common/extensions";
import {
	EnablementState,
	// A more general interface
	IExtensionEnablementService,
	// This interface is often implemented by the ExtHost counterpart
	type IGlobalExtensionEnablementService,
	// The service ID used in DI
	IWorkbenchExtensionEnablementService,
} from "vs/workbench/services/extensionManagement/common/extensionManagement";

import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	ProxyIdentifier,
	// Import ILogService & BaseCocoonShim
} from "./_baseShim";

// --- Type Definitions ---

// Define the shape of the Extension object used by this shim, typically IExtensionDescription
type Extension = IExtensionDescription;

// Define the RPC shape for MainThreadExtensionEnablementService if used
// TODO: Define this based on actual protocol if RPC is used.
interface MainThreadExtensionEnablementShape {
	$getEnablementState(extensionId: string): Promise<EnablementState>;

	$setEnablement(
		extensionIds: string[],

		newState: EnablementState,
	): Promise<boolean[]>;

	// If events are pull/RPC based
	// $registerExtensionEnablementChangeListener? (callbackId: number) : Promise<void>
}

// Define the ExtHost shape if Mountain calls methods on this service
interface ExtHostExtensionEnablementShape {
	// Example if Mountain pushes events
	$onEnablementChanged(extensionIds: string[]): void;
}

// TODO: Determine which interface this shim should precisely implement.
// IGlobalExtensionEnablementService is common for ExtHost.
// IWorkbenchExtensionEnablementService is the service ID.
export class ShimExtensionEnablementService
	extends BaseCocoonShim
	implements
		IGlobalExtensionEnablementService,
		ExtHostExtensionEnablementShape
{
	public readonly _serviceBrand: undefined;

	readonly #mainThreadEnablementProxy: MainThreadExtensionEnablementShape | null =
		null;

	readonly #onDidChangeEnablementEmitter = new VscodeEmitter<
		readonly Extension[]
		// TODO: Extension[] needs to be full IExtensionDescription
	>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		// Service Identifier for logging
		super("ExtensionEnablementService", rpcService, logService);

		this._log(`Initialized.`);

		if (this._rpcService) {
			// TODO: Use the correct MainContext identifier for MainThreadExtensionEnablementService
			// this.#mainThreadEnablementProxy = this._getProxy(MainContext.MainThreadExtensionEnablementService as ProxyIdentifier<MainThreadExtensionEnablementShape>);
			// TODO: Register self for RPC calls from Mountain if ExtHostExtensionEnablementShape is used
			// this._rpcService.set(ExtHostContext.ExtHostExtensionEnablementService as ProxyIdentifier<ExtHostExtensionEnablementShape>, this);
		}

		if (!this.#mainThreadEnablementProxy) {
			this._logWarn(
				"MainThreadExtensionEnablementService proxy not available. Enablement checks/changes might be stubbed or fail.",
			);
		}
	}

	// --- IGlobalExtensionEnablementService methods ---

	public getEnablementState(extension: Extension): EnablementState {
		this._log(`getEnablementState for ${extension.identifier.value}`);

		if (this.#mainThreadEnablementProxy) {
			// TODO: Implement RPC call to this.#mainThreadEnablementProxy.$getEnablementState(extension.identifier.id)
			// For now, returning stub.
			this._logWarn(
				`getEnablementState for ${extension.identifier.value} - STUBBED, returning EnabledGlobally.`,
			);

			return EnablementState.EnabledGlobally;
		}

		this._logWarn(
			`getEnablementState for ${extension.identifier.value} - RPC Proxy unavailable, STUBBED, returning EnabledGlobally.`,
		);

		// MVP Stub
		return EnablementState.EnabledGlobally;
	}

	public async setEnablement(
		extensions: Extension[],

		newState: EnablementState,
	): Promise<boolean[]> {
		const extensionIds = extensions.map((e) => e.identifier.value);

		this._log(
			`setEnablement for [${extensionIds.join(", ")}] to state ${EnablementState[newState]}`,
		);

		if (this.#mainThreadEnablementProxy) {
			// TODO: Implement RPC call to this.#mainThreadEnablementProxy.$setEnablement(extensionIds, newState)
			this._logWarn(
				`setEnablement for [${extensionIds.join(", ")}] - RPC STUBBED, returning all true.`,
			);

			return extensions.map(() => true);
		}

		this._logError(
			`setEnablement for [${extensionIds.join(", ")}] - RPC Proxy unavailable, operation failed.`,
		);

		// Indicate failure
		return extensions.map(() => false);
	}

	// --- IExtensionEnablementService methods (often part of the same ExtHost service) ---

	public isEnabled(extension: Extension): boolean {
		const state = this.getEnablementState(extension);

		// More accurate check based on EnablementState semantics
		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	// Utility method from original JS, not typically part of standard IExtensionEnablementService.
	// It checks if a given state *means* the extension is effectively enabled.
	public isEnablementStateEnabled(state: EnablementState): boolean {
		switch (state) {
			case EnablementState.EnabledGlobally:
			case EnablementState.EnabledWorkspace:
				return true;

			case EnablementState.DisabledByExtensionKind:
			case EnablementState.DisabledByTrustRequirement:
			// Corrected typo from original JS
			case EnablementState.DisabledByEnvironment:
			case EnablementState.DisabledByPolicy:
			case EnablementState.DisabledGlobally:
			case EnablementState.DisabledWorkspace:
				// TODO: Check for newer states like DisabledByVirtualWorkspace, DisabledByExtensionDependency, etc.
				return false;

			default:
				// For unknown or new states, safer to assume not enabled or log a warning.
				this._logWarn(
					`Unknown EnablementState encountered in isEnablementStateEnabled: ${state}`,
				);

				return false;
		}
	}

	public getEnablementStates(
		extensions: Extension[],

		_workspaceType?: undefined,
	): EnablementState[] {
		// The _workspaceType parameter is from an older version of the interface, often unused now.
		this._log(`getEnablementStates for ${extensions.length} extensions`);

		// TODO: If proxy available, could batch this request or make individual calls.
		// For now, calls individual getEnablementState stubs.
		return extensions.map((ext) => this.getEnablementState(ext));
	}

	public get onDidChangeEnablement(): VscodeEvent<readonly Extension[]> {
		// TODO: This event should be fired when this.#mainThreadEnablementProxy notifies of changes,

		// e.g., via an RPC call like $onEnablementChanged.
		// The payload should be the actual ExtensionDescription objects that changed.
		this._logWarnOnce(
			"onDidChangeEnablement STUB - returning NOP event. Real implementation requires main thread notifications.",
		);

		// Return actual emitter if implemented
		return this.#onDidChangeEnablementEmitter.event;

		// Fallback if emitter not yet wired
		// return this._createNopEventEmitter<readonly Extension[]>();
	}

	// --- ExtHostExtensionEnablementShape methods (called by Mountain) ---
	public $onEnablementChanged(changedExtensionIdsFromMain: string[]): void {
		this._log(
			`Received $onEnablementChanged from Mountain for IDs: [${changedExtensionIdsFromMain.join(", ")}]`,
		);

		// TODO: This requires having access to the full IExtensionDescription objects for these IDs
		// to fire the onDidChangeEnablement event with the correct payload.
		// This implies ShimExtensionEnablementService might need access to IExtHostExtensionService
		// or a registry to look up extensions by ID.
		// For now, this is a placeholder.
		// Example:
		// const changedExtensions: Extension[] = [];

		// for (const idStr of changedExtensionIdsFromMain) {

		//     const ext = await someWayToGetExtensionDescription(idStr);

		//     if (ext) changedExtensions.push(ext);

		// }

		// if (changedExtensions.length > 0) {

		//     this.#onDidChangeEnablementEmitter.fire(Object.freeze(changedExtensions));

		// }

		this._logWarnOnce(
			"$onEnablementChanged received but not fully implemented to fetch Extension objects and fire event.",
		);
	}

	// For completeness, if _createNopEventEmitter is used from base:
	// protected _createNopEventEmitter<T = any>(): VscodeEvent<T> {

	// 	return () => ({ dispose: () => {} });

	// }
}
