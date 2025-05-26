/*---------------------------------------------------------------------------------------------
 * Cocoon Telemetry Shim (telemetry-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic shim implementation for the `IExtHostTelemetry` service.
 * In a full VS Code environment, this service is responsible for collecting and sending
 * telemetry events (usage data, errors, performance metrics) from the extension host
 * to the main thread (MainThreadTelemetry) for aggregation and reporting, respecting
 * user privacy settings (telemetry levels).
 *
 * For Cocoon's MVP (Minimum Viable Product), this shim primarily:
 * - Logs telemetry events to the console if telemetry is not completely disabled.
 * - Optionally forwards telemetry events to a `MainThreadTelemetry` service via RPC
 *   if such a service is available and configured in Mountain.
 * - Handles telemetry level updates pushed from the main thread.
 *
 * Full telemetry processing, including GDPR compliance for all data points, complex
 * event classification, and integration with a dedicated telemetry backend, is out of
 * scope for this basic shim.
 *
 * Responsibilities (as a shim):
 * - Implementing the `IExtHostTelemetry` interface.
 * - Providing `publicLog` and `publicLog2` methods that respect the current telemetry level.
 * - Handling `onExtensionError` for telemetry purposes (though primary error reporting
 *   is usually via `ErrorHandler`).
 * - Responding to telemetry level changes (`$initializeTelemetryLevel`, `$onDidChangeTelemetryLevel`)
 *   from the main thread.
 *
 * Key Interactions:
 * - Injected into services like `ExtHostExtensionService` (or its shim) for error
 *   reporting and general telemetry originating from extensions or the host itself.
 * - Interacts with `MainThreadTelemetry` via RPC if the proxy is available.
 * - Uses `BaseCocoonShim` for logging and RPC proxy retrieval.
 * - Relies on `TelemetryLevel` enum and GDPR types from VS Code platform.
 *

 *--------------------------------------------------------------------------------------------*/

