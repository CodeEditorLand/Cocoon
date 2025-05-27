/*---------------------------------------------------------------------------------------------
 * Cocoon Telemetry Shim (telemetry-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IExtHostTelemetry` service interface.
 * In a full VS Code environment, this service is responsible for collecting and sending
 * telemetry events (usage data, errors, performance metrics) from the extension host
 * to the main thread's `MainThreadTelemetry` service. This process respects user
 * privacy settings, primarily through different telemetry levels (e.g., off, errors only, all).
 *
 * For Cocoon, this shim aims to:
 * - Implement the `IExtHostTelemetry` API surface.
 * - Retrieve essential telemetry identifiers (machineId, sessionId, language, etc.) from
 *   initialization data (`ExtHostInitData`) provided by Mountain.
 * - Log telemetry events locally to the console if telemetry is not completely disabled
 *   (i.e., `currentTelemetryLevel` is not `TelemetryLevel.NONE`).
 * - Forward telemetry events (`publicLog`, `publicLog2`) to a `MainThreadTelemetry`
 *   service on Mountain via RPC, if such a service is available and the current
 *   telemetry level permits sending.
 * - Handle telemetry level updates (`$initializeTelemetryLevel`, `$onDidChangeTelemetryLevel`)
 *   pushed from Mountain, which control the verbosity and actual transmission of telemetry data.
 * - Provide a channel for reporting extension errors via `onExtensionError`, although primary
 *   error handling and reporting usually go through `ErrorHandler` and `ExtHostExtensionService`.
 *
 * Full telemetry processing, including sophisticated event classification, GDPR compliance
 * for all data points, and integration with a dedicated telemetry backend, are typically
 * responsibilities of the main application (Mountain) and its telemetry infrastructure.
 * This shim focuses on collection and forwarding from the extension host context.
 *
 * Responsibilities (as a shim):
 * - Implementing the `IExtHostTelemetry` interface (for DI and API consistency).
 * - Implementing the `ExtHostTelemetryShape` (for RPC calls from Mountain, like level updates).
 * - Providing `getTelemetryInfo()` using data sourced from the injected `IExtHostInitDataService`.
 * - Implementing `publicLog()` and `publicLog2()` to log events locally and, if configured
 *   and permitted by the telemetry level, send them to Mountain via RPC.
 * - Handling `onExtensionError()` by logging the error information.
 * - Dynamically updating its internal telemetry level based on RPC calls received from Mountain.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostTelemetry` is registered with Dependency Injection in `Cocoon/index.ts`.
 * - It can be injected into other services like `ExtHostExtensionService` for error reporting or by
 *   extensions (via `vscode.env.createTelemetryLogger` if that API were shimmed) to send custom telemetry.
 * - If an RPC proxy to `MainContext.MainThreadTelemetry` is available and configured in Mountain, *
 *   this shim forwards `publicLog` and `publicLog2` calls.
 * - It receives telemetry level updates from Mountain via the `$initializeTelemetryLevel` and
 *   `$onDidChangeTelemetryLevel` RPC methods, which it implements as part of `ExtHostTelemetryShape`.
 * - Uses `BaseCocoonShim` for common utilities (RPC proxy retrieval, logging).
 * - Critically relies on `IExtHostInitDataService` (injected) for providing essential
 *   environment and telemetry identifiers.
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
// VS Code internal telemetry level enum and the ITelemetryInfo interface
import {
	TelemetryLevel,
	type ITelemetryInfo,
} from "vs/platform/telemetry/common/telemetry";
import {
	// For registering this service to handle RPC calls from MainThread
	ExtHostContext,
	// For identifying the MainThreadTelemetry service to proxy calls to
	MainContext,
	// The RPC shape this service implements for calls from MainThread
	type ExtHostTelemetryShape as VscodeExtHostTelemetryShape,
	// The RPC shape of the MainThreadTelemetry service
	type MainThreadTelemetryShape as VscodeMainThreadTelemetryShape,
} from "vs/workbench/api/common/extHost.protocol";
// Dependency for `getTelemetryInfo`: provides `ExtHostInitData`.
import type {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
// The actual VS Code interface this shim implements for DI and public API consistency.
import type { IExtHostTelemetry as VscodeIExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";

import {
	BaseCocoonShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

/**
 * Cocoon's implementation of `IExtHostTelemetry`.
 * It sources telemetry identifiers from `initData`, logs telemetry events locally, *
 * and forwards them to a `MainThreadTelemetry` service on Mountain if available, *
 * respecting configured telemetry levels pushed from Mountain.
 */
