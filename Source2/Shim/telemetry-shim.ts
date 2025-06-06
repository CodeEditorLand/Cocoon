/*---------------------------------------------------------------------------------------------
 * Cocoon Telemetry Shim 
 * --------------------------------------------------------------------------------------------
 * Provides a shim implementation for the `IExtHostTelemetry` service interface.
 * This service handles telemetry event collection and forwarding from the extension host
 * to the Mountain host process, respecting user privacy settings and telemetry levels.
 *
 * Responsibilities:
 * - Implementing `IExtHostTelemetry` and `ExtHostTelemetryShape` (for RPC from Mountain).
 * - Retrieving telemetry identifiers (machineId, sessionId, etc.) from `IExtHostInitDataService`.
 * - Logging telemetry events (`publicLog`, `publicLog2`) locally to the console if the
 *   current telemetry level is not `NONE` or `OFF`.
 * - Forwarding telemetry events to `MainThreadTelemetry` on Mountain via RPC, if a proxy
 *   is available and the telemetry level and product configuration permit sending.
 * - Handling telemetry level updates (`$initializeTelemetryLevel`, `$onDidChangeTelemetryLevel`)
 *   pushed from Mountain.
 * - Reporting extension errors via `onExtensionError` (logs locally and forwards via RPC if permitted).
 *
 * Key Interactions:
 * - Registered with DI in `Cocoon/index.ts`.
 * - Consumed by `ExtHostExtensionService` for error reporting, and potentially by a future
 *   `vscode.env.createTelemetryLogger` shim.
 * - RPCs to `MainContext.MainThreadTelemetry` on Mountain.
 * - Receives telemetry level updates from Mountain via its `ExtHostTelemetryShape` methods.
 * - Uses `BaseCocoonShim` for common utilities.
 * - Relies on `IExtHostInitDataService` for telemetry identifiers.
 *
 * TODO:
 *  - If `vscode.env.createTelemetryLogger` is implemented, ensure it integrates correctly
 *    with this service for event sending and level/productConfig checks.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	transformErrorForSerialization,
	type SerializedError,
} from "vs/base/common/errors";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";
import type {
	ClassifiedEvent,
	IGDPRProperty,
	OmitMetadata,
	StrictPropertyCheck,
} from "vs/platform/telemetry/common/gdprTypings";
import {
	TelemetryLevel,
	type ITelemetryInfo,
	type TelemetryLevel as VscodePlatformTelemetryLevel, // Alias for clarity
} from "vs/platform/telemetry/common/telemetry";
import {
	ExtHostContext,
	MainContext,
	type ExtHostTelemetryShape as VscodeExtHostTelemetryShape,
	type MainThreadTelemetryShape as VscodeMainThreadTelemetryShape,
} from "vs/workbench/api/common/extHost.protocol";
import type {
	ExtHostInitData, // Used for type hint
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
// Import IExtHostTelemetry to ensure interface implementation
import type { IExtHostTelemetry as VscodeIExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

/**
 * Represents product-specific telemetry configuration, typically from product.json.
 * This allows fine-grained opting out of specific telemetry categories.
 */
interface ProductTelemetryConfig {
	usage?: boolean; // If true, opt-out of usage/publicLog data
	error?: boolean; // If true, opt-out of error data
	[key: string]: any; // Allow other product-specific flags
}

