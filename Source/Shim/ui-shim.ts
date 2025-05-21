import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// Assuming vscode API types might be needed if this evolves
// import { MessageOptions, MessageItem, QuickPickOptions, QuickPickItem, InputBoxOptions, OpenDialogOptions, SaveDialogOptions, Uri } from "vscode";

// If using RPC for messages
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// Define a simplified InitData structure relevant to this shim
interface ShimInitDataUi {
	environment: {
		appName?: string;

		// Simplified UriComponents
		appRoot?: { fsPath: string; [key: string]: any };

		appHost?: string;

		appUriScheme?: string;

		appLanguage?: string;

		// Other environment properties
		[key: string]: any;
	};

	machineId?: string;

	sessionId?: string;

	// ... other initData properties
}

// Interface for MainThreadMessageService if messages are proxied via RPC
// interface MainThreadMessageServiceShape {

//  $showMessage(severity: number, message: string, options: MessageOptions, items: (string | MessageItem)[]): Promise<string | MessageItem | undefined>;

// }

// Severity enum values (from vs/platform/notification/common/notification.ts or similar)
enum Severity {
	Ignore = 0,

	Info = 1,

	Warning = 2,

	Error = 3,
}

export class ShimExtHostUI extends BaseCocoonShim {
	readonly #initData: ShimInitDataUi;

	constructor(
		// May not be used if all UI ops are direct IPC
		rpcService: IExtHostRpcService | undefined,

		initData: ShimInitDataUi,

		logService: ILogService | undefined,
	) {
		// "ExtHostUI" is a conceptual name; this doesn't map 1:1 to a specific ExtHost service.
		// If it were for messages, it'd be "ExtHostMessageService".
		// If for window state, "ExtHostWindow".
		// For env, it's usually direct access or part of ExtHostEnvironment.
		super("ExtHostUIConceptual", rpcService, logService);

		this.#initData = initData;

		// No RPC registration for this conceptual shim unless it implements a specific ExtHost...Shape
		this._log("Initialized.");
	}

	// --- vscode.window members (subset) ---

	// These methods would ideally be part of a more specific ShimExtHostMessageService
	public async showInformationMessage(
		message: string,

		...rest: any[] /* (MessageOptions | string | MessageItem)[] | string[] | MessageItem[] */
	): Promise<string | undefined /* | MessageItem */> {
		this._log(`showInformationMessage: "${message}"`);

		// Parse ...rest for options and items
		// MessageOptions
		let options: any = {};

		// (string | MessageItem)[]
		let items: (string | { title: string; [key: string]: any })[] = [];

		if (rest.length > 0) {
			if (
				typeof rest[0] === "object" &&
				rest[0] !== null &&
				!("title" in rest[0])
			) {
				// Assuming it's MessageOptions
				options = rest.shift();
			}

			items = rest.map((item) =>
				typeof item === "string"
					? item
					: { title: item.title, ...item },
			);
		}

		// Option 1: Direct IPC (as in original JS)
		const params = {
			// Use an enum if available
			severity: Severity.Info,

			message,

			// Send modal, detail if supported
			options: options,

			items: items.map(
				(item) => (typeof item === "string" ? item : item.title),

				// Send item titles
			),
		};

		try {
			// Assuming _ipcRequestResponse returns the selected item's title or undefined
			const result = await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,

				// Long timeout for user interaction
			);

			if (typeof result === "string") {
				// Find the original item if complex items were used.
				// For string items, result is the string itself.
				const MappedItem = items.find(
					(i) => (typeof i === "string" ? i : i.title) === result,
				);

				return typeof MappedItem === "string"
					? MappedItem
					: // Or return MessageItem
						MappedItem?.title;
			}

			return undefined;
		} catch (e) {
			this._logError("showInformationMessage IPC failed:", e);

			// Default on failure
			return undefined;
		}

