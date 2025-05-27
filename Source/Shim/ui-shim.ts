/*---------------------------------------------------------------------------------------------
 * Cocoon UI & Environment Shim (ui-shim.ts) - Legacy/Conceptual
 * --------------------------------------------------------------------------------------------
 * ##########################################################################################
 * # WARNING: OBSOLETE / LEGACY SHIM                                                        #
 * ##########################################################################################
 * This monolithic shim (`ShimExtHostUiAndEnv`) is now considered LEGACY or OBSOLETE
 * in the current Cocoon architecture. Its responsibilities have been refactored into
 * more granular and focused shims. This file is preserved primarily for historical
 * reference or to understand the original grouping of functionalities.
 *
 * DO NOT USE THIS SHIM FOR NEW DEVELOPMENT OR CONSIDER IT PART OF THE ACTIVE SHIM SET.
 *
 * Its functionalities have been superseded by:
 * - `message-service-shim.ts`: For `vscode.window.showInformationMessage`, `showWarningMessage`, *   and `showErrorMessage`.
 * - `env-shim.ts`: For `vscode.env.*` properties and methods like `openExternal`.
 * - `quick-input-shim.ts`: For `vscode.window.showQuickPick` and `vscode.window.showInputBox`.
 * - `dialog-service-shim.ts`: For `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog`.
 * - `window-parts-shim.ts`: For other miscellaneous `vscode.window` elements (e.g., status bar).
 *
 * Original Intended Responsibilities:
 * - Conceptually grouped parts of the `vscode.window` API (specifically message dialogs)
 *   and the `vscode.env` API namespace. This was not a direct implementation of a single
 *   VS Code ExtHost service but rather a collection of related UI/environment functionalities.
 * - `vscode.window.showInformationMessage` (and its warning/error variants) were proxied
 *   to the Mountain host process via direct IPC calls.
 * - `vscode.env` properties (like `appName`, `machineId`, `uriScheme`) were populated from
 *   initialization data (`initData`) received from Mountain.
 * - Other `vscode.window` members were intended to be stubbed or implemented here.
 *
 * Key Interactions (Original Intent):
 * - Relied on `initData` for populating `vscode.env` properties.
 * - Used `_ipcRequestResponse` (from `BaseCocoonShim`) for message dialogs.
 * - Could have potentially used RPC proxies for more complex `vscode.window` interactions
 *   if corresponding MainThread services existed and were targeted.
 *
 *--------------------------------------------------------------------------------------------*/

// For URI scheme checks (e.g., Schemas.file) if appRoot is a URI.
import { Schemas } from "vs/base/common/network";
// For reviving URI components from initData.
import { URI as VSCodeInternalURI } from "vs/base/common/uri";
// For `ExtHostInitData` to define `UiShimInitData` structure more accurately.
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService";
// Import public vscode API types
import type {
	MessageItem as VscodeMessageItem,
	MessageOptions as VscodeMessageOptions,
	// Other vscode API types that were previously commented out in the original files,
	// relevant if this shim were active and implementing more features:
	// type QuickPickOptions, type QuickPickItem, type InputBoxOptions, type OpenDialogOptions,
	// type SaveDialogOptions, type StatusBarItem, type StatusBarAlignment, type WindowState,
	// type TextEditor, type OutputChannel, type Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	// Use the more specific error refiner
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	// If RPC were used for parts of this legacy shim
	// type ProxyIdentifier,
} from "./_baseShim";

// If this shim were using RPC for messages, this would be relevant:
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// VS Code's platform Severity
// import { Severity } from "vs/platform/notification/common/notification";

// interface MainThreadMessageServiceShape {

//  $showMessage(severity: Severity, message: string, options: VscodeMessageOptions, items: ({ title: string, handle: number, isCloseAffordance?: boolean })[]): Promise<string | VscodeMessageItem | undefined>;

// }

/**
 * Severity levels for notifications sent via direct IPC to Mountain.
 * These values must align with what Mountain's `ui_showMessage` IPC handler expects.
 */
enum NotificationSeverityForIpc {
	// Not typically used directly by `show...Message` APIs.
	Ignore = 0,

	Info = 1,

	Warning = 2,

	Error = 3,
}

/**
 * Defines the structure of initialization data relevant to this (legacy) shim.
 * Primarily contains environment properties for the `vscode.env` part.
 */
interface UiShimInitData extends ExtHostInitData {
	// `ExtHostInitData` already includes `environment`, `telemetryInfo`, `workspace`, `remote`, etc.
	// This interface extension is mostly for conceptual clarity if specific additions were made here.
}

