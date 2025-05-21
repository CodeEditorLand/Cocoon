// Shim for IWorkbenchExtensionEnablementService (ExtHost side)
// Not used in current implementation
// import { sendToMountainAndWait } from "../cocoon-ipc";

// For onDidChangeEnablement
import { Event as VscodeEvent } from "vs/base/common/event";
// Assuming bundled
// For Extension type
import { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import {
	EnablementState,
	// This is often the interface implemented by ExtHost
	IGlobalExtensionEnablementService,
} from "vs/workbench/services/extensionManagement/common/extensionManagement";

// Import ILogService from baseShim
import { ILogService } from "./_baseShim";

// Define a basic Extension type if not already available from a broader import
// This usually comes from IExtensionDescription or a similar type in VS Code
interface Extension extends IExtensionDescription {
	// Already in IExtensionDescription
	// identifier: { value: string };
	// other properties if needed by this shim...
}

export class ShimExtensionEnablementService
	implements IGlobalExtensionEnablementService
{
	public readonly _serviceBrand: undefined;

	readonly #logService?: ILogService;

	constructor(logService?: ILogService) {
		this.#logService = logService;

		this._log(`Initialized.`);
	}

	private _log(message: string, ...args: any[]): void {
		this.#logService?.trace(`[Cocoon Shim Enablement] ${message}`, ...args);
	}

	// IGlobalExtensionEnablementService methods:
	public getEnablementState(extension: Extension): EnablementState {
		this._log(`getEnablementState for ${extension.identifier.value}`);

		// For MVP, maybe assume ALL extensions passed in initData are enabled?
		// Or proxy the check? Proxying is safer but requires IPC/RPC.
		// TODO: Implement proxy call `enablement_getState` if needed.
		// MVP Stub: Assume enabled globally.
		return EnablementState.EnabledGlobally;
	}

	public async setEnablement(
		extensions: Extension[],

		newState: EnablementState,
	): Promise<boolean[]> {
		this._log(
			`setEnablement for ${extensions.map((e) => e.identifier.value).join(", ")} to state ${newState} - STUB`,
		);

		// In a real scenario, this would involve an RPC call to MainThreadExtensionEnablementService.$setEnablement
		// and would return a promise of booleans indicating success for each extension.
		// For MVP stub, return array of true.
		return Promise.resolve(extensions.map(() => true));
	}

	// IExtensionEnablementService methods (often part of the same ExtHost service):
	public isEnabled(extension: Extension): boolean {
		// A more accurate check would consider all EnablementState values that mean "enabled"
		const state = this.getEnablementState(extension);

		return (
			state === EnablementState.EnabledGlobally ||
			state === EnablementState.EnabledWorkspace
		);
	}

	// This specific method might not be part of the common IExtensionEnablementService interface
	// but was in the original JS. It's more of a utility.
	public isEnabledEnablementState(state: EnablementState): boolean {
		return (
			state !== EnablementState.DisabledByExtensionKind &&
			state !== EnablementState.DisabledByTrustRequirement &&
			// Corrected typo from original js
			state !== EnablementState.DisabledByEnvironement &&
			state !== EnablementState.DisabledByPolicy &&
			state !== EnablementState.DisabledGlobally &&
			state !== EnablementState.DisabledWorkspace &&
			// Added newer states
			state !== EnablementState.DisabledByVirtualWorkspace
			// This check should be: is it one of the "enabled" states?
			// E.g., state === EnablementState.EnabledGlobally || state === EnablementState.EnabledWorkspace
		);
	}

	public getEnablementStates(
		extensions: Extension[],

		workspaceType?: undefined,
	): EnablementState[] {
		this._log(
			`getEnablementStates for ${extensions.length} extensions - STUB`,
		);

		return extensions.map((ext) => this.getEnablementState(ext));
	}

	// Event must be provided
	// Use a NOP event emitter for MVP if not proxied from Mountain
	public get onDidChangeEnablement(): VscodeEvent<readonly Extension[]> {
		this._log("onDidChangeEnablement STUB - returning NOP event.");

		return this._createNopEvent();
	}

	private _createNopEvent<T = any>(): VscodeEvent<T> {
		// Simple NOP event
		return () => ({ dispose: () => {} });
	}

	// Methods from IExtensionManagementServerService (if this shim aims to cover more)
	// getExtensionManagementServer(extension: IExtensionDescription): IExtensionManagementServer | undefined;

	// getLocalExtensionManagementServer(): IExtensionManagementServer;

	// getRemoteExtensionManagementServer(): IExtensionManagementServer | null;
}

// Original JS export
// module.exports = { ShimExtensionEnablementService };

// `export class ...` handles this in TS.
