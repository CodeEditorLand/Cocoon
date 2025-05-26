/*---------------------------------------------------------------------------------------------
 * Cocoon Environment API Shim (shims/env-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env` API namespace. This service provides extensions with
 * information about the application environment (e.g., app name, machine ID, UI kind),
 *
 * and functionalities such as clipboard access, opening external URIs, and URI scheme
 * handling.
 *
 * Most environment properties are derived from initialization data (`ExtHostInitData`)
 * received from the Mountain host (main process). Operations like clipboard access and opening
 * external URIs are proxied: clipboard to a dedicated clipboard shim (which might use IPC),
 *
 * and external URI operations via RPC to `MainThreadWindow`.
 *
 * Responsibilities:
 * - Implementing the `vscode.env` API interface.
 * - Populating read-only environment properties (e.g., `appName`, `machineId`, `language`,
 *
 *   `isRemote`, `uiKind`) from `ExtHostInitData`.
 * - Providing `env.clipboard` by using an injected `IExtHostClipboardServiceShape` instance.
 * - Implementing `env.openExternal(uri)` and `env.asExternalUri(uri)` by making RPC calls
 *   to `MainThreadWindow`.
 * - Managing and firing `onDidChangeTelemetryLevel` and `onDidChangeShell` events when
 *   notified by Mountain (via RPC calls to this service's `$setTelemetryLevel` and `$setShell`).
 *
 * Key Interactions:
 * - Registered with Dependency Injection (e.g., in `Cocoon/index.ts`) as `IExtHostEnv` (VS Code internal DI key).
 * - An instance is made available to extensions as `vscode.env` via the API factory.
 * - Relies on `IExtHostInitDataService` (for `_initData`) and `IExtHostClipboardServiceShape`
 *   (for `env.clipboard`), both injected via DI.
 * - Uses an RPC proxy to `MainContext.MainThreadWindow` for `openExternal` and `asExternalUri`.
 * - Exposes methods like `$setTelemetryLevel` to be callable from the main thread via RPC.
 * - Uses `BaseCocoonShim` for common utilities like logging and RPC proxy acquisition.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For URI DTO creation (e.g., $mid)
import { MarshalledId } from "vs/base/common/marshalling";
// For URI scheme checks (e.g., appRoot)
import { Schemas } from "vs/base/common/network";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// For onDidChangeTelemetryLevel event type
import type { TelemetryLevel } from "vs/platform/telemetry/common/telemetry";
import {
	ExtHostContext,
	MainContext,
	type ExtHostEnvShape as VscodeExtHostEnvShape,
} from "vs/workbench/api/common/extHost.protocol";
// For MainThread/ExtHost contexts and RPC shapes
import {
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
// Import from public 'vscode' API definition
import {
	// The full vscode.env API type, useful for type checking
	env as VscodeEnvAPI,
	Uri as VscodeUri,
	// Enum from vscode namespace (UIKind.Desktop, UIKind.Web)
	type UIKind,
	type Clipboard as VscodeClipboard,
} from "vscode";

import {
	BaseCocoonShim,
	// Use the shim-specific error refiner
	refineErrorForShim,
	// Use the specific shim logger type
	type ILogServiceForShim,
	// Use the specific shim RPC adapter type
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
// Shape for the injected clipboard service
import type { IExtHostClipboardServiceShape } from "./clipboard-shim";

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.env` that this shim implements.
 * It directly matches the `vscode.env` API surface exposed to extensions.
 */
export interface IExtHostEnvServiceShape extends VscodeEnvAPI {
	// Standard mechanism for type-safe DI
	readonly _serviceBrand: undefined;
}

/**
 * RPC shape for methods on `MainThreadWindow` relevant to `vscode.env` operations
 * like opening external URIs.
 */
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

/**
 * Cocoon's implementation of the `vscode.env` API namespace.
 * It sources data from `ExtHostInitData` and delegates some operations via RPC.
 */