import type { SerializedError } from "vs/base/common/errors";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import type {
	ClassifiedEvent,
	IGDPRProperty,
	OmitMetadata,
	StrictPropertyCheck,
} from "vs/platform/telemetry/common/gdprTypings";
// VS Code internal telemetry level enum
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry";
import {
	// For RPC MainThread service identifier
	MainContext,
	// Uncomment if this service has methods called by MainThread
	// ExtHostContext,

	// RPC shape for methods called by MainThread
	type ExtHostTelemetryShape as VscodeExtHostTelemetryShape,
	// RPC shape for MainThread proxy
	type MainThreadTelemetryShape as VscodeMainThreadTelemetryShape,
} from "vs/workbench/api/common/extHost.protocol";
// Actual VS Code interface definition
import type { IExtHostTelemetry as VscodeIExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

/**
 * Cocoon's implementation of `IExtHostTelemetry`.
 * It logs telemetry events locally and can forward them to a MainThreadTelemetry service.
 */
export class ShimExtHostTelemetry
	extends BaseCocoonShim
	implements VscodeIExtHostTelemetry, VscodeExtHostTelemetryShape
{
	// Implement both public API and RPC shape
	// Required by VS Code's service types
	public readonly _serviceBrand: undefined;

	#mainThreadTelemetryProxy: VscodeMainThreadTelemetryShape | null = null;

	// Default to no telemetry
	#currentTelemetryLevel: TelemetryLevel = TelemetryLevel.NONE;

	/**
	 * Creates an instance of ShimExtHostTelemetry.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostTelemetry", rpcService, logService);

		// Can be verbose
		// this._log("Initialized.");

		if (this._rpcService) {
			this.#mainThreadTelemetryProxy = this._getProxy(
				MainContext.MainThreadTelemetry as ProxyIdentifier<VscodeMainThreadTelemetryShape>,
			);

			// If MainThreadTelemetry needs to call methods on this ExtHostTelemetry service (e.g., for dynamic config changes):
			// this._rpcService.set(ExtHostContext.ExtHostTelemetry as ProxyIdentifier<VscodeExtHostTelemetryShape>, this);
		}

		if (!this.#mainThreadTelemetryProxy) {
			this._logWarn(
				"MainThreadTelemetry proxy not available. Telemetry events will only be logged locally (if enabled) and not sent to Mountain.",
			);
		}
	}

	// --- IExtHostTelemetry Implementation ---

	/**
	 * Retrieves telemetry-related information about the environment.
	 * In this shim, it returns dummy values. A real implementation would get these
	 * from `IExtHostInitDataService` or similar.
	 * @returns A promise resolving to telemetry information.
	 */
	public async getTelemetryInfo(): Promise<{
		machineId: string;

		sessionId: string;

		instanceId: string;

		// Deprecated in newer VS Code, but keep for interface
		sqmId?: string | undefined;

		// Added from IExtHostTelemetry
		language: string;

		// Added from IExtHostTelemetry
		firstSessionDate?: string;

		// Added from IExtHostTelemetry
		msftInternal?: boolean;
	}> {
		this._logWarnOnce(
			"getTelemetryInfo() STUB - returning dummy values. Real values should come from initData.",
		);

		// TODO: Populate from IExtHostInitDataService.value.telemetryInfo and .environment
		return {
			machineId: "cocoon-shim-machine-id",

			sessionId: "cocoon-shim-session-id",

			instanceId: "cocoon-shim-instance-id",

			language: "en",

			firstSessionDate: new Date().toISOString(),

			msftInternal: false,
		};
	}

	/**
	 * Sets whether telemetry is generally enabled. This is often tied to user consent.
	 * The specific level of telemetry (e.g., All, Error, Crash) is usually set by
	 * `$initializeTelemetryLevel` or `$onDidChangeTelemetryLevel` from the main thread.
	 * @param isEnabled `true` if telemetry should be considered enabled, `false` otherwise.
	 */
	public setEnabled(isEnabled: boolean): void {
		this._log(
			`setEnabled(${isEnabled}) called. Current telemetry level: ${TelemetryLevel[this.#currentTelemetryLevel]}.`,
		);

		// If explicitly disabled, and current level is not NONE, then set to NONE.
		// If enabled, the actual level will be set by MainThread.
		if (!isEnabled && this.#currentTelemetryLevel > TelemetryLevel.NONE) {
			this.$initializeTelemetryLevel(
				TelemetryLevel.NONE,

				false,

				undefined,

				// Update local state and log
			);
		}

		// Note: VS Code's `ExtHostTelemetry` uses this to potentially update its `_telemetryEnablementBroadcaster`.
	}

	/**
	 * Logs a public telemetry event. These events are typically anonymized and do not
	 * contain personally identifiable information (PII) or customer content.
	 * @param eventName The name of the event.
	 * @param data Optional data associated with the event, structured as key-value pairs.
	 */
	public publicLog(eventName: string, data?: Record<string, any>): void {
		if (this.#currentTelemetryLevel === TelemetryLevel.NONE) {
			// Respect telemetry level: do nothing if off.
			return;
		}

		const dataSummary = data
			? JSON.stringify(data).substring(0, 100) +
				(JSON.stringify(data).length > 100 ? "..." : "")
			: "(no data)";

		this._log(
			`Telemetry publicLog: Event='${eventName}', Data=${dataSummary}`,
		);

		// Attempt to send to MainThread if proxy is available. This is fire-and-forget.
		this.#mainThreadTelemetryProxy
			?.$publicLog(eventName, data)
			.catch((err) => {
				this._logError(
					`Failed to send publicLog '${eventName}' to MainThread:`,

					err,
				);
			});
	}

	/**
	 * Logs a "version 2" public telemetry event with stricter GDPR typing.
	 * @template E The classified event type.
	 * @template T The GDPR property type.
	 * @param eventName The name of the event.
	 * @param data Optional data associated with the event, adhering to GDPR property checks.
	 */
	public publicLog2<
		E extends ClassifiedEvent<OmitMetadata<T>> = never,
		T extends IGDPRProperty = never,
	>(
		eventName: string,

		// Data must conform to GDPR types
		data?: StrictPropertyCheck<T, E>,
	): void {
		if (this.#currentTelemetryLevel === TelemetryLevel.NONE) {
			return;
		}

		const dataSummary = data
			? JSON.stringify(data).substring(0, 100) +
				(JSON.stringify(data).length > 100 ? "..." : "")
			: "(no data)";

		this._log(
			`Telemetry publicLog2: Event='${eventName}', Data=${dataSummary}`,
		);

		this.#mainThreadTelemetryProxy
			?.$publicLog2(eventName, data)
			.catch((err) => {
				this._logError(
					`Failed to send publicLog2 '${eventName}' to MainThread:`,

					err,
				);
			});
	}

	/**
	 * Reports an error that occurred within an extension.
	 * This is one channel for error telemetry. Primary error handling is often via `ErrorHandler`.
	 * @param extension The identifier of the extension where the error occurred.
	 * @param error The error object or serialized error.
	 * @param _silent If true, the error might not be shown to the user (unused in this shim's log).
	 * @returns `false`, indicating the error is not considered "handled" by this telemetry report alone.
	 */
	public onExtensionError(
		extension: ExtensionIdentifier,

		error: Error | SerializedError,

		_silent?: boolean,
	): boolean {
		this._logError(
			`Telemetry: Error reported by extension '${extension.value}':`,

			error,
		);

		// In a full VS Code setup, this might call:
		// this.#mainThreadTelemetryProxy?.$onExtensionError(extension.value, error);

		// The main error reporting usually goes through ExtHostExtensionService -> MainThreadExtensionService.$onExtensionRuntimeError
		// and then ErrorHandler.onUnexpectedError. This telemetry method is an additional path.

		// Returning false means the error is not considered "handled" solely by this telemetry logging.
		return false;
	}

	// --- ExtHostTelemetryShape RPC Methods (called by MainThread) ---

	/**
	 * Initializes or updates the telemetry level for the extension host.
	 * Called by `MainThreadTelemetry` to set the initial level or reflect user setting changes.
	 * @param level The new telemetry level.
	 * @param supportsTelemetry Whether the product build supports telemetry.
	 * @param productConfig Optional product-specific configuration for telemetry.
	 */
	public $initializeTelemetryLevel(
		level: TelemetryLevel,

		// Usually true, indicates if telemetry system is active in product
		supportsTelemetry: boolean,

		// Product-specific flags
		productConfig?: { usage: boolean; error: boolean },
	): void {
		const oldLevel = this.#currentTelemetryLevel;

		this.#currentTelemetryLevel = level;

		this._log(
			`RPC $initializeTelemetryLevel: Level changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}. SupportsTelemetry=${supportsTelemetry}. ProductConfig=${JSON.stringify(productConfig)}`,
		);

		// TODO: If productConfig is relevant (e.g., to filter specific event types even if level is high), store it.
	}

	/**
	 * Updates the telemetry level when it changes (e.g., user changes settings).
	 * @param level The new telemetry level.
	 */
	public $onDidChangeTelemetryLevel(level: TelemetryLevel): void {
		const oldLevel = this.#currentTelemetryLevel;

		this.#currentTelemetryLevel = level;

		this._log(
			`RPC $onDidChangeTelemetryLevel: Level changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}.`,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// Dispose any event emitters or resources specific to this shim if they were created.
	}
}
