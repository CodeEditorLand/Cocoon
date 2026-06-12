/**
 * @module Services/Window/WebviewPanel
 * @description
 * Webview panel creation for the Window service.
 * Uses WebviewPanelImplementation and delegates registration to Mountain
 * via gRPC.
 *
 * Source: src/vs/workbench/api/common/extHostWebview.ts (createWebviewPanel)
 */

import type * as VSCode from "vscode";

import { FromAPI as ViewColumnFromAPI } from "../../../TypeConverter/Main/View/Column.js";

import { WebviewPanelImplementation } from "../../../WebviewPanel/Webview/Panel/Implementation.js";

/**
 * IPC proxy shape used inside WebviewPanelImplementation.
 */
interface WebviewIPC {

	SendNotification: (Method: string, Params: unknown[]) => Promise<void>;

	SendRequest: <T>(Method: string, Params: unknown[]) => Promise<T>;
}

/**
 * Create a webview panel backed by Mountain gRPC and WebviewPanelImplementation.
 *
 * Serializes show options and panel options, registers the panel with Mountain,
 * and returns a full VSCode.WebviewPanel proxy.
 *
 * @param MountainClient - gRPC client with sendNotification support
 * @param GRPCClient - Mountain gRPC client for createWebviewPanel call
 * @param Logger - Logger for info/debug output
 * @param ViewType - Webview panel type identifier
 * @param Title - Panel title
 * @param ShowOptions - Column or column+focus options
 * @param Options - Optional panel and webview options
 */
export const CreateWebviewPanel = (
	MountainClient: {
		sendNotification: (method: string, params: unknown) => Promise<void>;
	},

	GRPCClient: {
		createWebviewPanel: (params: {
			viewType: string;

			title: string;

			iconPath: undefined;

			viewColumn: number | undefined;

			preserveFocus: boolean;

			enableFindWidget: boolean;

			retainContextWhenHidden: boolean;

			localResourceRoots: string[] | undefined;
		}) => Promise<unknown>;
	},

	Logger: {
		Info: (Message: string, ...Data: unknown[]) => Promise<void>;

		Debug: (Message: string, ...Data: unknown[]) => Promise<void>;
	},

	ViewType: string,

	Title: string,

	ShowOptions:
		| VSCode.ViewColumn
		| { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean },

	Options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions,
): Promise<VSCode.WebviewPanel> =>
	async function() {

		const PanelId = `webview-${crypto.randomUUID()}`;

		await Logger.Info(
			`[WindowService] Creating webview panel: ${ViewType} - ${Title} (${PanelId})`,
		;

		// Parse show options
		const ViewColumn =
			typeof ShowOptions === "number"
				? ShowOptions
				: ShowOptions.viewColumn;

		const PreserveFocus =
			typeof ShowOptions === "object"
				? (ShowOptions.preserveFocus ?? false)
				: false;

		// Parse panel options for the proxy
		const PanelOptionsDTO = Options
			? {
					enableFindWidget: Options.enableFindWidget,
					enableScripts: Options.enableScripts,
					enableForms: Options.enableForms,
					enableCommandUris: Options.enableCommandUris,
					portMapping: Options.portMapping,
					localResourceRoots: Options.localResourceRoots,
					retainContextWhenHidden: Options.retainContextWhenHidden,
				}
			: undefined;

		// Convert ViewColumn to DTO format
		const ViewColumnDTO = ViewColumnFromAPI(ViewColumn;

		// Register the panel with Mountain
		await GRPCClient.createWebviewPanel({
			viewType: ViewType,
			title: Title ?? "",
			iconPath: undefined,
			viewColumn: ViewColumn ? ViewColumn - 2 : undefined,
			preserveFocus: PreserveFocus ?? true,
			enableFindWidget: Options?.enableFindWidget ?? true,
			retainContextWhenHidden: Options?.retainContextWhenHidden ?? false,
			localResourceRoots: Options?.localResourceRoots?.map((Uri) =>
				Uri.toString(),
			),
		};

		// Build IPC proxy for webview <-> extension message passing
		const IPCProxy: WebviewIPC = {
			SendNotification: (Method: string, Params: unknown[]) => {
				void Logger.Debug(
					`[WindowService] Webview notification: ${Method}`,
				).catch(() => {};

				return MountainClient.sendNotification("webview.postMessage", {
					panelId: PanelId,
					method: Method,
					params: Params,
				}).catch(() => {};
			},
			SendRequest: <T>(_Method: string, _Params: unknown[]): Promise<T> =>
				// Webview sendRequest is fire-and-forget from extension side;
				// Sky resolves via onDidReceiveMessage.
				Promise.resolve(undefined as T),
		};

		// Placeholder extension description - TODO: get from context
		const ExtensionDescription: any = {
			identifier: { value: "extension-placeholder" },
			extensionLocation: { scheme: "file", path: "/tmp/extension" },
		};

		// Create and return webview panel implementation
		const WebviewPanel = new WebviewPanelImplementation(
			PanelId,

			IPCProxy,

			ExtensionDescription,

			() => {
				// Dispose callback: notify Mountain to destroy the webview panel
				MountainClient.sendNotification("webview.dispose", {
					panelId: PanelId,
				}).catch(() => {};
			},

			ViewType,

			Title,

			PanelOptionsDTO ?? {},

			ViewColumn,
		;

		return WebviewPanel;
	};
