/*---------------------------------------------------------------------------------------------
 * Cocoon UI & Environment Shim (ui-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides shims for parts of the `vscode.window` and `vscode.env` API namespaces.
 * This is a conceptual grouping rather than a direct implementation of a single
 * ExtHost service. In a full DI setup, these functionalities would be provided by
 * more specific services like `ExtHostMessageService`, `ExtHostWindow`, `ExtHostEnvironment`.
 *
 * Responsibilities:
 * - `vscode.window.showInformationMessage` (and warnings/errors): Proxied to Mountain,
 *
 *   likely via direct IPC or a dedicated `MainThreadMessageService` RPC.
 * - `vscode.env` properties: Populated from `initData` received from Mountain.
 * - Stubbing other `vscode.window` members as needed (e.g., `createStatusBarItem`).
 *
 * Key Interactions:
 * - Relies on `initData` for `vscode.env` properties.
 * - Uses `_ipcRequestResponse` (from `BaseCocoonShim`) for message dialogs if direct IPC is used.
 * - Could use RPC proxies for more complex `vscode.window` interactions if a corresponding
 *   MainThread service exists (e.g., `MainThreadQuickInput`, `MainThreadStatusBar`).
 *--------------------------------------------------------------------------------------------*/

import type {
	MessageItem as VscodeMessageItem,
	// vscode API types for window methods
	MessageOptions as VscodeMessageOptions,
	// QuickPickOptions, QuickPickItem, InputBoxOptions, OpenDialogOptions, SaveDialogOptions,
	// StatusBarItem as VscodeStatusBarItem, StatusBarAlignment as VscodeStatusBarAlignment,
	// WindowState as VscodeWindowState,
	// TextEditor as VscodeTextEditor,
	// OutputChannel as VscodeOutputChannel,
	// For env.openExternal etc.
	// Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	ProxyIdentifier,
	refineError,
} from "./_baseShim";

// Assuming API types from 'vscode' shim or real API

// TODO: If using RPC for messages, define MainThreadMessageServiceShape
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// interface MainThreadMessageServiceShape {
//  $showMessage(severity: Severity, message: string, options: VscodeMessageOptions, items: (string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined>;

// }

// Severity enum values (from vs/platform/notification/common/notification.ts or similar)
// TODO: Use actual Severity enum from VS Code internals if available, or ensure these values match.
// Renamed to avoid conflict if vscode.Severity exists
enum NotificationSeverity {
	// Not typically used for showMessage
	Ignore = 0,

	Info = 1,

	Warning = 2,

	Error = 3,
}

// Define a simplified InitData structure relevant to this shim
interface UiShimInitData {
	environment: {
		appName?: string;

		// Simplified UriComponents for fsPath
		appRoot?: { fsPath: string; [key: string]: any };

		// More specific types
		appHost?: "desktop" | "web" | "codespaces" | string;

		appUriScheme?: string;

		// BCP 47 language tag
		appLanguage?: string;

		// For env.isTrusted
		isTrusted?: boolean;

		// TODO: Add other env properties from VS Code's IEnvironmentService if needed (e.g., userSettingsHome, stateHome)
		[key: string]: any;
	};

	machineId?: string;

	sessionId?: string;

	// ... other initData properties
}

// This class doesn't implement a single ExtHost service, but groups API parts.
// For DI, individual services (ExtHostMessageService, ExtHostEnvironment) would be better.
export class ShimExtHostUiAndEnv extends BaseCocoonShim {
	readonly #initData: UiShimInitData;

	// If using RPC
	// #messageServiceProxy: MainThreadMessageServiceShape | null = null;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		initData: UiShimInitData,