export class ShimExtHostEnvService
	extends BaseCocoonShim
	implements IExtHostEnvServiceShape, VscodeExtHostEnvShape
{
	public readonly _serviceBrand: undefined;

	private readonly _initData: ExtHostInitData;

	// Instance of the clipboard shim service
	public readonly clipboard: VscodeClipboard;

	private _mainThreadWindowProxy: MainThreadWindowProxyForEnv | null = null;

	// Event Emitters for vscode.env events
	private readonly _onDidChangeTelemetryLevelEmitter =
		new VscodeEmitter<TelemetryLevel>();

	public readonly onDidChangeTelemetryLevel: VscodeEvent<TelemetryLevel> =
		this._onDidChangeTelemetryLevelEmitter.event;

	private readonly _onDidChangeShellEmitter = new VscodeEmitter<string>();

	public readonly onDidChangeShell: VscodeEvent<string> =
		this._onDidChangeShellEmitter.event;

	/**
	 * Creates an instance of ShimExtHostEnvService.
	 * @param rpcService The RPC service adapter for communication with the main thread.
	 * @param logService The logging service for shim-specific messages.
	 * @param initDataService Service providing initialization data from the main process (Mountain).
	 * @param clipboardService The clipboard service implementation (shim).
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		initDataService: IExtHostInitDataService,

		clipboardService: IExtHostClipboardServiceShape,
	) {
		super("ExtHostEnvService", rpcService, logService);

		// Get the raw init data
		this._initData = initDataService.value;

		// Use the injected clipboard service
		this.clipboard = clipboardService;

		this._log("Initialized.");

		if (this._rpcService) {
			this._mainThreadWindowProxy = this._getProxy(
				MainContext.MainThreadWindow as ProxyIdentifier<MainThreadWindowProxyForEnv>,
			);

			// Register this service instance with the RPC system to handle calls from the main thread (e.g., MainThreadEnvService)
			this._rpcService.set(
				ExtHostContext.ExtHostEnv as ProxyIdentifier<VscodeExtHostEnvShape>,

				this,
			);
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

			// Consistent with VS Code: only return fsPath if it's a file URI.
			return revivedUri.scheme === Schemas.file
				? revivedUri.fsPath
				: undefined;
		}

		return undefined;
	}

	get appHost(): string {
		// Typically 'desktop' | 'web' | 'codespaces'
		// Default to 'desktop' if not provided
		return this._initData.environment.appHost || "desktop";
	}

	get uriScheme(): string {
		// The main URI scheme of the application (e.g., 'vscode', 'vscode-insiders', 'cocoon-code').
		return this._initData.environment.appUriScheme || "cocoon-code-editor";
	}

	get language(): string {
		// BCP 47 language tag (e.g., "en", "de", "zh-cn").
		// Default to 'en'
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
		// Workspace trust state. Prefer workspace-specific trust if available, fallback to environment global.
		// Default to true if no trust information is provided.
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

			// Extracts the resolver name, e.g., 'ssh-remote' from 'ssh-remote+myhost'.
			return plusIdx === -1 ? authority : authority.substring(0, plusIdx);
		}

		return undefined;
	}

	get shell(): string {
		// The path to the shell executable.
		// For a Node.js based environment like Cocoon, this defaults to the system's shell.
		// The main process (Mountain) might provide a user-configured shell via initData if it's relevant
		// for contexts like an integrated terminal, but `env.shell` usually refers to a more general default.
		return (
			(process.platform === "win32"
				? process.env.ComSpec
				: process.env.SHELL) || "unknown_shell_in_cocoon_env"
		);
	}

	get uiKind(): UIKind {
		// `this._initData.uiKind` is a number from IExtensionHostInitData (typically 0 for Desktop, 1 for Web in older VS Code internal defs).
		// The public `vscode.UIKind` enum is 1 for Desktop, 2 for Web. We must map correctly.
		const internalUiKindNum = this._initData.uiKind;

		// Map internal 0 (Desktop) to vscode.UIKind.Desktop (1)
		if (internalUiKindNum === 0) return 1;

		// Map internal 1 (Web) to vscode.UIKind.Web (2)
		if (internalUiKindNum === 1) return 2;

		// If _initData provides values already matching vscode.UIKind:
		// if (internalUiKindNum === 1 /* vscode.UIKind.Desktop */) return 1;

		// if (internalUiKindNum === 2 /* vscode.UIKind.Web */) return 2;

		this._logWarn(
			`Unknown uiKind value ('${internalUiKindNum}') from initData. Defaulting to UIKind.Desktop (1). Check initData.uiKind mapping.`,
		);

		// UIKind.Desktop (safe default)
		return 1;
	}

	get isNewAppInstall(): boolean {
		// This information must be provided by the main process (Mountain) in initData.
		// Cast if not standard in ExtHostInitData type
		const isNew = (this._initData as any).isNewAppInstall;

		if (isNew === undefined) {
			this._logWarnOnce(
				"env.isNewAppInstall: Value not provided by Mountain in initData. Defaulting to false.",
			);
		}

		return isNew === true;
	}

	get isBuilt(): boolean {
		// Determines if this is a "built" (release/stable/insiders) version vs. a "development" one.
		// Check `product.quality` first, then fallback to a top-level `quality` property in initData.
		const quality =
			(this._initData as any).product?.quality ||
			(this._initData as any).quality;

		if (quality === undefined) {
			this._logWarnOnce(
				"env.isBuilt: Product quality not provided by Mountain in initData. Assuming not a release build (isBuilt=false).",
			);

			// Safe default if quality is unknown
			return false;
		}

		return quality !== "development";
	}

	async openExternal(target: VscodeUri): Promise<boolean> {
		if (!(target instanceof VscodeUri)) {
			this._logError(
				"env.openExternal: Invalid target URI provided. Must be a vscode.Uri instance.",

				{ targetValue: target },
			);

			return false;
		}

		this._log(
			`env.openExternal: Attempting to open URI='${target.toString(true)}' (skipEncoding=true for logging)`,
		);

		if (!this._mainThreadWindowProxy) {
			this._logError(
				"Cannot env.openExternal: MainThreadWindow RPC proxy is unavailable.",
			);

			// API expects Promise<boolean>
			return Promise.resolve(false);
		}

		try {
			// Convert vscode.Uri (API type) to VSCodeInternalURI, then to VSCodeInternalUriComponents for RPC.
			// Throws if `target` is not a valid URI structure
			const internalUri = VSCodeInternalURI.from(target);

			const uriDto = this._internalUriToMarshalledDto(internalUri);

			// For `env.openExternal`, `allowExternalSchemes: true` is usually implied/safe,

			// allowing schemes like http, https, mailto to be handled by the OS.
			return await this._mainThreadWindowProxy.$openUri(uriDto, {
				allowExternalSchemes: true,
			});
		} catch (e: any) {
			this._logError(
				"env.openExternal: RPC call failed or URI conversion error:",

				refineErrorForShim(e, this._logService, "openExternal"),
			);

			return false;
		}
	}

	async asExternalUri(target: VscodeUri): Promise<VscodeUri> {
		if (!(target instanceof VscodeUri)) {
			this._logError(
				"env.asExternalUri: Invalid target URI provided. Must be a vscode.Uri instance. Returning original.",

				{ targetValue: target },
			);

			// Return original if invalid input
			return target;
		}

		this._log(
			`env.asExternalUri: Resolving URI='${target.toString(true)}' (skipEncoding=true for logging)`,
		);

		if (!this._mainThreadWindowProxy) {
			this._logError(
				"Cannot env.asExternalUri: MainThreadWindow RPC proxy is unavailable. Returning original URI.",
			);

			return target;
		}

		try {
			const internalUri = VSCodeInternalURI.from(target);

			const uriDto = this._internalUriToMarshalledDto(internalUri);

			// `allowContributedOpeners: false` is typical for `asExternalUri` unless specifically wanting app-level openers.
			const resultUriDto =
				await this._mainThreadWindowProxy.$asExternalUri(uriDto, {
					allowContributedOpeners: false,
				});

			// Revive DTO to internal URI
			const revivedInternalUri = VSCodeInternalURI.revive(resultUriDto);

			// Convert internal URI back to API URI (VscodeUri)
			return VscodeUri.from(revivedInternalUri);
		} catch (e: any) {
			this._logError(
				"env.asExternalUri: RPC call failed or URI conversion error:",

				refineErrorForShim(e, this._logService, "asExternalUri"),
			);

			// Fallback to original target URI on error
			return target;
		}
	}

	/**
	 * Helper to convert an internal `VSCodeInternalURI` to a marshalled DTO suitable for RPC.
	 * This ensures a consistent DTO structure, including `$mid` for VS Code's marshalling.
	 * @param uri The internal URI to convert.
	 * @returns URI components suitable for RPC transfer.
	 */
	private _internalUriToMarshalledDto(
		uri: VSCodeInternalURI,
	): VSCodeInternalUriComponents {
		// This should produce a structure compatible with what RPCProtocol expects
		// and what MainThread services can revive using URI.revive().
		return {
			// Using UriSimple for a lighter payload. MainThread can revive this.
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			// `external` and `fsPath` are not part of UriSimple DTO.
			// If full components (like those from `uri.toJSON()`) are needed, use `MarshalledId.Uri` and include them.
		};
	}

	// --- Methods for VscodeExtHostEnvShape (these are called by MainThread via RPC) ---
	/**
	 * Called by the MainThread (e.g., MainThreadEnvService) to update the telemetry level
	 * in the extension host. This then fires the `onDidChangeTelemetryLevel` event.
	 * @param level The new telemetry level.
	 */
	public $setTelemetryLevel(level: TelemetryLevel): void {
		// Assuming telemetryInfo might be part of _initData and could be updated,

		// or it's just for logging the change.
		const currentLevel =
			(this._initData.telemetryInfo as any).telemetryLevel ?? "Unknown";

		this._log(
			`RPC $setTelemetryLevel: Level changed from '${currentLevel}' to '${level}' (Enum values: ${TelemetryLevel[currentLevel]} -> ${TelemetryLevel[level]})`,
		);

		// Optionally update a local cache if _initData.telemetryInfo is meant to be the source of truth
		// (this._initData.telemetryInfo as any).telemetryLevel = level;

		this._onDidChangeTelemetryLevelEmitter.fire(level);
	}

	/**
	 * Called by the MainThread to update the shell path in the extension host.
	 * This then fires the `onDidChangeShell` event.
	 * @param shellPath The new shell path.
	 */
	public $setShell(shellPath: string): void {
		// Get current value from the getter
		const oldShell = this.shell;

		this._log(
			`RPC $setShell: Shell changed from '${oldShell}' to '${shellPath}'`,
		);

		// If `this.shell` were derived from a mutable property in `_initData`, update it here.
		// Since it's derived from process.env, this RPC implies an override or a notification
		// of a change detected by the main process.
		// For this shim, we primarily fire the event. A more complex state management might store this override.
		this._onDidChangeShellEmitter.fire(shellPath);
	}

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters
	 * and any subscriptions managed by the base class.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this._onDidChangeTelemetryLevelEmitter.dispose();

		this._onDidChangeShellEmitter.dispose();

		this._log("Disposed.");
	}
}
