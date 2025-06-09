/*
 * File: Cocoon/Source/Shim/EnvShim.ts
 * Responsibility: Implements the vscode.env API for the Cocoon sidecar, proxying environment properties and operations like URI handling and telemetry to the Mountain backend via RPC while maintaining VS Code extension compatibility.
 * Modified: 2025-06-07 05:37:40 UTC
 * Dependency: ./clipboard-shim, vs/base/common/marshalling, vs/base/common/network, vs/platform/log/common/log
 * Export: IExtHostEnvServiceShape, ShimExtHostEnvService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Environment API Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env` API namespace. This service provides extensions with
 * information about the application environment (e.g., app name, machine ID, UI kind),
 * and functionalities such as clipboard access, opening external URIs, and URI scheme
 * handling.
 *
 * Most environment properties are derived from initialization data (`ExtHostInitData`)
 * received from the Mountain host. Operations like clipboard access and opening
 * external URIs are proxied: clipboard access is delegated to an injected
 * `IExtHostClipboardServiceShape` (which typically uses direct IPC), and external URI
 * operations are proxied via RPC to `MainThreadWindow` on Mountain.
 *
 * Responsibilities:
 * - Implementing the `vscode.env` API interface.
 * - Populating read-only environment properties (e.g., `appName`, `appRoot`, `machineId`,
 *   `language`, `isRemote`, `uiKind`) from `ExtHostInitData`.
 * - Providing `env.clipboard` by using an injected `IExtHostClipboardServiceShape` instance.
 * - Implementing `env.openExternal(uri)` and `env.asExternalUri(uri)` by making RPC calls
 *   to `MainThreadWindow`.
 * - Managing and firing `onDidChangeTelemetryLevel`, `onDidChangeTelemetryEnabled`, and `onDidChangeShell` events when
 *   notified by Mountain (via RPC calls to this service's `$setTelemetryLevel`, `$onDidChangeTelemetryLevel`, and `$setShell`).
 *
 * Key Interactions:
 * - Registered with Dependency Injection (e.g., in `Cocoon/index.ts`) as `IExtHostEnv`
 *   (a VS Code internal DI key).
 * - An instance is made available to extensions as `vscode.env` via the API factory.
 * - Relies on `IExtHostInitDataService` (for `_initData`) and `IExtHostClipboardServiceShape`
 *   (for `env.clipboard`), both injected via DI.
 * - Uses an RPC proxy to `MainContext.MainThreadWindow` for `openExternal` and `asExternalUri`.
 * - Implements `VscodeExtHostEnvShape` and registers itself with the RPC service to handle
 *   calls from the main thread (e.g., for telemetry level or shell updates).
 * - Uses `BaseCocoonShim` for common utilities like logging and RPC proxy acquisition.
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling"; // For URI DTO creation
import { Schemas } from "vs/base/common/network"; // For appRoot scheme check

import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import { LogLevel } from "vs/platform/log/common/log"; // For mapping platform LogLevel to API LogLevel

import {
	TelemetryLevel, // VS Code internal enum for telemetry levels
	type TelemetryLevel as VscodePlatformTelemetryLevel, // Explicit type alias for platform level
} from "vs/platform/telemetry/common/telemetry";
import {
	ExtHostContext,
	MainContext,
	type ExtHostEnvShape as VscodeExtHostEnvShape, // RPC shape this service implements
} from "vs/workbench/api/common/extHost.protocol";
import {
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
// Import from public 'vscode' API definition
import {
	LogLevel as VscodeApiLogLevel, // Public API LogLevel enum
	env as VscodeEnvAPI, // The full vscode.env API type
	UIKind as VscodeUIKind, // Public API UIKind enum
	Uri as VscodeUri,
	type Clipboard as VscodeClipboard,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
import type { IExtHostClipboardServiceShape } from "./clipboard-shim"; // Shape for the injected clipboard service

// --- Type Definitions ---

/** Defines the service interface for `vscode.env` that this shim implements for DI. */
export interface IExtHostEnvServiceShape extends VscodeEnvAPI {
	readonly _serviceBrand: undefined; // Standard DI mechanism for type-safe DI
}

