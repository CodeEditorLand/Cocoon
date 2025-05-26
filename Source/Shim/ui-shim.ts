/*---------------------------------------------------------------------------------------------
 * Cocoon UI & Environment Shim (ui-shim.ts) - Legacy/Conceptual
 * --------------------------------------------------------------------------------------------
 * NOTE: This monolithic shim is now considered LEGACY or OBSOLETE in the current Cocoon
 * architecture. Its responsibilities have been refactored into more granular shims:
 * - `message-service-shim.ts` (for vscode.window.show[Information|Warning|Error]Message)
 * - `env-shim.ts` (for vscode.env.* properties and methods)
 * - `quick-input-shim.ts` (for vscode.window.showQuickPick/showInputBox)
 * - `dialog-service-shim.ts` (for vscode.window.showOpenDialog/showSaveDialog)
 * - `window-parts-shim.ts` (for miscellaneous vscode.window elements like status bar)
 *
 * This file is preserved and documented based on its original structure for historical
 * reference or if a simpler, combined approach were ever reconsidered.
 *
 * Original Responsibilities:
 * - Conceptually grouped parts of the `vscode.window` (message dialogs) and
 *   `vscode.env` API namespaces. This was not a direct implementation of a single
 *   VS Code ExtHost service but rather a collection of functionalities.
 * - `vscode.window.showInformationMessage` (and warnings/errors) were proxied to
 *   Mountain via direct IPC.
 * - `vscode.env` properties were populated from `initData` received from Mountain.
 * - Other `vscode.window` members were intended to be stubbed here.
 *
 * Key Interactions (Original Intent):
 * - Relied on `initData` for `vscode.env` properties.
 * - Used `_ipcRequestResponse` (from `BaseCocoonShim`) for message dialogs.
 * - Could have used RPC proxies for more complex `vscode.window` interactions if
 *   corresponding MainThread services existed.
 *

 *--------------------------------------------------------------------------------------------*/

// For URI scheme checks if appRoot is URI
import { Schemas } from "vs/base/common/network";
// For reviving URIs from initData
import { URI as VSCodeInternalURI } from "vs/base/common/uri";
// For `ExtHostInitData` to define `UiShimInitData` structure more accurately
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService";
import type {
	MessageItem as VscodeMessageItem,
	MessageOptions as VscodeMessageOptions,
	// Other vscode API types that were previously commented out, relevant if this shim were active:
	// type QuickPickOptions, type QuickPickItem, type InputBoxOptions, type OpenDialogOptions,
	// type SaveDialogOptions, type StatusBarItem, type StatusBarAlignment, type WindowState,
	// type TextEditor, type OutputChannel, type Uri as VscodeUri,
} from "vscode";

// API types

