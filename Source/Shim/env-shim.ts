/*---------------------------------------------------------------------------------------------
 * Cocoon Environment API Shim (env-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env` API namespace. This service provides extensions with
 * information about the application environment (e.g., app name, machine ID, UI kind), *
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
 * - Populating read-only environment properties (e.g., `appName`, `appRoot`, `machineId`, *
 *   `language`, `isRemote`, `uiKind`) from `ExtHostInitData`.
 * - Providing `env.clipboard` by using an injected `IExtHostClipboardServiceShape` instance.
 * - Implementing `env.openExternal(uri)` and `env.asExternalUri(uri)` by making RPC calls
 *   to `MainThreadWindow`.
 * - Managing and firing `onDidChangeTelemetryLevel` and `onDidChangeShell` events when
 *   notified by Mountain (via RPC calls to this service's `$setTelemetryLevel` and `$setShell`).
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
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For URI DTO creation
import { MarshalledId } from "vs/base/common/marshalling";
// For appRoot scheme check
import { Schemas } from "vs/base/common/network";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// For onDidChangeTelemetryLevel type
import type { TelemetryLevel } from "vs/platform/telemetry/common/telemetry";
import {
	ExtHostContext,
	MainContext,
	type ExtHostEnvShape as VscodeExtHostEnvShape,
} from "vs/workbench/api/common/extHost.protocol";
// For MainThreadWindow proxy, ExtHostContext for self-registration, and RPC shape
import {
	IExtHostInitDataService,
	type ExtHostInitData,
} from "vs/workbench/api/common/extHostInitDataService";
// Import from public 'vscode' API definition
import {
	// The full vscode.env API type
	env as VscodeEnvAPI,
	Uri as VscodeUri,
	// Enum from vscode namespace (UIKind.Desktop, UIKind.Web)
	type UIKind,
	type Clipboard as VscodeClipboard,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
// Shape for the injected clipboard service
import type { IExtHostClipboardServiceShape } from "./clipboard-shim";

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.env` that this shim implements for DI.
 * It directly matches the `vscode.env` API surface exposed to extensions.
 */
export interface IExtHostEnvServiceShape extends VscodeEnvAPI {
	// Standard DI mechanism for type-safe DI
	readonly _serviceBrand: undefined;
}

/**
 * RPC shape for methods on `MainThreadWindow` relevant to `vscode.env` operations
 * like opening external URIs and resolving them for external use.
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
 * It sources data from `ExtHostInitData` and delegates some operations via RPC or to other shims.
 */