/**
 * (Legacy Shim - OBSOLETE)
 * This class originally grouped parts of `vscode.window` (message dialogs) and `vscode.env`.
 * Its functionality has been refactored into more specific shims.
 * Refer to `message-service-shim.ts` and `env-shim.ts`.
 */
export class ShimExtHostUiAndEnv extends BaseCocoonShim {
	// Store the full initData for convenience.
	readonly #initData: UiShimInitData;

	// If using RPC for messages:
	// private _mainThreadMessageServiceProxy: MainThreadMessageServiceProxyShape | null = null;

	/**
	 * Creates an instance of ShimExtHostUiAndEnv.
	 * @param rpcService The RPC service adapter (passed to base).
	 * @param initData The initialization data from Mountain.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// Expect the full ExtHostInitData structure for env properties.
		initData: UiShimInitData,

		logService: ILogServiceForShim | undefined,
	) {
		// Conceptual service identifier for logging.
		super("LegacyExtHostUiAndEnv", rpcService, logService);

		this.#initData = initData;

		this._logError(
			// Log as error to make its obsolete status highly visible if instantiated.
			"CRITICAL WARNING: ShimExtHostUiAndEnv is OBSOLETE and should not be used. " +
				"Its functionality has been refactored into message-service-shim.ts, env-shim.ts, etc.",
		);
	}

	/**
	 * This legacy shim, for its message-proxying part, used direct IPC and did not
	 * strictly require the main RPC proxy setup for that functionality.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	// --- vscode.window.show[Information|Warning|Error]Message Implementations (Legacy) ---

	/**
	 * (Legacy Implementation) Helper to parse message arguments (`options` and `items`).
	 */
	private _parseMessageRestArgs(
		rest: (VscodeMessageOptions | string | VscodeMessageItem)[],
	): {
		options: VscodeMessageOptions;

		items: (string | VscodeMessageItem)[];
	} {
		let options: VscodeMessageOptions = {};

		const items: (string | VscodeMessageItem)[] = [];

		if (rest.length > 0) {
			if (
				typeof rest[0] === "object" &&
				rest[0] !== null &&
				!(typeof (rest[0] as VscodeMessageItem).title === "string")
			) {
				options = rest.shift() as VscodeMessageOptions;
			}

			for (const itemCandidate of rest) {
				if (typeof itemCandidate === "string") {
					items.push(itemCandidate);
				} else if (
					typeof itemCandidate === "object" &&
					itemCandidate !== null &&
					typeof itemCandidate.title === "string"
				) {
					items.push(itemCandidate as VscodeMessageItem);
				} else {
					this._logWarn(
						"[Legacy Shim] Invalid message item in showMessage arguments, skipping:",

						itemCandidate,
					);
				}
			}
		}

		return { options, items };
	}

