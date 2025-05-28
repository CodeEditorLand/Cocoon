/*---------------------------------------------------------------------------------------------
 * Cocoon Telemetry Shim (telemetry-shim.ts)
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
	type TelemetryLevel as VscodePlatformTelemetryLevel,
} from "vs/platform/telemetry/common/telemetry";
import {
	ExtHostContext,
	MainContext,
	type ExtHostTelemetryShape as VscodeExtHostTelemetryShape,
	type MainThreadTelemetryShape as VscodeMainThreadTelemetryShape,
} from "vs/workbench/api/common/extHost.protocol";
import type {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	isNewAppInstall,
	type IExtHostTelemetry as VscodeIExtHostTelemetry,
} from "vs/workbench/api/common/extHostTelemetry";

// Import helper

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

interface ProductTelemetryConfig {
	// Subset of product.json telemetry config (e.g., product.telemetryOptOut)
	usage?: boolean; // If true, opt-out of usage/publicLog data
	error?: boolean; // If true, opt-out of error data
	[key: string]: any;
}

export class ShimExtHostTelemetry
	extends BaseCocoonShim
	implements VscodeIExtHostTelemetry, VscodeExtHostTelemetryShape
{
	public readonly _serviceBrand: undefined;
	readonly #mainThreadTelemetryProxy: VscodeMainThreadTelemetryShape | null =
		null;
	#currentTelemetryLevel: VscodePlatformTelemetryLevel = TelemetryLevel.NONE;
	#productTelemetryConfig: ProductTelemetryConfig | undefined = undefined;
	private readonly _initData: ExtHostInitData;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		initDataService: IExtHostInitDataService,
	) {
		super("ExtHostTelemetry", rpcService, logService);
		this._initData = initDataService.value;
		this.#currentTelemetryLevel =
			this._initData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
		// Assuming product.telemetryOptOut or similar structure for fine-grained control
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
				"MainThreadTelemetry RPC proxy NOT available. Telemetry events will only be logged locally.",
			);
		}
	}

	public async getTelemetryInfo(): Promise<ITelemetryInfo> {
		this._logService?.trace("getTelemetryInfo() called.");
		return {
			sessionId: this._initData.telemetryInfo.sessionId,
			machineId: this._initData.telemetryInfo.machineId,
			instanceId:
				this._initData.telemetryInfo.instanceId ||
				this._initData.telemetryInfo.sessionId,
			sqmId: this._initData.telemetryInfo.sqmId,
			language: this._initData.environment.appLanguage || "en",
			firstSessionDate: this._initData.telemetryInfo.firstSessionDate,
			msftInternal: this._initData.telemetryInfo.msftInternal,
			commonProperties: {},
			lastSessionDate: undefined,
		};
	}

	public setEnabled(isEnabled: boolean): void {
		this._logInfo(
			`API setEnabled(${isEnabled}) called. Current TelemetryLevel: ${TelemetryLevel[this.#currentTelemetryLevel]}.`,
		);
		if (
			!isEnabled &&
			this.#currentTelemetryLevel !== TelemetryLevel.NONE &&
			this.#currentTelemetryLevel !== TelemetryLevel.OFF
		) {
			this._logInfo(
				"setEnabled(false): Explicitly disabling telemetry. Setting local level to OFF.",
			);
			// Update local state and inform MainThread (if it needs this specific signal beyond level change)
			this.$initializeTelemetryLevel(
				TelemetryLevel.OFF,
				this._initData.telemetryInfo.telemetryLevel !==
					TelemetryLevel.NONE, // Previous supportsTelemetry state
				this.#productTelemetryConfig,
			);
		}
		// If isEnabled is true, we don't change the level here; Mountain controls the actual level.
	}

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
			// true in optOut means do NOT send
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
			// true in optOut means do NOT send
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
			// true in optOut means do NOT send
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
		return false;
	}

	public $initializeTelemetryLevel(
		level: VscodePlatformTelemetryLevel,
		supportsTelemetry: boolean,
		productConfig?: ProductTelemetryConfig,
	): void {
		const oldLevel = this.#currentTelemetryLevel;
		this.#currentTelemetryLevel = level;
		this.#productTelemetryConfig =
			productConfig || this.#productTelemetryConfig; // Update if provided
		this._logInfo(
			`RPC $initializeTelemetryLevel: Effective TelemetryLevel set to ${TelemetryLevel[level]}. ` +
				`ProductSupportsTelemetry=${supportsTelemetry}. Product Config: ${JSON.stringify(this.#productTelemetryConfig)}. OldLevel: ${TelemetryLevel[oldLevel]}.`,
		);
		// Events related to enabled status are fired by env-shim based on this level.
	}

	public $onDidChangeTelemetryLevel(
		level: VscodePlatformTelemetryLevel,
	): void {
		const oldLevel = this.#currentTelemetryLevel;
		this.#currentTelemetryLevel = level;
		this._logInfo(
			`RPC $onDidChangeTelemetryLevel: Effective TelemetryLevel changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}.`,
		);
		// Events related to enabled status are fired by env-shim.
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