export class ShimExtHostEnvService
	extends BaseCocoonShim
	implements IExtHostEnvServiceShape, VscodeExtHostEnvShape
{
	// Implements public API shape and RPC shape for MainThread calls
	public readonly _serviceBrand: undefined;

	private readonly _initData: ExtHostInitData;

	// Instance of ShimExtHostClipboardService
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

		// Injected
		initDataService: IExtHostInitDataService,

		// Injected
		clipboardService: IExtHostClipboardServiceShape,
	) {
		super("ExtHostEnvService", rpcService, logService);

		// Get the raw init data
		this._initData = initDataService.value;

		// Use the injected clipboard service
		this.clipboard = clipboardService;

		// Use Info for major lifecycle
		this._logInfo("Initialized.");

		if (this._rpcService) {
			this._mainThreadWindowProxy = this._getProxy(
				MainContext.MainThreadWindow as ProxyIdentifier<MainThreadWindowProxyForEnv>,
			);

			// Register this service instance with the RPC system to handle calls from the main thread (e.g., MainThreadEnvService)
			// This is necessary for methods like $setTelemetryLevel and $setShell to be callable by Mountain.
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
		// Workspace trust state. Prefer workspace-specific trust if available from initData,

		// fallback to environment global trust, then default to true if no trust info provided.
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
		// For a Node.js based environment like Cocoon, this typically defaults to the system's shell.
		// The main process (Mountain) might provide a user-configured shell via initData if it's relevant
		// for contexts like an integrated terminal, but `env.shell` usually refers to a more general default.
		// The `$setShell` RPC call allows Mountain to update this if it changes.
		// TODO: If Mountain pushes shell updates via `$setShell`, this getter should ideally reflect that pushed value.
		// For now, it reflects the environment of the Cocoon process.
		return (
			(process.platform === "win32"
				? process.env.ComSpec
				: process.env.SHELL) || "unknown_shell_in_cocoon_env"
		);
	}

	get uiKind(): UIKind {
		// `this._initData.uiKind` is a number from IExtensionHostInitData.
		// The public `vscode.UIKind` enum is 1 for Desktop, 2 for Web.
		// Ensure mapping is correct based on how `_initData.uiKind` is populated by Mountain.
		// Assuming Mountain uses 0 for Desktop and 1 for Web (older VS Code internal pattern), map to public API values.
		// If Mountain uses 1 for Desktop, 2 for Web directly, adjust mapping.
		const internalUiKindNum = this._initData.uiKind;

		// Internal 0 (Desktop) -> vscode.UIKind.Desktop (1)
		if (internalUiKindNum === 0) return 1;

		// Internal 1 (Web) -> vscode.UIKind.Web (2)
		if (internalUiKindNum === 1) return 2;

		// Fallback if Mountain sends values already matching vscode.UIKind enum
		if (internalUiKindNum === 1 /* vscode.UIKind.Desktop */) return 1;

		if (internalUiKindNum === 2 /* vscode.UIKind.Web */) return 2;

		this._logWarn(
			`Unknown uiKind value ('${internalUiKindNum}') from initData. Defaulting to UIKind.Desktop (1). Check initData.uiKind mapping from Mountain.`,
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
		// Check `product.quality` first (standard in VS Code), then fallback to a top-level `quality` property in initData.
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

				"Received:",

				target,
			);

			return false;
		}

		this._logDebug(
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

				refineErrorForShim(e, this._logService, "openExternal RPC"),
			);

			return false;
		}
	}

	async asExternalUri(target: VscodeUri): Promise<VscodeUri> {
		if (!(target instanceof VscodeUri)) {
			this._logError(
				"env.asExternalUri: Invalid target URI provided. Must be a vscode.Uri instance. Returning original URI.",

				"Received:",

				target,
			);

			// Return original if invalid input
			return target;
		}

		this._logDebug(
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

			// `allowContributedOpeners: false` is typical for `asExternalUri` when the intent is to get a
			// URL for external OS handling, not for opening within VS Code via a contributed opener.
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

				refineErrorForShim(e, this._logService, "asExternalUri RPC"),
			);

			// Fallback to original target URI on error
			return target;
		}
	}

	/**
	 * Helper to convert an internal `VSCodeInternalURI` to a marshalled DTO suitable for RPC.
	 * This ensures a consistent DTO structure, including `$mid` for VS Code's marshalling.
	 * @param uri The internal URI (`vs/base/common/uri.URI`) to convert.
	 * @returns URI components DTO (`VSCodeInternalUriComponents`) suitable for RPC transfer.
	 */
	private _internalUriToMarshalledDto(
		uri: VSCodeInternalURI,
	): VSCodeInternalUriComponents {
		// This should produce a structure compatible with what RPCProtocol expects
		// and what MainThread services can revive using `URI.revive()`.
		return {
			// Using UriSimple for a lighter payload. MainThread can revive this.
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			// `external` and `fsPath` are not part of UriSimple DTO.
			// If full components (like those from `uri.toJSON()`) are needed by Mountain,

			// use `MarshalledId.Uri` and include them, or ensure Mountain can handle UriSimple.
		};
	}

	// --- Methods for VscodeExtHostEnvShape (these are called by MainThread via RPC) ---
	/**
	 * {@inheritDoc VscodeExtHostEnvShape.$setTelemetryLevel}
	 *
	 *
	 * Called by the MainThread (e.g., MainThreadEnvService) to update the telemetry level
	 * in the extension host. This then fires the `onDidChangeTelemetryLevel` event.
	 * @param level The new telemetry level (e.g., All, Error, Crash, Off).
	 */
	public $setTelemetryLevel(level: TelemetryLevel): void {
		const currentLevelInInitData =
			(this._initData.telemetryInfo as any).telemetryLevel ??
			TelemetryLevel.NONE;

		this._logInfo(
			`RPC $setTelemetryLevel: Level received from MainThread: ${TelemetryLevel[level]}. Previous effective level in initData: ${TelemetryLevel[currentLevelInInitData]}.`,
		);

		// Update a local cache if _initData.telemetryInfo is meant to be the source of truth for telemetry level.
		// This makes `this.telemetryInfo.telemetryLevel` (if exposed) reflect the latest.
		(this._initData.telemetryInfo as any).telemetryLevel = level;

		this._onDidChangeTelemetryLevelEmitter.fire(level);
	}

	/**
	 * {@inheritDoc VscodeExtHostEnvShape.$setShell}
	 *
	 *
	 * Called by the MainThread to update the shell path in the extension host.
	 * This then fires the `onDidChangeShell` event.
	 * @param shellPath The new shell path.
	 */
	public $setShell(shellPath: string): void {
		// Get current value from the getter (which reads process.env)
		const oldShell = this.shell;

		this._logInfo(
			`RPC $setShell: Shell path received from MainThread: '${shellPath}'. Previous effective shell: '${oldShell}'.`,
		);

		// If `this.shell` were derived from a mutable property in `_initData`, we would update it here.
		// Since it's currently derived directly from `process.env`, this RPC call primarily serves
		// to fire the `onDidChangeShell` event, notifying extensions that the host-recognized shell has changed.
		// A more complex state management might store this `shellPath` as an override.
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

		this._logInfo("Disposed.");
	}
}