/** RPC shape for methods on `MainThreadWindow` relevant to `vscode.env` operations. */
interface MainThreadWindowProxyForEnv {
	$openUri(
		uriDto: VSCodeInternalUriComponents,
		options?: {
			allowExternalSchemes?: boolean;
			allowContributedOpeners?: boolean | string;
		},
	): Promise<boolean>;
	$asExternalUri(
		uriDto: VSCodeInternalUriComponents,
		options?: { allowContributedOpeners?: boolean },
	): Promise<VSCodeInternalUriComponents>;
}

/** Cocoon's implementation of the `vscode.env` API namespace. */
export class ShimExtHostEnvService
	extends BaseCocoonShim
	implements IExtHostEnvServiceShape, VscodeExtHostEnvShape
{
	public readonly _serviceBrand: undefined;
	private readonly _initData: ExtHostInitData;
	public readonly clipboard: VscodeClipboard; // Instance of ShimExtHostClipboardService
	private _mainThreadWindowProxy: MainThreadWindowProxyForEnv | null = null;

	#currentTelemetryLevel: VscodePlatformTelemetryLevel = TelemetryLevel.NONE;
	#currentShellPath: string;

	private readonly _onDidChangeTelemetryLevelEmitter =
		this._instanceDisposables.add(new VscodeEmitter<VscodeApiLogLevel>());
	public readonly onDidChangeTelemetryLevel: VscodeEvent<VscodeApiLogLevel> =
		this._onDidChangeTelemetryLevelEmitter.event;

	private readonly _onDidChangeTelemetryEnabledEmitter =
		this._instanceDisposables.add(new VscodeEmitter<boolean>());
	public readonly onDidChangeTelemetryEnabled: VscodeEvent<boolean> =
		this._onDidChangeTelemetryEnabledEmitter.event;

	private readonly _onDidChangeShellEmitter = this._instanceDisposables.add(
		new VscodeEmitter<string>(),
	);
	public readonly onDidChangeShell: VscodeEvent<string> =
		this._onDidChangeShellEmitter.event;

	// For env.logLevel, not telemetry. Requires IExtHostLogService or similar. NOP for now.
	public readonly onDidChangeLogLevel: VscodeEvent<VscodeApiLogLevel> =
		VscodeEvent.None;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		initDataService: IExtHostInitDataService,
		clipboardService: IExtHostClipboardServiceShape,
	) {
		super("ExtHostEnvService", rpcService, logService);
		this._initData = initDataService.value;
		this.clipboard = clipboardService;
		this.#currentShellPath =
			(process.platform === "win32"
				? process.env.ComSpec
				: process.env.SHELL) || "unknown_shell_in_cocoon_env";
		this.#currentTelemetryLevel =
			this._initData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;

		this._logInfo(
			`Initialized. Initial shell: '${this.#currentShellPath}', Initial TelemetryLevel: ${TelemetryLevel[this.#currentTelemetryLevel]}`,
		);

		if (this._rpcService) {
			this._mainThreadWindowProxy = this._getProxy(
				MainContext.MainThreadWindow as ProxyIdentifier<MainThreadWindowProxyForEnv>,
			);
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostEnv as ProxyIdentifier<VscodeExtHostEnvShape>,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostEnv).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostEnv:",
					e,
				);
			}
		}
		if (!this._mainThreadWindowProxy) {
			this._logWarn(
				"MainThreadWindow RPC proxy NOT available. `env.openExternal` and `env.asExternalUri` will be impaired or fail.",
			);
		}
	}

	get appName(): string {
		return (
			this._initData.environment.appName || "Cocoon Hosted Application"
		);
	}
	get appRoot(): string | undefined {
		const appRootUriComponents = this._initData.environment.appRoot;
		if (appRootUriComponents) {
			const revivedUri = VSCodeInternalURI.revive(appRootUriComponents);
			return revivedUri.scheme === Schemas.file
				? revivedUri.fsPath
				: undefined;
		}
		return undefined;
	}
	get appHost(): string {
		return this._initData.environment.appHost || "desktop";
	}
	get uriScheme(): string {
		return this._initData.environment.appUriScheme || "cocoon-code-editor";
	}
	get language(): string {
		return this._initData.environment.appLanguage || "en";
	}
	get machineId(): string {
		return (
			this._initData.telemetryInfo.machineId || "cocoon-shim-machine-id"
		);
	}
	get sessionId(): string {
		return (
			this._initData.telemetryInfo.sessionId || "cocoon-shim-session-id"
		);
	}
	get isTrusted(): boolean {
		return (
			this._initData.workspace?.trusted ??
			this._initData.environment.isTrusted ??
			true
		);
	}
	get isRemote(): boolean {
		return !!this._initData.remote?.isRemote;
	}
	get remoteName(): string | undefined {
		const authority = this._initData.remote?.authority;
		if (authority) {
			const plusIdx = authority.indexOf("+");
			return plusIdx === -1 ? authority : authority.substring(0, plusIdx);
		}
		return undefined;
	}
	get shell(): string {
		return this.#currentShellPath;
	}
	get uiKind(): VscodeUIKind {
		const internalUiKindNum = this._initData.uiKind;
		if (internalUiKindNum === VscodeUIKind.Desktop)
			return VscodeUIKind.Desktop;
		if (internalUiKindNum === VscodeUIKind.Web) return VscodeUIKind.Web;
		this._logWarnOnce(
			`Unknown uiKind value ('${internalUiKindNum}') from initData. Defaulting to UIKind.Desktop.`,
		);
		return VscodeUIKind.Desktop;
	}
	get isNewAppInstall(): boolean {
		const isNew = (this._initData as any).isNewAppInstall;
		if (isNew === undefined) {
			this._logWarnOnce(
				"env.isNewAppInstall: Value not provided. Defaulting to false.",
			);
		}
		return isNew === true;
	}
	get isBuilt(): boolean {
		const quality =
			(this._initData as any).product?.quality ||
			(this._initData as any).quality;
		if (quality === undefined) {
			this._logWarnOnce(
				"env.isBuilt: Product quality not provided. Assuming dev build (isBuilt=false).",
			);
			return false;
		}
		return quality !== "development";
	}

	get logLevel(): VscodeApiLogLevel {
		// TODO: This should reflect the log level of the *extension host process* itself,
		// which might be different from specific logger instances.
		// This might need an IExtHostLogService dependency to get its current level.
		// Or if `ILogService` DI in BaseCocoonShim is for the main ExtHost log, use that.
		const mainLoggerLevel = this._logService?.getLevel();
		if (mainLoggerLevel !== undefined) {
			switch (mainLoggerLevel) {
				case LogLevel.Trace:
					return VscodeApiLogLevel.Trace;
				case LogLevel.Debug:
					return VscodeApiLogLevel.Debug;
				case LogLevel.Info:
					return VscodeApiLogLevel.Info;
				case LogLevel.Warning:
					return VscodeApiLogLevel.Warning;
				case LogLevel.Error:
					return VscodeApiLogLevel.Error;
				case LogLevel.Off:
					return VscodeApiLogLevel.Off;
				default:
					return VscodeApiLogLevel.Info;
			}
		}
		this._logWarnOnce(
			"env.logLevel: Cannot determine main ExtHost log level. Defaulting to Info.",
		);
		return VscodeApiLogLevel.Info;
	}

	get isTelemetryEnabled(): boolean {
		return (
			this.#currentTelemetryLevel !== TelemetryLevel.NONE &&
			this.#currentTelemetryLevel !== TelemetryLevel.OFF
		);
	}

	async openExternal(target: VscodeUri): Promise<boolean> {
		if (!(target instanceof VscodeUri)) {
			this._logError(
				"env.openExternal: Invalid target URI. Must be vscode.Uri instance.",
				"Received:",
				target,
			);
			return false;
		}
		this._logDebug(
			`env.openExternal: Attempting to open URI='${target.toString(true)}'`,
		);
		if (!this._mainThreadWindowProxy) {
			this._logError(
				"Cannot env.openExternal: MainThreadWindow RPC proxy is unavailable.",
			);
			return false;
		}
		try {
			const internalUri = VSCodeInternalURI.from(target);
			const uriDto = this._internalUriToMarshalledDto(internalUri);
			return await this._mainThreadWindowProxy.$openUri(uriDto, {
				allowExternalSchemes: true,
			});
		} catch (e: any) {
			this._logError(
				"env.openExternal: RPC call failed or URI conversion error:",
				refineErrorForShim(e, this._logService, "openExternal RPC"),
			);
			return false;
		}
	}

	async asExternalUri(target: VscodeUri): Promise<VscodeUri> {
		if (!(target instanceof VscodeUri)) {
			this._logError(
				"env.asExternalUri: Invalid target URI. Must be vscode.Uri instance. Returning original.",
				"Received:",
				target,
			);
			return target;
		}
		this._logDebug(
			`env.asExternalUri: Resolving URI='${target.toString(true)}'`,
		);
		if (!this._mainThreadWindowProxy) {
			this._logError(
				"Cannot env.asExternalUri: MainThreadWindow RPC proxy unavailable. Returning original URI.",
			);
			return target;
		}
		try {
			const internalUri = VSCodeInternalURI.from(target);
			const uriDto = this._internalUriToMarshalledDto(internalUri);
			const resultUriDto =
				await this._mainThreadWindowProxy.$asExternalUri(uriDto, {
					allowContributedOpeners: false, // Typically false for `asExternalUri` which is about system handlers
				});
			return VscodeUri.from(VSCodeInternalURI.revive(resultUriDto));
		} catch (e: any) {
			this._logError(
				"env.asExternalUri: RPC call failed or URI conversion error:",
				refineErrorForShim(e, this._logService, "asExternalUri RPC"),
			);
			return target;
		}
	}

	private _internalUriToMarshalledDto(
		uri: VSCodeInternalURI,
	): VSCodeInternalUriComponents {
		return {
			$mid: MarshalledId.UriSimple,
			scheme: uri.scheme,
			authority: uri.authority,
			path: uri.path,
			query: uri.query,
			fragment: uri.fragment,
		};
	}

	public $setTelemetryLevel(level: VscodePlatformTelemetryLevel): void {
		const oldIsEnabled = this.isTelemetryEnabled;
		const oldPlatformLevel = this.#currentTelemetryLevel;
		this.#currentTelemetryLevel = level;
		const newIsEnabled = this.isTelemetryEnabled;

		this._logInfo(
			`RPC $setTelemetryLevel: Platform TelemetryLevel changed from ${TelemetryLevel[oldPlatformLevel]} to ${TelemetryLevel[level]}. isTelemetryEnabled change: ${oldIsEnabled} -> ${newIsEnabled}.`,
		);

		let apiLogLevel: VscodeApiLogLevel;
		switch (level) {
			case TelemetryLevel.NONE:
			case TelemetryLevel.OFF:
				apiLogLevel = VscodeApiLogLevel.Off;
				break;
			case TelemetryLevel.ERROR:
				apiLogLevel = VscodeApiLogLevel.Error;
				break;
			case TelemetryLevel.USAGE:
				apiLogLevel = VscodeApiLogLevel.Info;
				break;
			case TelemetryLevel.ALL:
				apiLogLevel = VscodeApiLogLevel.Trace;
				break;
			default:
				apiLogLevel = VscodeApiLogLevel.Info;
		}
		this._onDidChangeTelemetryLevelEmitter.fire(apiLogLevel);

		if (oldIsEnabled !== newIsEnabled) {
			this._onDidChangeTelemetryEnabledEmitter.fire(newIsEnabled);
		}
	}

	public $onDidChangeTelemetryLevel(
		level: VscodePlatformTelemetryLevel,
	): void {
		this.$setTelemetryLevel(level);
	}

	public $setShell(shellPath: string): void {
		const oldShell = this.#currentShellPath;
		this.#currentShellPath = shellPath;
		this._logInfo(
			`RPC $setShell: Shell path updated by MainThread from '${oldShell}' to '${shellPath}'.`,
		);
		if (oldShell !== shellPath) {
			this._onDidChangeShellEmitter.fire(shellPath);
		}
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