import {
	BaseCocoonShim,
	// If RPC were used
	// ProxyIdentifier,

	// Use the more specific refineError
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// TODO: If using RPC for messages, define MainThreadMessageServiceShape
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// import { Severity } from "vs/platform/notification/common/notification";

// interface MainThreadMessageServiceShape {

//  $showMessage(severity: Severity, message: string, options: VscodeMessageOptions, items: (string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined>;

// }

/**
 * Severity levels for notifications sent via IPC to Mountain.
 * These values should align with what Mountain's `ui_showMessage` handler expects.
 */
enum NotificationSeverityForIpc {
	// Not typically used for showMessage
	Ignore = 0,

	Info = 1,

	Warning = 2,

	Error = 3,
}

/**
 * Defines the structure of initialization data relevant to this (legacy) shim.
 * Primarily contains environment properties for `vscode.env`.
 */
interface UiShimInitData extends ExtHostInitData {
	// Extend ExtHostInitData for broader compatibility
	// environment property is already part of ExtHostInitData and is typed as IEnvironment
	// We'll access its properties directly.
	// For clarity, if specific properties were always expected:
	// environment: {
	// 	appName?: string;
	// VS Code's initData uses UriComponents
	// 	appRoot?: VSCodeInternalUriComponents;
	// 	appHost?: "desktop" | "web" | "codespaces" | string;
	// 	appUriScheme?: string;
	// BCP 47
	// 	appLanguage?: string;
	// 	isTrusted?: boolean;
	// Allow other env properties
	// 	[key: string]: any;
	// };
	// machineId and sessionId are part of ExtHostInitData.telemetryInfo
	// remote is part of ExtHostInitData
}

/**
 * (Legacy Shim) Conceptually grouped parts of `vscode.window` and `vscode.env`.
 * NOTE: This class is considered obsolete; its functionality is now in more specific shims.
 */
export class ShimExtHostUiAndEnv extends BaseCocoonShim {
	// Store the full initData for convenience
	readonly #initData: UiShimInitData;

	// If using RPC for messages:
	// #messageServiceProxy: MainThreadMessageServiceShape | null = null;

	/**
	 * Creates an instance of ShimExtHostUiAndEnv.
	 * @param rpcService The RPC service adapter (passed to base).
	 * @param initData The initialization data from Mountain.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// Expect the full ExtHostInitData structure
		initData: UiShimInitData,

		logService: ILogServiceForShim | undefined,
	) {
		// Conceptual service identifier
		super("LegacyExtHostUiEnv", rpcService, logService);

		this.#initData = initData;

		this._log(
			"Initialized (Legacy Conceptual UI & Env Shim). This shim is OBSOLETE.",
		);

		// if (this._rpcService) {

		//    this.#messageServiceProxy = this._getProxy(MainContext.MainThreadMessageService as ProxyIdentifier<MainThreadMessageServiceShape>);

		// }
	}

	/** This shim, in its message-proxying part, uses direct IPC. */
	protected override _requiresRpc(): boolean {
		// As it primarily uses direct IPC for messages.
		return false;
	}

	// --- vscode.window.show[Information|Warning|Error]Message Implementations ---

	/** Helper to parse message arguments (options and items). */
	private _parseMessageRestArgs(
		rest: (VscodeMessageOptions | string | VscodeMessageItem)[],
	): {
		options: VscodeMessageOptions;

		items: (string | VscodeMessageItem)[];
	} {
		let options: VscodeMessageOptions = {};

		const items: (string | VscodeMessageItem)[] = [];

		if (rest.length > 0) {
			// Check if the first arg is MessageOptions. A MessageItem object must have a 'title' string.
			if (
				typeof rest[0] === "object" &&
				rest[0] !== null &&
				!(typeof (rest[0] as VscodeMessageItem).title === "string")
			) {
				options = rest.shift() as VscodeMessageOptions;
			}

			// Remaining args are items.
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
						"Invalid message item in showMessage arguments, skipping:",

						itemCandidate,
					);
				}
			}
		}

		return { options, items };
	}

	/**
	 * Shows an information message to the user.
	 * @param message The message to show.
	 * @param rest Optional: A `MessageOptions` object, or a list of `MessageItem` objects or action strings.
	 * @returns A promise that resolves to the selected `MessageItem` or action string, or `undefined` if dismissed.
	 */
	public async showInformationMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		// this._log(`showInformationMessage: "${message}"`);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverityForIpc.Info,

			message,

			// Send only relevant serializable options
			options: { modal: options.modal, detail: options.detail },

			items: items.map((item) => ({
				title: typeof item === "string" ? item : item.title,

				isCloseAffordance:
					typeof item === "object" ? !!item.isCloseAffordance : false,

				handle: 0 /* placeholder handle */,
			})),
		};

		try {
			const resultTitleOrHandle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | number | undefined;

			if (resultTitleOrHandle === undefined) return undefined;

			// Assuming Mountain returns the title of the clicked item for simplicity in this legacy shim.
			// A more robust system would use handles.
			if (typeof resultTitleOrHandle === "string") {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultTitleOrHandle,
				);

				return selectedItem || resultTitleOrHandle;
			}

			// If Mountain were to return a handle (index based on items sent)
			// const selectedItemByHandle = items[resultTitleOrHandle as number];

			// return selectedItemByHandle;

			// Fallback if response format is unexpected
			return undefined;
		} catch (e: any) {
			this._logError(
				"showInformationMessage IPC failed:",

				refineErrorForShim(
					e,

					this._logService,

					"showInformationMessage",
				),
			);

			// API expects undefined on error/dismissal
			return undefined;
		}
	}

	/** Shows a warning message. See `showInformationMessage`. */
	public async showWarningMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		// this._log(`showWarningMessage: "${message}"`);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverityForIpc.Warning,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item) => ({
				title: typeof item === "string" ? item : item.title,

				isCloseAffordance:
					typeof item === "object" ? !!item.isCloseAffordance : false,

				handle: 0,
			})),
		};

		try {
			const resultTitleOrHandle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | number | undefined;

			if (resultTitleOrHandle === undefined) return undefined;

			if (typeof resultTitleOrHandle === "string") {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultTitleOrHandle,
				);

				return selectedItem || resultTitleOrHandle;
			}

			return undefined;
		} catch (e: any) {
			this._logError(
				"showWarningMessage IPC failed:",

				refineErrorForShim(e, this._logService, "showWarningMessage"),
			);

			return undefined;
		}
	}

	/** Shows an error message. See `showInformationMessage`. */
	public async showErrorMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		// this._log(`showErrorMessage: "${message}"`);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverityForIpc.Error,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item) => ({
				title: typeof item === "string" ? item : item.title,

				isCloseAffordance:
					typeof item === "object" ? !!item.isCloseAffordance : false,

				handle: 0,
			})),
		};

		try {
			const resultTitleOrHandle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | number | undefined;

			if (resultTitleOrHandle === undefined) return undefined;

			if (typeof resultTitleOrHandle === "string") {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultTitleOrHandle,
				);

				return selectedItem || resultTitleOrHandle;
			}

			return undefined;
		} catch (e: any) {
			this._logError(
				"showErrorMessage IPC failed:",

				refineErrorForShim(e, this._logService, "showErrorMessage"),
			);

			return undefined;
		}
	}

	// --- vscode.env properties (read-only, derived from initData) ---
	public get appName(): string {
		return (
			this.#initData.environment.appName || "Cocoon Editor (Legacy Shim)"
		);
	}

	public get appRoot(): string | undefined {
		const appRootUriComponents = this.#initData.environment.appRoot;

		if (appRootUriComponents) {
			// initData.environment.appRoot is UriComponents, needs revival
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
		return this.#initData.environment.appUriScheme || "cocoon-legacy";
	}

	public get language(): string {
		// BCP 47 language tag
		return this.#initData.environment.appLanguage || "en";
	}

	public get machineId(): string {
		return (
			this.#initData.telemetryInfo.machineId || "legacy-shim-machine-id"
		);
	}

	public get sessionId(): string {
		return (
			this.#initData.telemetryInfo.sessionId || "legacy-shim-session-id"
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
				: process.env.SHELL) || "unknown_shell_in_legacy_cocoon"
		);
	}

	public get uiKind(): import("vscode").UIKind {
		const uiKindNum = this.#initData.uiKind;

		// vscode.UIKind.Desktop
		if (uiKindNum === 1) return 1;

		// vscode.UIKind.Web
		if (uiKindNum === 2) return 2;

		// Default
		return 1;
	}

	// TODO: Other vscode.env properties like `clipboard`, `openExternal`, `asExternalUri`, `isNewAppInstall`, `isBuilt`
	// would require their respective shims or direct data from initData.
	// This legacy shim does not implement them.
}
