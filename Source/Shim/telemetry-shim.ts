/*---------------------------------------------------------------------------------------------
 * Cocoon Telemetry Shim (telemetry-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic shim for the `IExtHostTelemetry` service.
 * In VS Code, this service sends telemetry events (usage data, errors) from the
 * extension host to the main thread for aggregation and reporting.
 *
 * For Cocoon's MVP, this shim can be a NOP or simply log telemetry events to the
 * console, as setting up a full telemetry pipeline might be out of scope.
 *
 * Key Interactions:
 * - Injected into services like `AbstractExtHostExtensionService` for error reporting
 *   and general telemetry.
 * - Would interact with `MainThreadTelemetry` via RPC in a full implementation.
 *--------------------------------------------------------------------------------------------*/

import type { SerializedError } from "vs/base/common/errors";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import type {
	ClassifiedEvent,
	IGDPRProperty,
	OmitMetadata,
	StrictPropertyCheck,
} from "vs/platform/telemetry/common/gdprTypings";
// VS Code internal
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry";
import {
	MainContext,
	type ExtHostTelemetryShape as VscodeExtHostTelemetryShape,
	type MainThreadTelemetryShape as VscodeMainThreadTelemetryShape,
} from "vs/workbench/api/common/extHost.protocol";
// Actual VS Code interface
import type { IExtHostTelemetry as VscodeIExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";

import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";

// TODO: Ensure VscodeIExtHostTelemetry and related shapes are correctly imported or defined.
export interface CocoonIExtHostTelemetry extends VscodeIExtHostTelemetry {
	// No Cocoon-specific extensions needed currently.
}

export class ShimExtHostTelemetry
	extends BaseCocoonShim
	implements CocoonIExtHostTelemetry, VscodeExtHostTelemetryShape
{
	public readonly _serviceBrand: undefined;

	#mainThreadTelemetryProxy: VscodeMainThreadTelemetryShape | null = null;

	// Default to NONE
	#currentTelemetryLevel: TelemetryLevel = TelemetryLevel.NONE;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostTelemetry", rpcService, logService);

		// this._log("Initialized (basic stub).");

		if (this._rpcService) {
			this.#mainThreadTelemetryProxy = this._getProxy(
				MainContext.MainThreadTelemetry as ProxyIdentifier<VscodeMainThreadTelemetryShape>,
			);

			// Register self if MainThread calls methods on this ExtHost service
			// this._rpcService.set(ExtHostContext.ExtHostTelemetry, this);
		}

		// if (!this.#mainThreadTelemetryProxy) {

		//     this._logWarn("MainThreadTelemetry proxy not available. Telemetry will only be logged locally.");

		// }
	}

	// --- IExtHostTelemetry Implementation ---
	public getTelemetryInfo(): Promise<{
		machineId: string;

		sessionId: string;

		instanceId: string;

		sqmId?: string | undefined;

		language: string;
	}> {
		this._logWarnOnce("getTelemetryInfo STUB - returning dummy values.");

		// TODO: This should get actual machineId, sessionId from IExtHostInitDataService if available.
		return Promise.resolve({
			machineId: "cocoon-shim-machine-id",

			sessionId: "cocoon-shim-session-id",

			instanceId: "cocoon-shim-instance-id",

			language: "en",
		});
	}

	public setEnabled(isEnabled: boolean): void {
		// This method is often about user's telemetry consent.
		// The actual level is usually set by $initializeTelemetryLevel.
		this._log(
			`setEnabled(${isEnabled}) called. Current level: ${TelemetryLevel[this.#currentTelemetryLevel]}.`,
		);

		if (!isEnabled && this.#currentTelemetryLevel > TelemetryLevel.NONE) {
			// If disabling, set to NONE. If enabling, main thread should set specific level.
			// Or some other logic
			// this.$initializeTelemetryLevel(TelemetryLevel.NONE, false);
		}
	}

	public publicLog(eventName: string, data?: Record<string, any>): void {
		if (this.#currentTelemetryLevel === TelemetryLevel.NONE) return;

		this._log(
			`Telemetry publicLog: '${eventName}'`,

			data ? JSON.stringify(data).substring(0, 100) : "",
		);

		// Fire and forget
		this.#mainThreadTelemetryProxy?.$publicLog(eventName, data);
	}

	public publicLog2<
		E extends ClassifiedEvent<OmitMetadata<T>> = never,
		T extends IGDPRProperty = never,
	>(eventName: string, data?: StrictPropertyCheck<T, E>): void {
		if (this.#currentTelemetryLevel === TelemetryLevel.NONE) return;

		this._log(
			`Telemetry publicLog2: '${eventName}'`,

			data ? JSON.stringify(data).substring(0, 100) : "",
		);

		// Fire and forget
		this.#mainThreadTelemetryProxy?.$publicLog2(eventName, data);
	}

	public onExtensionError(
		extension: ExtensionIdentifier,

		error: Error | SerializedError,

		silent?: boolean,
	): boolean {
		this._logError(
			`Error reported by extension '${extension.value}':`,

			error,
		);

		// In VS Code, this would send the error to MainThreadExtensionService.$onExtensionRuntimeError
		// and potentially also to MainThreadTelemetry.
		// For this shim, just log it. The ExtHostExtensionService shim already calls IPC for errors.
		// Returning false means the error is not considered "handled" by telemetry alone.
		return false;
	}

	// --- ExtHostTelemetryShape RPC Methods (called by MainThread) ---
	public $initializeTelemetryLevel(
		level: TelemetryLevel,

		supportsTelemetry: boolean,

		productConfig?: { usage: boolean; error: boolean },
	): void {
		this.#currentTelemetryLevel = level;

		this._log(
			`RPC $initializeTelemetryLevel: New level=${TelemetryLevel[level]}, SupportsTelemetry=${supportsTelemetry}, ConfiguredProduct=${!!productConfig}`,
		);

		// TODO: Store productConfig if needed for filtering.
	}

	public $onDidChangeTelemetryLevel(level: TelemetryLevel): void {
		this.#currentTelemetryLevel = level;

		this._log(
			`RPC $onDidChangeTelemetryLevel: New level=${TelemetryLevel[level]}`,
		);
	}
}