	/**
	 * (Legacy Implementation) Shows an information message to the user.
	 * Proxied to Mountain via direct IPC call "ui_showMessage".
	 */
	public async showInformationMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		this._logDebug(
			`[Legacy Shim] showInformationMessage: "${message.substring(0, 50)}..."`,
		);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverityForIpc.Info,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item, index) => ({
				title: typeof item === "string" ? item : item.title,

				isCloseAffordance:
					typeof item === "object" ? !!item.isCloseAffordance : false,

				handle: index /* Use index as handle */,
			})),
		};

		try {
			const resultHandleOrTitle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000 /* 2 min timeout */,
			)) as number | string | undefined;

			if (resultHandleOrTitle === undefined) return undefined;

			if (typeof resultHandleOrTitle === "number") {
				// Mountain returned handle (index)
				// Assumes handle is the original index
				return items[resultHandleOrTitle];
			} else if (typeof resultHandleOrTitle === "string") {
				// Mountain returned title
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultHandleOrTitle,
				);

				// Fallback to title string if item object not found
				return selectedItem || resultHandleOrTitle;
			}

			this._logWarn(
				"[Legacy Shim] Unexpected response type from ui_showMessage:",

				resultHandleOrTitle,
			);

			return undefined;
		} catch (e: any) {
			this._logError(
				"[Legacy Shim] showInformationMessage IPC failed:",

				refineErrorForShim(
					e,

					this._logService,

					"showInformationMessage IPC",
				),
			);

			return undefined;
		}
	}

	/** (Legacy Implementation) Shows a warning message. Proxied to Mountain. */
	public async showWarningMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		this._logDebug(
			`[Legacy Shim] showWarningMessage: "${message.substring(0, 50)}..."`,
		);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverityForIpc.Warning,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item, index) => ({
				title: typeof item === "string" ? item : item.title,

				isCloseAffordance:
					typeof item === "object" ? !!item.isCloseAffordance : false,

				handle: index,
			})),
		};

		try {
			const resultHandleOrTitle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as number | string | undefined;

			if (resultHandleOrTitle === undefined) return undefined;

			if (typeof resultHandleOrTitle === "number") {
				return items[resultHandleOrTitle];
			} else if (typeof resultHandleOrTitle === "string") {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultHandleOrTitle,
				);

				return selectedItem || resultHandleOrTitle;
			}

			this._logWarn(
				"[Legacy Shim] Unexpected warning message response type:",

				resultHandleOrTitle,
			);

			return undefined;
		} catch (e: any) {
			this._logError(
				"[Legacy Shim] showWarningMessage IPC failed:",

				refineErrorForShim(
					e,

					this._logService,

					"showWarningMessage IPC",
				),
			);

			return undefined;
		}
	}

	/** (Legacy Implementation) Shows an error message. Proxied to Mountain. */
	public async showErrorMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		this._logDebug(
			`[Legacy Shim] showErrorMessage: "${message.substring(0, 50)}..."`,
		);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverityForIpc.Error,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item, index) => ({
				title: typeof item === "string" ? item : item.title,

				isCloseAffordance:
					typeof item === "object" ? !!item.isCloseAffordance : false,

				handle: index,
			})),
		};

		try {
			const resultHandleOrTitle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as number | string | undefined;

			if (resultHandleOrTitle === undefined) return undefined;

			if (typeof resultHandleOrTitle === "number") {
				return items[resultHandleOrTitle];
			} else if (typeof resultHandleOrTitle === "string") {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultHandleOrTitle,
				);

				return selectedItem || resultHandleOrTitle;
			}

			this._logWarn(
				"[Legacy Shim] Unexpected error message response type:",

				resultHandleOrTitle,
			);

			return undefined;
		} catch (e: any) {
			this._logError(
				"[Legacy Shim] showErrorMessage IPC failed:",

				refineErrorForShim(e, this._logService, "showErrorMessage IPC"),
			);

			return undefined;
		}
	}

	// --- vscode.env properties (Legacy Implementation - read-only, derived from initData) ---
	// These are now handled by `env-shim.ts`.
	public get appName(): string {
		return (
			this.#initData.environment.appName ||
			"Cocoon Editor (Legacy Env Shim)"
		);
	}

	public get appRoot(): string | undefined {
		const appRootUriComponents = this.#initData.environment.appRoot;

		if (appRootUriComponents) {
			const revivedUri = VSCodeInternalURI.revive(appRootUriComponents);

			return revivedUri.scheme === Schemas.file
				? revivedUri.fsPath
				: undefined;
		}

		return undefined;
	}

	public get appHost(): "desktop" | "web" | "codespaces" | string {
		return this.#initData.environment.appHost || "desktop";
	}

	public get uriScheme(): string {
		return this.#initData.environment.appUriScheme || "cocoon-legacy-env";
	}

	public get language(): string {
		return this.#initData.environment.appLanguage || "en";
	}

	public get machineId(): string {
		return (
			this.#initData.telemetryInfo.machineId ||
			"legacy-env-shim-machine-id"
		);
	}

	public get sessionId(): string {
		return (
			this.#initData.telemetryInfo.sessionId ||
			"legacy-env-shim-session-id"
		);
	}

	public get isTrusted(): boolean {
		return (
			this.#initData.workspace?.trusted ??
			this.#initData.environment.isTrusted ??
			true
		);
	}

	public get isRemote(): boolean {
		return !!this.#initData.remote?.isRemote;
	}

	public get remoteName(): string | undefined {
		return this.#initData.remote?.authority?.split("+")[0];
	}

	public get shell(): string {
		return (
			(process.platform === "win32"
				? process.env.ComSpec
				: process.env.SHELL) || "unknown_shell_in_legacy_cocoon_env"
		);
	}

	public get uiKind(): import("vscode").UIKind {
		// From ExtHostInitData
		const uiKindNum = this.#initData.uiKind;

		// Assuming Mountain sends UIKind enum values directly (1 for Desktop, 2 for Web)
		if (uiKindNum === 1) return 1; /* vscode.UIKind.Desktop */
		if (uiKindNum === 2) return 2; /* vscode.UIKind.Web */
		this._logWarn(
			`[Legacy Shim] Unknown uiKind value from initData: ${uiKindNum}. Defaulting to Desktop.`,
		);

		// UIKind.Desktop (safe default)
		return 1;
	}

	// TODO: Other vscode.env properties like `clipboard`, `openExternal`, `asExternalUri`,

	// `isNewAppInstall`, `isBuilt` were part of the original intent for vscode.env but
	// are now handled by the dedicated `env-shim.ts` and `clipboard-shim.ts`.
	// This legacy shim does not (and should not) implement them.
}