		// Option 2: RPC to MainThreadMessageService (if it exists and is preferred)
		// const messageProxy = this._getProxy(MainContext.MainThreadMessageService as ProxyIdentifier<MainThreadMessageServiceShape>);

		// if (messageProxy) {

		//     return messageProxy.$showMessage(Severity.Info, message, options, items);

		// } else {

		//     this._logError("MainThreadMessageService proxy unavailable for showInformationMessage.");

		//     return Promise.resolve(undefined);

		// }
	}

	public async showWarningMessage(
		message: string,

		...rest: any[]
	): Promise<string | undefined> {
		this._log(`showWarningMessage: "${message}"`);

		let options: any = {};

		let items: (string | { title: string })[] = [];

		if (
			rest.length > 0 &&
			typeof rest[0] === "object" &&
			!("title" in rest[0])
		)
			options = rest.shift();

		items = rest.map((item) =>
			typeof item === "string" ? item : { title: item.title },
		);

		const params = {
			severity: Severity.Warning,

			message,

			options,

			items: items.map((i) => (typeof i === "string" ? i : i.title)),
		};

		try {
			return (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | undefined;
		} catch (e) {
			this._logError("showWarningMessage IPC failed:", e);

			return undefined;
		}
	}

	public async showErrorMessage(
		message: string,

		...rest: any[]
	): Promise<string | undefined> {
		this._log(`showErrorMessage: "${message}"`);

		let options: any = {};

		let items: (string | { title: string })[] = [];

		if (
			rest.length > 0 &&
			typeof rest[0] === "object" &&
			!("title" in rest[0])
		)
			options = rest.shift();

		items = rest.map((item) =>
			typeof item === "string" ? item : { title: item.title },
		);

		const params = {
			severity: Severity.Error,

			message,

			options,

			items: items.map((i) => (typeof i === "string" ? i : i.title)),
		};

		try {
			return (await this._ipcRequestResponse(
				"ui_showMessage",

				params,

				120000,
			)) as string | undefined;
		} catch (e) {
			this._logError("showErrorMessage IPC failed:", e);

			return undefined;
		}
	}

	// Stubs for other vscode.window properties/methods if this class provides them
	// For example:
	// get state(): WindowState { /* Get from initData or proxy */ return { focused: true }; }

	// createStatusBarItem(): StatusBarItem { /* Proxy to MainThreadStatusBar */ ... }

	// showQuickPick, showInputBox, etc. would also be proxied.

	// --- vscode.env members (usually provided by ExtHostEnvironment) ---
	// These are often read-only properties derived from initData.

	get appName(): string {
		// Default
		return this.#initData.environment.appName || "Cocoon Editor";
	}

	get appRoot(): string | undefined {
		return this.#initData.environment.appRoot?.fsPath;
	}

	get appHost(): string {
		// 'desktop' | 'web' | 'codespaces'
		return this.#initData.environment.appHost || "desktop";
	}

	get uriScheme(): string {
		// e.g., 'vscode', 'vscode-insiders'
		return this.#initData.environment.appUriScheme || "cocoon-code";
	}

	get language(): string {
		// BCP 47 language tag
		return this.#initData.environment.appLanguage || "en";
	}

	get machineId(): string {
		return this.#initData.machineId || "shim-machine-id";
	}

	get sessionId(): string {
		return this.#initData.sessionId || "shim-session-id";
	}

	get isTrusted(): boolean {
		// Default to trusted if not specified
		return this.#initData.environment.isTrusted ?? true;
	}

	// ... other vscode.env properties like clipboard, openExternal, etc.
	// These would typically be part of an IExtHostEnvironment service.
}

// Note: In a real VS Code architecture, `vscode.window` and `vscode.env` are populated
// by multiple ExtHost services (ExtHostMessageService, ExtHostWindow, ExtHostEnvironment, etc.).
// This `ShimExtHostUI` is a conceptual grouping. For DI, you'd register specific shims
// for IExtHostMessageService, IExtHostEnvironment, etc.

// Class is already exported
// export { ShimExtHostUI };