		logService: ILogService | undefined,
	) {
		// Conceptual service identifier
		super("ExtHostUiEnv", rpcService, logService);

		this.#initData = initData;

		// if (this._rpcService) {
		//    this.#messageServiceProxy = this._getProxy(MainContext.MainThreadMessageService as ProxyIdentifier<MainThreadMessageServiceShape>);

		// }

		this._log("Initialized (Conceptual UI & Env Shim).");
	}

	// --- vscode.window members (subset) ---

	// Helper to parse options and items for showMessage* calls
	private _parseMessageRestArgs(rest: any[]): {
		options: VscodeMessageOptions;

		items: (string | VscodeMessageItem)[];
	} {
		let options: VscodeMessageOptions = {};

		let items: (string | VscodeMessageItem)[] = [];

		if (rest.length > 0) {
			// First check if the first arg is MessageOptions (and not a MessageItem string/object)
			if (
				typeof rest[0] === "object" &&
				rest[0] !== null &&
				!("title" in rest[0] && typeof rest[0].title === "string")
			) {
				options = rest.shift() as VscodeMessageOptions;
			}

			// Remaining args are items
			items = rest
				.map((item) => {
					if (typeof item === "string") return item;

					if (
						typeof item === "object" &&
						item !== null &&
						typeof item.title === "string"
					)
						return item as VscodeMessageItem;

					this._logWarn(
						"Invalid message item in showMessage, skipping:",

						item,
					);

					return null;
				})
				.filter((item) => item !== null) as (
				| string
				| VscodeMessageItem
			)[];
		}

		return { options, items };
	}

	public async showInformationMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		this._log(`showInformationMessage: "${message}"`);

		const { options, items } = this._parseMessageRestArgs(rest);

		// Using direct IPC as in original, but with refined error handling and types
		const params = {
			severity: NotificationSeverity.Info,

			message,

			// Send only relevant options
			options: { modal: options.modal, detail: options.detail },

			items: items.map(
				(item) => (typeof item === "string" ? item : item.title),

				// Send item titles for IPC
			),
		};

		try {
			const resultTitle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,

				// Long timeout
			)) as string | undefined;

			if (resultTitle) {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultTitle,
				);

				// Return MessageItem if found, else the title string
				return selectedItem || resultTitle;
			}

			return undefined;
		} catch (e: any) {
			this._logError(
				"showInformationMessage IPC failed:",

				refineError(e, this._logService, "showInformationMessage"),
			);

			return undefined;
		}
	}

	public async showWarningMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		this._log(`showWarningMessage: "${message}"`);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverity.Warning,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item) =>
				typeof item === "string" ? item : item.title,
			),
		};

		try {
			const resultTitle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | undefined;

			if (resultTitle) {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultTitle,
				);

				return selectedItem || resultTitle;
			}

			return undefined;
		} catch (e: any) {
			this._logError(
				"showWarningMessage IPC failed:",

				refineError(e, this._logService, "showWarningMessage"),
			);

			return undefined;
		}
	}

	public async showErrorMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		this._log(`showErrorMessage: "${message}"`);

		const { options, items } = this._parseMessageRestArgs(rest);

		const params = {
			severity: NotificationSeverity.Error,

			message,

			options: { modal: options.modal, detail: options.detail },

			items: items.map((item) =>
				typeof item === "string" ? item : item.title,
			),
		};

		try {
			const resultTitle = (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | undefined;

			if (resultTitle) {
				const selectedItem = items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						resultTitle,
				);

				return selectedItem || resultTitle;
			}

			return undefined;
		} catch (e: any) {
			this._logError(
				"showErrorMessage IPC failed:",

				refineError(e, this._logService, "showErrorMessage"),
			);

			return undefined;
		}
	}

	// TODO: Implement other vscode.window members as needed, delegating to specific ExtHost services or MainThread proxies.
	// Examples:
	// public get state(): VscodeWindowState { /* Get from initData or MainThreadWindow proxy */ return { focused: true, active: true }; }

	// public createStatusBarItem(...): VscodeStatusBarItem { /* Delegate to ShimExtHostStatusBar or MainThreadStatusBar proxy */ }

	// public showQuickPick(...)
	// public showInputBox(...)
	// public createWebviewPanel(...)
	// public registerWebviewPanelSerializer(...)
	// public createTreeView(...)
	// public registerTreeDataProvider(...)
	// etc.

	// --- vscode.env members (read-only, from initData) ---
	public get appName(): string {
		return this.#initData.environment.appName || "Cocoon Editor";
	}

	public get appRoot(): string | undefined {
		return this.#initData.environment.appRoot?.fsPath;
	}

	public get appHost(): "desktop" | "web" | "codespaces" | string {
		return this.#initData.environment.appHost || "desktop";
	}

	public get uriScheme(): string {
		return this.#initData.environment.appUriScheme || "cocoon-code";
	}

	public get language(): string {
		return this.#initData.environment.appLanguage || "en";

		// BCP 47
	}

	public get machineId(): string {
		return this.#initData.machineId || "shim-machine-id";
	}

	public get sessionId(): string {
		return this.#initData.sessionId || "shim-session-id";
	}

	public get isTrusted(): boolean {
		return this.#initData.environment.isTrusted ?? true;

		// Default to true if not specified
	}

	public get isRemote(): boolean {
		return !!this.#initData.remote?.isRemote;

		// From initData.remote.isRemote
	}

	public get remoteName(): string | undefined {
		return this.#initData.remote?.authority?.split("+")[0];

		// e.g., 'ssh-remote', 'wsl'
	}

	// TODO: Implement other vscode.env properties:
	// clipboard: vscode.Clipboard; (needs ExtHostClipboard service)
	// openExternal(target: vscode.Uri): Promise<boolean>; (needs ExtHostWindow.$openUri)
	// asExternalUri(target: vscode.Uri): Promise<vscode.Uri>; (needs ExtHostWindow.$asExternalUri)
	// UIKind: vscode.UIKind; (from initData)
	// shell: string; (from initData)
	// appNameLong: string (if available in initData)
	// ... and more.
}
