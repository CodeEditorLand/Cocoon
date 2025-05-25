// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/100_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 43ab9c524faba7b01eca7493fa363fc778d6ec693e00c0a3620f8bf0c73870bf
// Extracted to File: Backup/TSFMSC/Code/env-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:56.990Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE env-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Environment API Shim (shims/env-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env` API namespace, providing information about the application
 * environment and functionalities like clipboard access and opening external URIs.
 *--------------------------------------------------------------------------------------------*/

import { Emitter as VscodeEmitter, Event as VscodeEvent } from "vs/base/common/event";
import { URI as VSCodeInternalURI, type UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri"; // For converting VscodeUri to internal for DTO
import { IExtHostInitDataService, type ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService";
import { MainContext } from "vs/workbench/api/common/extHost.protocol"; // For MainThreadWindow proxy
import type { TelemetryLevel } from "vs/platform/telemetry/common/telemetry"; // For onDidChangeTelemetryLevel type
import type { UIKind } from "vscode"; // For env.uiKind

import {
    Uri as VscodeUri, // API type
    env as VscodeEnvAPI, // For the full API type
    type Clipboard as VscodeClipboard,
    // UIKind as VscodeUIKind, // Defined in vscode namespace
} from "vscode"; // Assuming this path provides the full 'vscode' namespace for type checking

import {
    BaseCocoonShim,
    refineError,
    type IExtHostRpcService,
    type ILogService,
    type ProxyIdentifier,
} from "./_baseShim";
import type { IExtHostClipboardServiceShape } from "./clipboard-shim"; // Import the clipboard service shape

// --- Type Definitions ---

// Interface for the service this shim provides (matches vscode.env)
// VscodeEnvAPI is already imported from "vscode"
export interface IExtHostEnvServiceShape extends VscodeEnvAPI {
    readonly _serviceBrand: undefined; // For DI
}

// RPC Shape for MainThreadWindow (needed for openExternal, asExternalUri)
// Ensure this aligns with extHost.protocol.ts and Mountain's rpc.rs
interface MainThreadWindowProxyForEnv {
    $openUri(uriDto: VSCodeInternalUriComponents, options?: { allowExternalSchemes?: boolean, allowContributedOpeners?: boolean | string }): Promise<boolean>;
    $asExternalUri(uriDto: VSCodeInternalUriComponents, options?: { allowContributedOpeners?: boolean }): Promise<VSCodeInternalUriComponents>;
}

export class ShimExtHostEnvService extends BaseCocoonShim implements IExtHostEnvServiceShape {
    public readonly _serviceBrand: undefined;

    private readonly _initData: ExtHostInitData;
    public readonly clipboard: VscodeClipboard;
    private _mainThreadWindowProxy: MainThreadWindowProxyForEnv | null = null;

    // Event Emitters
    private readonly _onDidChangeTelemetryLevelEmitter = new VscodeEmitter<TelemetryLevel>();
    public readonly onDidChangeTelemetryLevel: VscodeEvent<TelemetryLevel> = this._onDidChangeTelemetryLevelEmitter.event;

    private readonly _onDidChangeShellEmitter = new VscodeEmitter<string>();
    public readonly onDidChangeShell: VscodeEvent<string> = this._onDidChangeShellEmitter.event;


    constructor(
        rpcService: IExtHostRpcService | undefined,
        logService: ILogService | undefined,
        initDataService: IExtHostInitDataService, // Injected
        clipboardService: IExtHostClipboardServiceShape, // Injected
    ) {
        super("ExtHostEnvService", rpcService, logService);
        this._initData = initDataService.value;
        this.clipboard = clipboardService; // Use injected clipboard service
        this._log("Initialized.");

        if (this._rpcService) {
            this._mainThreadWindowProxy = this._getProxy(
                MainContext.MainThreadWindow as ProxyIdentifier<MainThreadWindowProxyForEnv>
            );
        }
        if (!this._mainThreadWindowProxy) {
            this._logWarn("MainThreadWindow proxy NOT available. openExternal and asExternalUri will be impaired/fail.");
        }

        // TODO: Listen to Mountain events to fire onDidChangeTelemetryLevel and onDidChangeShell
        // e.g., Mountain might send a notification when telemetry settings change.
        // This would involve registering listeners on `ipcApiInstance` from `cocoon-ipc.ts`
        // or via RPC calls from MainThread to this ExtHostEnvService.
    }

    get appName(): string {
        return this._initData.environment.appName || "Cocoon Hosted Application";
    }

    get appRoot(): string | undefined {
        // Ensure appRoot is revived to a URI and then fsPath is taken if it's a file URI
        const appRootUri = this._initData.environment.appRoot ? URI.revive(this._initData.environment.appRoot) : undefined;
        return appRootUri?.scheme === Schemas.file ? appRootUri.fsPath : undefined;
    }

    get appHost(): string { // Matches 'desktop' | 'web' | 'codespaces' or other string
        return this._initData.environment.appHost || 'desktop';
    }

    get uriScheme(): string {
        return this._initData.environment.appUriScheme || "cocoon-code-editor";
    }

    get language(): string { // BCP 47 language tag
        return this._initData.environment.appLanguage || "en";
    }

    get machineId(): string {
        return this._initData.telemetryInfo.machineId || "cocoon-shim-machine-id";
    }

    get sessionId(): string {
        return this._initData.telemetryInfo.sessionId || "cocoon-shim-session-id";
    }

    get isTrusted(): boolean {
        // Workspace trust state from initData
        return this._initData.workspace?.trusted ?? this._initData.environment.isTrusted ?? true;
    }

    get isRemote(): boolean {
        return !!this._initData.remote?.isRemote;
    }

    get remoteName(): string | undefined {
        // VS Code often derives this by splitting authority (e.g., 'ssh-remote+host' -> 'ssh-remote')
        const authority = this._initData.remote?.authority;
        if (authority) {
            const plusIdx = authority.indexOf('+');
            return plusIdx === -1 ? authority : authority.substring(0, plusIdx);
        }
        return undefined;
    }

    get shell(): string {
        // This should reflect the shell of the *Cocoon process itself* unless initData provides a specific override
        // (e.g. if Mountain knows the user's preferred shell for the integrated terminal)
        // For a generic env.shell, the Cocoon process's shell is most accurate.
        return (process.platform === 'win32' ? process.env.ComSpec : process.env.SHELL) || "unknown_shell_in_cocoon_env";
    }

    get uiKind(): UIKind {
        const uiKindNum = this._initData.uiKind; // From IExtensionHostInitData
        if (uiKindNum === 1) return 1; // vscode.UIKind.Desktop
        if (uiKindNum === 2) return 2; // vscode.UIKind.Web
        this._logWarn(`Unknown uiKind value from initData: ${uiKindNum}. Defaulting to Desktop.`);
        return 1; // UIKind.Desktop
    }

    get isNewAppInstall(): boolean {
        // This info needs to come from Mountain in initData if required.
        this._logWarnOnce("env.isNewAppInstall STUB - returning false. Mountain needs to provide this in initData.");
        return (this._initData as any).isNewAppInstall === true; // Example if Mountain sends it
    }

    get isBuilt(): boolean {
        // Could be derived from initData.version (e.g., if it contains 'dev' or not)
        // Or Mountain can send `quality: 'stable' | 'insider' | 'development'` in initData.
        const quality = (this._initData as any).quality || "development"; // VS Code initData usually has `quality`
        return quality !== "development";
    }

    async openExternal(target: VscodeUri): Promise<boolean> {
        if (!(target instanceof VscodeUri)) {
            this._logError("openExternal: target is not a valid vscode.Uri instance.", target);
            return false;
        }
        this._log(`env.openExternal: Target='${target.toString(true)}'`); // true to skip encoding
        if (!this._mainThreadWindowProxy) {
            this._logError("Cannot openExternal: MainThreadWindow RPC proxy unavailable.");
            return Promise.resolve(false); // Match Promise<boolean>
        }

        try {
            // Convert VscodeUri (API type) to VSCodeInternalUriComponents for RPC
            const internalUri = VSCodeInternalURI.from(target);
            const uriDto = this._internalUriToMarshalledDto(internalUri);

            if (!uriDto) {
                 this._logError("openExternal: Failed to marshal URI to DTO.", target);
                 return false;
            }
            // Pass options: allowExternalSchemes is important for security.
            // VS Code often defaults this to true for env.openExternal.
            return await this._mainThreadWindowProxy.$openUri(uriDto, { allowExternalSchemes: true });
        } catch (e: any) {
            this._logError("openExternal RPC failed:", refineError(e, this._logService, "openExternal"));
            return false;
        }
    }

    async asExternalUri(target: VscodeUri): Promise<VscodeUri> {
         if (!(target instanceof VscodeUri)) {
            this._logError("asExternalUri: target is not a valid vscode.Uri instance.", target);
            return target; // Return original if invalid input
        }
        this._log(`env.asExternalUri: Target='${target.toString(true)}'`);
        if (!this._mainThreadWindowProxy) {
            this._logError("Cannot asExternalUri: MainThreadWindow RPC proxy unavailable. Returning original URI.");
            return target;
        }
        try {
            const internalUri = VSCodeInternalURI.from(target);
            const uriDto = this._internalUriToMarshalledDto(internalUri);

            if (!uriDto) {
                this._logError("asExternalUri: Failed to marshal URI to DTO.", target);
                return target;
            }
            const resultUriDto = await this._mainThreadWindowProxy.$asExternalUri(uriDto, { allowContributedOpeners: false });
            const revivedInternalUri = VSCodeInternalURI.revive(resultUriDto); // Revive to internal URI
            return VscodeUri.from(revivedInternalUri); // Convert back to API URI
        } catch (e: any) {
            this._logError("asExternalUri RPC failed:", refineError(e, this._logService, "asExternalUri"));
            return target; // Fallback to original on error
        }
    }

    // Helper to convert internal URI to a marshalled DTO (subset of what _convertApiArgToInternal might do)
    private _internalUriToMarshalledDto(uri: VSCodeInternalURI): VSCodeInternalUriComponents {
        return {
            $mid: MarshalledId.UriSimple, // Or MarshalledId.Uri if full components are always needed
            scheme: uri.scheme,
            authority: uri.authority,
            path: uri.path,
            query: uri.query,
            fragment: uri.fragment,
            // external: uri.toString(true), // Often included
            // fsPath: uri.fsPath, // Often included
        };
    }

    // --- Methods for ExtHostEnvShape (called by MainThread if needed for updates) ---
    public $setTelemetryLevel(level: TelemetryLevel): void {
        this._log(`RPC $setTelemetryLevel: New level=${level}`); // VS Code's TelemetryLevel enum has string values
        this._onDidChangeTelemetryLevelEmitter.fire(level);
    }
    public $setShell(shell: string): void {
        this._log(`RPC $setShell: New shell=${shell}`);
        this._onDidChangeShellEmitter.fire(shell);
    }

    public dispose(): void {
        super.dispose();
        this._onDidChangeTelemetryLevelEmitter.dispose();
        this._onDidChangeShellEmitter.dispose();
    }
}
--- END OF FILE env-shim.ts ---
// --- APPENDED_CONTENT_BELOW ---
// Block SHA256: 885ca2936d7547e9a0ab2f029bc8849fc586cef0aad1f0edc663edd1dd0e9835
// Timestamp: 2025-05-25T14:02:57.081Z
// Source Markdown File (Name): 158_MODEL.md
// Source Markdown File (Path): Backup/TSFMSC/Document/158_MODEL.md
// Source Block Index (Overall): 1
// Original Fence Info String: (empty)
// Appended to File: env-shim.ts (Full path when appended: Backup/TSFMSC/Code/env-shim.ts)
// ---
--- START OF FILE env-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Environment API Shim (shims/env-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env` API namespace. This service provides extensions with
 * information about the application environment (e.g., app name, machine ID, UI kind),
 * and functionalities such as clipboard access, opening external URIs, and URI scheme
 * handling.
 *
 * Most environment properties are derived from initialization data (`ExtHostInitData`)
 * received from the Mountain host. Operations like clipboard access and opening
 * external URIs are proxied: clipboard to direct IPC with Mountain, and external URI
 * operations via RPC to `MainThreadWindow`.
 *
 * Responsibilities:
 * - Implementing the `vscode.env` API interface.
 * - Populating read-only environment properties (e.g., `appName`, `machineId`, `language`,
 *   `isRemote`, `uiKind`) from `ExtHostInitData`.
 * - Providing `env.clipboard` by using an injected `IExtHostClipboardServiceShape` instance.
 * - Implementing `env.openExternal(uri)` and `env.asExternalUri(uri)` by making RPC calls
 *   to `MainThreadWindow`.
 * - Managing and firing `onDidChangeTelemetryLevel` and `onDidChangeShell` events when
 *   notified by Mountain (via RPC).
 *
 * Key Interactions:
 * - Registered with DI in `Cocoon/index.ts` as `IExtHostEnv`.
 * - An instance is made available to extensions as `vscode.env` via the API factory.
 * - Relies on `IExtHostInitDataService` (for `_initData`) and `IExtHostClipboardServiceShape`
 *   (for `env.clipboard`), both injected via DI.
 * - Uses an RPC proxy to `MainContext.MainThreadWindow` for `openExternal` and `asExternalUri`.
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { Emitter as VscodeEmitter, Event as VscodeEvent } from "vs/base/common/event";
import { MarshalledId } from "vs/base/common/marshalling"; // For URI DTO creation
import { Schemas } from "vs/base/common/network"; // For appRoot scheme check
import { URI as VSCodeInternalURI, type UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import { IExtHostInitDataService, type ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService";
import { MainContext, type ExtHostEnvShape as VscodeExtHostEnvShape } from "vs/workbench/api/common/extHost.protocol"; // For MainThreadWindow proxy and RPC shape
import type { TelemetryLevel } from "vs/platform/telemetry/common/telemetry"; // For onDidChangeTelemetryLevel type

// Import from public 'vscode' API definition
import {
    Uri as VscodeUri,
    env as VscodeEnvAPI, // The full vscode.env API type
    type Clipboard as VscodeClipboard,
    type UIKind, // Enum from vscode namespace
} from "vscode";

import {
    BaseCocoonShim,
    refineErrorForShim,
    type IRpcProtocolServiceAdapter,
    type ILogServiceForShim,
    type ProxyIdentifier,
} from "./_baseShim";
import type { IExtHostClipboardServiceShape } from "./clipboard-shim";

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.env` that this shim implements.
 * It directly matches the `vscode.env` API surface.
 */
export interface IExtHostEnvServiceShape extends VscodeEnvAPI {
	readonly _serviceBrand: undefined; // For DI registration
}

/**
 * RPC shape for methods on `MainThreadWindow` relevant to `vscode.env` operations.
 */
interface MainThreadWindowProxyForEnv {
	$openUri(uriDto: VSCodeInternalUriComponents, options?: { allowExternalSchemes?: boolean; allowContributedOpeners?: boolean | string }): Promise<boolean>;
	$asExternalUri(uriDto: VSCodeInternalUriComponents, options?: { allowContributedOpeners?: boolean }): Promise<VSCodeInternalUriComponents>;
}

/**
 * Cocoon's implementation of the `vscode.env` API namespace.
 */
export class ShimExtHostEnvService extends BaseCocoonShim implements IExtHostEnvServiceShape, VscodeExtHostEnvShape {
	public readonly _serviceBrand: undefined;

	private readonly _initData: ExtHostInitData;
	public readonly clipboard: VscodeClipboard; // Instance of ShimExtHostClipboardService
	private _mainThreadWindowProxy: MainThreadWindowProxyForEnv | null = null;

	// Event Emitters for vscode.env events
	private readonly _onDidChangeTelemetryLevelEmitter = new VscodeEmitter<TelemetryLevel>();
	public readonly onDidChangeTelemetryLevel: VscodeEvent<TelemetryLevel> = this._onDidChangeTelemetryLevelEmitter.event;

	private readonly _onDidChangeShellEmitter = new VscodeEmitter<string>();
	public readonly onDidChangeShell: VscodeEvent<string> = this._onDidChangeShellEmitter.event;

	/**
	 * Creates an instance of ShimExtHostEnvService.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 * @param initDataService Service providing initialization data from Mountain.
	 * @param clipboardService The clipboard service implementation.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		initDataService: IExtHostInitDataService,
		clipboardService: IExtHostClipboardServiceShape,
	) {
		super("ExtHostEnvService", rpcService, logService);
		this._initData = initDataService.value; // Get the raw init data
		this.clipboard = clipboardService;    // Use the injected clipboard service
		this._log("Initialized.");

		if (this._rpcService) {
			this._mainThreadWindowProxy = this._getProxy(
				MainContext.MainThreadWindow as ProxyIdentifier<MainThreadWindowProxyForEnv>
			);
            // Register self for RPC calls from MainThreadEnv (if any, e.g., for telemetry level changes)
            // this._rpcService.set(ExtHostContext.ExtHostEnv as ProxyIdentifier<VscodeExtHostEnvShape>, this);

		}
		if (!this._mainThreadWindowProxy) {
			this._logWarn("MainThreadWindow RPC proxy NOT available. `env.openExternal` and `env.asExternalUri` will be impaired or fail.");
		}
	}

	get appName(): string {
		return this._initData.environment.appName || "Cocoon Hosted Application";
	}

	get appRoot(): string | undefined {
		const appRootUriComponents = this._initData.environment.appRoot;
		if (appRootUriComponents) {
			const revivedUri = VSCodeInternalURI.revive(appRootUriComponents);
			// Only return fsPath if it's a file URI, consistent with VS Code.
			return revivedUri.scheme === Schemas.file ? revivedUri.fsPath : undefined;
		}
		return undefined;
	}

	get appHost(): string { // Typically 'desktop' | 'web' | 'codespaces'
		return this._initData.environment.appHost || 'desktop';
	}

	get uriScheme(): string {
		// This is the main URI scheme of the application (e.g., 'vscode', 'vscode-insiders', 'cocoon-code').
		return this._initData.environment.appUriScheme || "cocoon-code-editor";
	}

	get language(): string { // BCP 47 language tag (e.g., "en", "de", "zh-tw").
		return this._initData.environment.appLanguage || "en";
	}

	get machineId(): string {
		return this._initData.telemetryInfo.machineId || "cocoon-shim-machine-id";
	}

	get sessionId(): string {
		return this._initData.telemetryInfo.sessionId || "cocoon-shim-session-id";
	}

	get isTrusted(): boolean {
		// Workspace trust state. Prefer workspace-specific trust if available, fallback to environment global.
		return this._initData.workspace?.trusted ?? this._initData.environment.isTrusted ?? true;
	}

	get isRemote(): boolean {
		return !!this._initData.remote?.isRemote;
	}

	get remoteName(): string | undefined {
		const authority = this._initData.remote?.authority;
		if (authority) {
			const plusIdx = authority.indexOf('+');
			// Extracts the resolver name, e.g., 'ssh-remote' from 'ssh-remote+myhost'.
			return plusIdx === -1 ? authority : authority.substring(0, plusIdx);
		}
		return undefined;
	}

	get shell(): string {
		// The path to the shell executable.
		// For the Cocoon environment, this would be the shell of the Node.js process itself.
		// Mountain might provide a user-configured shell via initData if needed for terminal context.
		return (process.platform === 'win32' ? process.env.ComSpec : process.env.SHELL) || "unknown_shell_in_cocoon_env";
	}

	get uiKind(): UIKind {
		const uiKindNum = this._initData.uiKind; // From IExtensionHostInitData (0: Desktop, 1: Web in some older defs, but check current)
                                                // Modern VS Code UIKind enum: 1 for Desktop, 2 for Web.
		if (uiKindNum === 1) return 1; // vscode.UIKind.Desktop
		if (uiKindNum === 2) return 2; // vscode.UIKind.Web
		this._logWarn(`Unknown uiKind value ('${uiKindNum}') from initData. Defaulting to Desktop (1).`);
		return 1; // UIKind.Desktop (safe default)
	}

	get isNewAppInstall(): boolean {
		// This information must be provided by Mountain in initData.
		const isNew = (this._initData as any).isNewAppInstall; // Cast if not standard in ExtHostInitData
        if (isNew === undefined) {
            this._logWarnOnce("env.isNewAppInstall: Value not provided by Mountain in initData. Defaulting to false.");
        }
		return isNew === true;
	}

	get isBuilt(): boolean {
		// Typically, 'development' quality means not a "built" (release) version.
		const quality = (this._initData as any).product?.quality || (this._initData as any).quality; // Check both common locations
        if (quality === undefined) {
            this._logWarnOnce("env.isBuilt: Product quality not provided by Mountain in initData. Assuming not a release build (isBuilt=false).");
            return false; // Safe default if quality is unknown
        }
		return quality !== "development";
	}

	async openExternal(target: VscodeUri): Promise<boolean> {
		if (!(target instanceof VscodeUri)) {
			this._logError("env.openExternal: Invalid target URI provided. Must be a vscode.Uri instance.", target);
			return false;
		}
		this._log(`env.openExternal: Attempting to open URI='${target.toString(true)}'`);
		if (!this._mainThreadWindowProxy) {
			this._logError("Cannot env.openExternal: MainThreadWindow RPC proxy is unavailable.");
			return Promise.resolve(false); // API expects Promise<boolean>
		}

		try {
			// Convert vscode.Uri (API type) to VSCodeInternalUriComponents for RPC.
			const internalUri = VSCodeInternalURI.from(target); // Throws if `target` is not valid for URI construction
			const uriDto = this._internalUriToMarshalledDto(internalUri);

			// For `env.openExternal`, `allowExternalSchemes: true` is usually implied/safe.
			return await this._mainThreadWindowProxy.$openUri(uriDto, { allowExternalSchemes: true });
		} catch (e: any) {
			this._logError("env.openExternal: RPC call failed or URI conversion error:", refineErrorForShim(e, this._logService, "openExternal"));
			return false;
		}
	}

	async asExternalUri(target: VscodeUri): Promise<VscodeUri> {
		 if (!(target instanceof VscodeUri)) {
			this._logError("env.asExternalUri: Invalid target URI provided. Must be a vscode.Uri instance. Returning original.", target);
			return target;
		}
		this._log(`env.asExternalUri: Resolving URI='${target.toString(true)}'`);
		if (!this._mainThreadWindowProxy) {
			this._logError("Cannot env.asExternalUri: MainThreadWindow RPC proxy is unavailable. Returning original URI.");
			return target;
		}
		try {
			const internalUri = VSCodeInternalURI.from(target);
			const uriDto = this._internalUriToMarshalledDto(internalUri);

			const resultUriDto = await this._mainThreadWindowProxy.$asExternalUri(uriDto, { allowContributedOpeners: false });
			const revivedInternalUri = VSCodeInternalURI.revive(resultUriDto); // Revive to internal URI
			return VscodeUri.from(revivedInternalUri); // Convert back to API URI
		} catch (e: any) {
			this._logError("env.asExternalUri: RPC call failed or URI conversion error:", refineErrorForShim(e, this._logService, "asExternalUri"));
			return target; // Fallback to original target URI on error
		}
	}

	/**
	 * Helper to convert an internal VSCodeInternalURI to a marshalled DTO suitable for RPC.
	 * This ensures a consistent DTO structure, including `$mid` if necessary.
	 */
	private _internalUriToMarshalledDto(uri: VSCodeInternalURI): VSCodeInternalUriComponents {
		// This should produce a structure compatible with what RPCProtocol expects
		// and what MainThread services can revive.
		return {
			$mid: MarshalledId.UriSimple, // Using UriSimple as it's lighter if full components aren't always needed
			scheme: uri.scheme,
			authority: uri.authority,
			path: uri.path,
			query: uri.query,
			fragment: uri.fragment,
			// `external` and `fsPath` are often not part of the minimal DTO but can be useful.
			// If MainThread relies on them, they should be included.
			// For `UriSimple`, they are typically omitted to save payload size.
		};
	}

	// --- Methods for VscodeExtHostEnvShape (called by MainThread) ---
	/**
	 * Called by the MainThread to update the telemetry level.
	 * @param level The new telemetry level.
	 */
	public $setTelemetryLevel(level: TelemetryLevel): void {
		const oldLevel = (this._initData.telemetryInfo as any).telemetryLevel ?? TelemetryLevel.NONE; // Assuming initData has current level
		this._log(`RPC $setTelemetryLevel: Level changed from ${TelemetryLevel[oldLevel]} to ${TelemetryLevel[level]}`);
        (this._initData.telemetryInfo as any).telemetryLevel = level; // Update local cache if initData is source of truth
		this._onDidChangeTelemetryLevelEmitter.fire(level);
	}

	/**
	 * Called by the MainThread to update the shell path.
	 * @param shellPath The new shell path.
	 */
	public $setShell(shellPath: string): void {
		const oldShell = this.shell; // Get current value
		this._log(`RPC $setShell: Shell changed from '${oldShell}' to '${shellPath}'`);
        // If `this.shell` were derived from a mutable property in `_initData`, update it here.
        // Since it's derived from process.env, this RPC implies an override.
        // For this shim, we'll just fire the event. A more complex shim might store this override.
		this._onDidChangeShellEmitter.fire(shellPath);
	}

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._onDidChangeTelemetryLevelEmitter.dispose();
		this._onDidChangeShellEmitter.dispose();
	}
}
--- END OF FILE env-shim.ts ---