export class ShimExtHostTelemetry
	extends BaseCocoonShim
	implements VscodeIExtHostTelemetry, VscodeExtHostTelemetryShape
{
	// Required by VS Code's service type system.
	public readonly _serviceBrand: undefined;

	readonly #mainThreadTelemetryProxy: VscodeMainThreadTelemetryShape | null =
		null;

	// Default to NO telemetry until explicitly initialized by MainThread.
	#currentTelemetryLevel: TelemetryLevel = TelemetryLevel.NONE;

	// Store the revived initialization data.
	private readonly _initData: ExtHostInitData;

	/**
	 * Creates an instance of ShimExtHostTelemetry.
	 * @param rpcService The RPC service adapter for communication with Mountain.
	 * @param logService The logging service instance.
	 * @param initDataService Service providing initialization data from Mountain, used for telemetry identifiers.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		// Injected dependency
		initDataService: IExtHostInitDataService,
	) {
		super("ExtHostTelemetry", rpcService, logService);

		// Store the readily available initData
		this._initData = initDataService.value;

		// Use Info for major lifecycle
		this._logInfo("Initialized.");

		if (this._rpcService) {
			this.#mainThreadTelemetryProxy = this._getProxy(
				MainContext.MainThreadTelemetry as ProxyIdentifier<VscodeMainThreadTelemetryShape>,
			);

			// Register this ExtHostTelemetry instance to handle RPC calls (like level updates) from MainThreadTelemetry.
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostTelemetry as ProxyIdentifier<VscodeExtHostTelemetryShape>,

					this,
				);

				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostContext.ExtHostTelemetry).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostTelemetry:",

					e,
				);
			}
		}

		if (!this.#mainThreadTelemetryProxy) {
			this._logWarn(
				"MainThreadTelemetry RPC proxy not available. Telemetry events will only be logged locally " +
					"(if current telemetry level permits) and will NOT be sent to Mountain.",
			);
		}
	}

	// --- IExtHostTelemetry Implementation ---

	/**
	 * {@inheritDoc VscodeIExtHostTelemetry.getTelemetryInfo}
	 *
	 *
	 *
	 * Retrieves telemetry-related information about the environment. This data is sourced
	 * from the `ExtHostInitData` provided by Mountain during the extension host's startup.
	 * @returns A promise resolving to an `ITelemetryInfo` object containing identifiers and environment details.
	 */
	public async getTelemetryInfo(): Promise<ITelemetryInfo> {
		this._logService?.trace(
			"getTelemetryInfo() called, sourcing data from initData.",
		);

		return {
			sessionId: this._initData.telemetryInfo.sessionId,

			machineId: this._initData.telemetryInfo.machineId,

			instanceId:
				this._initData.telemetryInfo.instanceId ||
				// instanceId might be same as sessionId in some contexts
				this._initData.telemetryInfo.sessionId,

			// Often same as machineId, can be undefined
			sqmId: this._initData.telemetryInfo.sqmId,

			// BCP 47 language tag, default to 'en'
			language: this._initData.environment.appLanguage || "en",

			// ISO 8601 string format
			firstSessionDate: this._initData.telemetryInfo.firstSessionDate,

			// Boolean, if applicable to the environment
			msftInternal: this._initData.telemetryInfo.msftInternal,

			// Typically empty at this ExtHost level; enriched by the main telemetry service later.
			commonProperties: {},

			// Not typically part of ExtHostInitData; usually tracked by the main telemetry service.
			lastSessionDate: undefined,
		};
	}

	/**
	 * {@inheritDoc VscodeIExtHostTelemetry.setEnabled}
	 *
	 *
	 *
	 * This method is often related to user consent for telemetry collection.
	 * The actual operational telemetry *level* (e.g., All, ErrorOnly, Crash, None)
	 * is controlled by `$initializeTelemetryLevel` or `$onDidChangeTelemetryLevel` from Mountain.
	 * If this method is called with `false` and the current level implies data sending,
	 *
	 *
	 *
	 * the local level is proactively set to `TelemetryLevel.NONE` to immediately halt data collection,
	 *
	 *
	 *
	 * pending confirmation from Mountain.
	 *
	 * @param isEnabled `true` if telemetry collection is generally permitted by the user; `false` otherwise.
	 */
	public setEnabled(isEnabled: boolean): void {
		this._logInfo(
			`API setEnabled(${isEnabled}) called. Current effective telemetry level from MainThread: ${TelemetryLevel[this.#currentTelemetryLevel]}.`,
		);

		if (!isEnabled && this.#currentTelemetryLevel !== TelemetryLevel.NONE) {
			this._logInfo(
				"setEnabled(false): Telemetry explicitly disabled via API. Setting local operational level to NONE. " +
					"Mountain should confirm this change via $onDidChangeTelemetryLevel if user settings were updated globally.",
			);

			// This updates the local understanding and behavior immediately.
			// Mountain should ideally also send an $onDidChangeTelemetryLevel(TelemetryLevel.NONE)
			// if this `setEnabled(false)` call corresponds to a user changing global telemetry settings.
			this.$initializeTelemetryLevel(
				TelemetryLevel.NONE,

				this._initData.telemetryInfo.telemetryLevel !==
					// Pass previous 'supportsTelemetry' state
					TelemetryLevel.NONE,

				// productConfig
				undefined,
			);
		}

		// In VS Code, this might also interact with a dedicated `TelemetryEnablementService` or broadcast this change internally.
	}

	/**
	 * {@inheritDoc VscodeIExtHostTelemetry.publicLog}
	 *
	 *
	 *
	 * Logs a public telemetry event. These events are typically anonymized and should not
	 * contain Personally Identifiable Information (PII) or customer content unless explicitly
	 * classified and handled according to GDPR and privacy policies.
	 * The event is logged locally (if level permits) and, if an RPC proxy is available and the
	 * telemetry level allows sending usage data, forwarded to Mountain.
	 */
	public publicLog(eventName: string, data?: Record<string, any>): void {
		if (this.#currentTelemetryLevel === TelemetryLevel.NONE) {
			this._logService?.trace(
				`publicLog: Telemetry is OFF. Event '${eventName}' was not logged or sent.`,
			);

			// Respect telemetry level: do nothing if telemetry is off.
			return;
		}

		const dataSummary = data
			? JSON.stringify(data).substring(0, 100) +
				(JSON.stringify(data).length > 100 ? "..." : "")
			: "(no data)";

		this._logDebug(
			`Telemetry publicLog: EventName='${eventName}', DataSample=${dataSummary} (CurrentLevel: ${TelemetryLevel[this.#currentTelemetryLevel]})`,
		);

		// Attempt to send to MainThread if proxy is available and level permits sending usage data.
		// This is typically a fire-and-forget operation from the extension host's perspective.
		if (
			this.#mainThreadTelemetryProxy &&
			this.#currentTelemetryLevel >= TelemetryLevel.USAGE
		) {
			this.#mainThreadTelemetryProxy
				.$publicLog(eventName, data)
				.catch((err) => {
					this._logError(
						`Failed to send publicLog event '${eventName}' to MainThreadTelemetry on Mountain:`,

						err,
					);
				});
		} else if (this.#currentTelemetryLevel < TelemetryLevel.USAGE) {
			this._logService?.trace(
				`publicLog: Event '${eventName}' logged locally but not sent to Mountain due to TelemetryLevel (${TelemetryLevel[this.#currentTelemetryLevel]}) being less than USAGE.`,
			);
		}
	}

	/**
	 * {@inheritDoc VscodeIExtHostTelemetry.publicLog2}
	 *
	 *
	 *
	 * Logs a "version 2" public telemetry event that adheres to stricter GDPR typing
	 * for its data payload using `ClassifiedEvent` and `IGDPRProperty`.
	 */
	public publicLog2<
		E extends ClassifiedEvent<OmitMetadata<T>> = never,
		T extends IGDPRProperty = never,
	>(
		eventName: string,

		// Data must conform to GDPR-defined types.
		data?: StrictPropertyCheck<T, E>,
	): void {
		if (this.#currentTelemetryLevel === TelemetryLevel.NONE) {
			return;
		}

		const dataSummary = data
			? JSON.stringify(data).substring(0, 100) +
				(JSON.stringify(data).length > 100 ? "..." : "")
			: "(no data)";

		this._logDebug(
			`Telemetry publicLog2 (GDPR-typed): EventName='${eventName}', DataSample=${dataSummary} (CurrentLevel: ${TelemetryLevel[this.#currentTelemetryLevel]})`,
		);

		if (
			this.#mainThreadTelemetryProxy &&
			this.#currentTelemetryLevel >= TelemetryLevel.USAGE
		) {
			this.#mainThreadTelemetryProxy
				.$publicLog2(eventName, data)
				.catch((err) => {
					this._logError(
						`Failed to send publicLog2 event '${eventName}' to MainThreadTelemetry on Mountain:`,

						err,
					);
				});
		} else if (this.#currentTelemetryLevel < TelemetryLevel.USAGE) {
			this._logService?.trace(
				`publicLog2: Event '${eventName}' logged locally but not sent to Mountain due to TelemetryLevel (${TelemetryLevel[this.#currentTelemetryLevel]}) being less than USAGE.`,
			);
		}
	}

	/**
	 * {@inheritDoc VscodeIExtHostTelemetry.onExtensionError}
	 *
	 *
	 *
	 * Reports an error that occurred within an extension. This serves as a telemetry channel
	 * for extension errors. Primary error handling and user notification are typically
	 * managed by Cocoon's central `ErrorHandler` and `ExtHostExtensionService`.
	 * @param extension The `ExtensionIdentifier` of the extension where the error occurred.
	 * @param error The `Error` object or `SerializedError` representing the error.
	 * @param _silent If true, this might hint that the error should not be shown to the user
	 *                (though this shim primarily logs it for telemetry purposes).
	 * @returns `false`, indicating the error is not considered "handled" solely by this
	 *          telemetry reporting mechanism, allowing other handlers to process it.
	 */
	public onExtensionError(
		extension: ExtensionIdentifier,

		error: Error | SerializedError,

		_silent?: boolean,
	): boolean {
		this._logError(
			`Telemetry: Extension Error Report. Extension='${extension.value}'. Error:`,

			error,
		);

		// In a full VS Code setup, this error information might also be sent to MainThreadTelemetry.
		// Example:
		// Check if error telemetry is enabled
		// if (this.#mainThreadTelemetryProxy && this.#currentTelemetryLevel >= TelemetryLevel.ERROR) {

		//    const serialized = error instanceof Error ? transformErrorForSerialization(error) : error;

		//    this.#mainThreadTelemetryProxy.$onExtensionError(extension.value, serialized).catch(err => {

		//        this._logError(`Failed to send onExtensionError report for '${extension.value}' to MainThread:`, err);

		//    });

		// }

		// However, in Cocoon, the main error reporting path is typically:
		// `ExtHostExtensionService` catches runtime error -> notifies `MainThreadExtensionService.$onExtensionRuntimeError` -> `ErrorHandler.onUnexpectedError`.
		// This `onExtensionError` method here provides an additional, telemetry-focused channel if needed.

		// Returning false indicates that this telemetry report does not "handle" the error
		// in terms of preventing further processing (e.g., by the global ErrorHandler).
		return false;
	}

	// --- ExtHostTelemetryShape RPC Methods (called BY MainThread/Mountain) ---

	/**
	 * {@inheritDoc VscodeExtHostTelemetryShape.$initializeTelemetryLevel}
	 *
	 *
	 *
	 * Initializes or updates the telemetry level for the extension host (Cocoon).
	 * This method is called by `MainThreadTelemetry` (Mountain) to set the initial
	 * telemetry level or to reflect subsequent changes in user privacy settings.
	 * @param level The new `TelemetryLevel` (e.g., All, Error, Crash, Off).
	 * @param supportsTelemetry Whether the product build generally supports telemetry (usually true).
	 * @param productConfig Optional product-specific configuration, which might specify if
	 *                      usage data or error data collection is enabled/disabled independently.
	 */
	public $initializeTelemetryLevel(
		level: TelemetryLevel,

		supportsTelemetry: boolean,

		productConfig?: {
			usage?: boolean;

			error?: boolean;

			[key: string]: any;
		},
	): void {
		const oldLevel = this.#currentTelemetryLevel;

		// Update the local understanding of the effective telemetry level.
		this.#currentTelemetryLevel = level;

		this._logInfo(
			`RPC $initializeTelemetryLevel: Effective TelemetryLevel changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}. ` +
				`ProductSupportsTelemetry=${supportsTelemetry}. ProductConfig=${productConfig ? JSON.stringify(productConfig) : "N/A"}.`,
		);

		// TODO (Future Refinement): If `productConfig` (e.g., fine-grained enable/disable for 'usage' vs. 'error' telemetry)
		// needs to be strictly respected by this shim to filter specific event types even if the overall `level` is high
		// (e.g., `level` is ALL but `productConfig.usage` is false), then `productConfig` should be stored and
		// checked within `publicLog`/`publicLog2` before sending data to Mountain.
		// For the current MVP, sending decisions are primarily based on `this.#currentTelemetryLevel`.
	}

	/**
	 * {@inheritDoc VscodeExtHostTelemetryShape.$onDidChangeTelemetryLevel}
	 *
	 *
	 *
	 * Updates the telemetry level when it changes dynamically (e.g., user changes privacy settings
	 * in the main application UI, and Mountain propagates this change to Cocoon).
	 * @param level The new `TelemetryLevel`.
	 */
	public $onDidChangeTelemetryLevel(level: TelemetryLevel): void {
		const oldLevel = this.#currentTelemetryLevel;

		this.#currentTelemetryLevel = level;

		this._logInfo(
			`RPC $onDidChangeTelemetryLevel: Effective TelemetryLevel changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}.`,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like its own event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// If this shim had its own event emitters or other complex resources, they would be disposed here.
		// Use Info for major lifecycle.
		this._logInfo("Disposed.");
	}
}