export class ShimExtHostTelemetry
	extends BaseCocoonShim
	implements VscodeIExtHostTelemetry, VscodeExtHostTelemetryShape
{
	public readonly _serviceBrand: undefined; // Required by VS Code's service type system
	readonly #mainThreadTelemetryProxy: VscodeMainThreadTelemetryShape | null =
		null;
	#currentTelemetryLevel: VscodePlatformTelemetryLevel = TelemetryLevel.NONE; // Default to no telemetry until initialized
	#productTelemetryConfig: ProductTelemetryConfig | undefined = undefined;
	private readonly _initData: ExtHostInitData; // Store revived initData

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		initDataService: IExtHostInitDataService, // Injected
	) {
		super("ExtHostTelemetry", rpcService, logService);
		this._initData = initDataService.value; // Store the raw, revived initData

		// Initialize telemetry level and product config from initData
		this.#currentTelemetryLevel =
			this._initData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
		// Assuming product.json might have a 'telemetry' object or 'telemetryOptOut' for configuration
		this.#productTelemetryConfig =
			(this._initData.product as any)?.telemetryOptOut ||
			(this._initData.product as any)?.telemetry;

		this._logInfo(
			`Initialized. Initial TelemetryLevel: ${TelemetryLevel[this.#currentTelemetryLevel]}. Product telemetry config: ${JSON.stringify(this.#productTelemetryConfig)}`,
		);

		if (this._rpcService) {
			this.#mainThreadTelemetryProxy = this._getProxy(
				MainContext.MainThreadTelemetry as ProxyIdentifier<VscodeMainThreadTelemetryShape>,
			);
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostTelemetry as ProxyIdentifier<VscodeExtHostTelemetryShape>,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostTelemetry).",
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
				"MainThreadTelemetry RPC proxy NOT available. Telemetry events will only be logged locally (if telemetry level permits).",
			);
		}
	}

	/** {@inheritDoc VscodeIExtHostTelemetry.getTelemetryInfo} */
	public async getTelemetryInfo(): Promise<ITelemetryInfo> {
		this._logService?.trace("getTelemetryInfo() called.");
		// Data is sourced from ExtHostInitData provided by Mountain.
		return {
			sessionId: this._initData.telemetryInfo.sessionId,
			machineId: this._initData.telemetryInfo.machineId,
			instanceId:
				this._initData.telemetryInfo.instanceId ||
				this._initData.telemetryInfo.sessionId, // Fallback instanceId to sessionId
			sqmId: this._initData.telemetryInfo.sqmId,
			language: this._initData.environment.appLanguage || "en", // Typically BCP 47
			firstSessionDate: this._initData.telemetryInfo.firstSessionDate,
			msftInternal: this._initData.telemetryInfo.msftInternal,
			commonProperties: {}, // Not typically populated by ExtHost side
			lastSessionDate: undefined, // Not typically part of ExtHostInitData
		};
	}

	/** {@inheritDoc VscodeIExtHostTelemetry.setEnabled} */
	public setEnabled(isEnabled: boolean): void {
		this._logInfo(
			`API setEnabled(${isEnabled}) called. Current TelemetryLevel: ${TelemetryLevel[this.#currentTelemetryLevel]}.`,
		);
		// If telemetry is being explicitly disabled by this call, update local level to OFF.
		// Mountain controls the actual level via $initializeTelemetryLevel/$onDidChangeTelemetryLevel.
		if (
			!isEnabled &&
			this.#currentTelemetryLevel !== TelemetryLevel.NONE &&
			this.#currentTelemetryLevel !== TelemetryLevel.OFF
		) {
			this._logInfo(
				"setEnabled(false): Explicitly disabling telemetry. Setting local level to OFF pending MainThread confirmation.",
			);
			this.$initializeTelemetryLevel(
				TelemetryLevel.OFF,
				this._initData.telemetryInfo.telemetryLevel !==
					TelemetryLevel.NONE, // Previous supportsTelemetry state
				this.#productTelemetryConfig, // Pass current product config
			);
		}
		// If isEnabled is true, we don't unilaterally change the level here; Mountain dictates the actual level.
	}

	/** {@inheritDoc VscodeIExtHostTelemetry.publicLog} */
	public publicLog(eventName: string, data?: Record<string, any>): void {
		if (
			this.#currentTelemetryLevel === TelemetryLevel.NONE ||
			this.#currentTelemetryLevel === TelemetryLevel.OFF
		) {
			this._logService?.trace(
				`publicLog: Telemetry OFF. Event '${eventName}' NOT sent.`,
			);
			return;
		}
		if (this.#productTelemetryConfig?.usage === true) {
			// true in optOut means DO NOT SEND usage telemetry
			this._logService?.trace(
				`publicLog: Product config opts out of usage telemetry. Event '${eventName}' logged locally ONLY.`,
			);
			this._logDebug(
				`Local Telemetry publicLog: Event='${eventName}', DataSample=${JSON.stringify(data)?.substring(0, 100)}...`,
			);
			return;
		}

		this._logDebug(
			`Telemetry publicLog: Event='${eventName}', DataSample=${JSON.stringify(data)?.substring(0, 100)}...`,
		);
		if (
			this.#mainThreadTelemetryProxy &&
			this.#currentTelemetryLevel >= TelemetryLevel.USAGE
		) {
			this.#mainThreadTelemetryProxy
				.$publicLog(eventName, data)
				.catch((err) =>
					this._logError(
						`Failed to send publicLog event '${eventName}' to Mountain:`,
						err,
					),
				);
		}
	}

	/** {@inheritDoc VscodeIExtHostTelemetry.publicLog2} */
	public publicLog2<
		E extends ClassifiedEvent<OmitMetadata<T>> = never,
		T extends IGDPRProperty = never,
	>(eventName: string, data?: StrictPropertyCheck<T, E>): void {
		if (
			this.#currentTelemetryLevel === TelemetryLevel.NONE ||
			this.#currentTelemetryLevel === TelemetryLevel.OFF
		) {
			this._logService?.trace(
				`publicLog2: Telemetry OFF. Event '${eventName}' NOT sent.`,
			);
			return;
		}
		if (this.#productTelemetryConfig?.usage === true) {
			// true in optOut means DO NOT SEND usage telemetry
			this._logService?.trace(
				`publicLog2: Product config opts out of usage telemetry. Event '${eventName}' logged locally ONLY.`,
			);
			this._logDebug(
				`Local Telemetry publicLog2 (GDPR): Event='${eventName}', DataSample=${JSON.stringify(data)?.substring(0, 100)}...`,
			);
			return;
		}

		this._logDebug(
			`Telemetry publicLog2 (GDPR): Event='${eventName}', DataSample=${JSON.stringify(data)?.substring(0, 100)}...`,
		);
		if (
			this.#mainThreadTelemetryProxy &&
			this.#currentTelemetryLevel >= TelemetryLevel.USAGE
		) {
			this.#mainThreadTelemetryProxy
				.$publicLog2(eventName, data)
				.catch((err) =>
					this._logError(
						`Failed to send publicLog2 event '${eventName}' to Mountain:`,
						err,
					),
				);
		}
	}

	/** {@inheritDoc VscodeIExtHostTelemetry.onExtensionError} */
	public onExtensionError(
		extension: ExtensionIdentifier,
		error: Error | SerializedError,
		_silent?: boolean,
	): boolean {
		const serializableError =
			error instanceof Error
				? transformErrorForSerialization(error)
				: error;
		this._logError(
			`Telemetry: Extension Error Report. Ext='${extension.value}'. ErrName: ${serializableError.name}, Msg: ${serializableError.message}. Stack (sample): ${serializableError.stack?.substring(0, 100)}...`,
		);

		if (
			this.#currentTelemetryLevel === TelemetryLevel.NONE ||
			this.#currentTelemetryLevel === TelemetryLevel.OFF
		) {
			this._logService?.trace(
				`onExtensionError: Telemetry OFF. Error for '${extension.value}' NOT sent.`,
			);
			return false;
		}
		if (this.#productTelemetryConfig?.error === true) {
			// true in optOut means DO NOT SEND error telemetry
			this._logService?.trace(
				`onExtensionError: Product config opts out of error telemetry. Error for '${extension.value}' logged locally ONLY.`,
			);
			return false;
		}

		if (
			this.#mainThreadTelemetryProxy &&
			this.#currentTelemetryLevel >= TelemetryLevel.ERROR
		) {
			this._logDebug(
				`Forwarding extension error for '${extension.value}' to Mountain.`,
			);
			this.#mainThreadTelemetryProxy
				.$onExtensionError(extension.value, serializableError)
				.catch((err) =>
					this._logError(
						`Failed to send onExtensionError report for '${extension.value}' to Mountain:`,
						err,
					),
				);
		}
		// Returning false indicates the error is not "handled" by telemetry alone.
		return false;
	}

	// --- ExtHostTelemetryShape RPC Methods (called BY MainThread) ---

	/** {@inheritDoc VscodeExtHostTelemetryShape.$initializeTelemetryLevel} */
	public $initializeTelemetryLevel(
		level: VscodePlatformTelemetryLevel,
		supportsTelemetry: boolean, // From product.json on MainThread
		productConfig?: ProductTelemetryConfig, // Product-specific telemetry opt-out flags
	): void {
		const oldLevel = this.#currentTelemetryLevel;
		this.#currentTelemetryLevel = level;
		this.#productTelemetryConfig =
			productConfig || this.#productTelemetryConfig; // Update if provided

		this._logInfo(
			`RPC $initializeTelemetryLevel: Effective TelemetryLevel set to ${TelemetryLevel[level]}. ` +
				`ProductSupportsTelemetry=${supportsTelemetry}. Product Config: ${JSON.stringify(this.#productTelemetryConfig)}. OldLevel: ${TelemetryLevel[oldLevel]}.`,
		);
		// Further actions based on level change (e.g., notifying other services or vscode.env)
		// would be handled by the service responsible for vscode.env.onDidChangeTelemetryEnabled.
	}

	/** {@inheritDoc VscodeExtHostTelemetryShape.$onDidChangeTelemetryLevel} */
	public $onDidChangeTelemetryLevel(
		level: VscodePlatformTelemetryLevel,
	): void {
		const oldLevel = this.#currentTelemetryLevel;
		this.#currentTelemetryLevel = level;
		this._logInfo(
			`RPC $onDidChangeTelemetryLevel: Effective TelemetryLevel changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}.`,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._logInfo("Disposed.");
	}
}
