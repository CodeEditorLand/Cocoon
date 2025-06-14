/**
 * @module CreateWindowNamespace
 * @description Constructs the `vscode.window` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type * as Service from "../../Service.js";

/**
 * Creates the `vscode.window` namespace object.
 *
 * This factory function aggregates multiple services that contribute to the `window`
 * object (e.g., `StatusBarService`, `WebViewPanelService`) and wraps their event
 * emitters for safety.
 *
 * @param WindowService The core window state service.
 * @param WorkSpaceService The workspace service, for properties like `activeTextEditor`.
 * @param StatusBarService The service for creating status bar items.
 * @param WebViewPanelService The service for creating webview panels.
 * @param CustomEditorService The service for custom editors.
 * @param TreeViewService The service for creating tree views.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.window` API.
 */
export function CreateWindowNamespace(
	WindowService: Service.Window.Interface,
	WorkSpaceService: Service.WorkSpace.Interface,
	StatusBarService: Service.StatusBar.Interface,
	WebViewPanelService: Service.WebViewPanel.Interface,
	TreeViewService: Service.TreeView.Interface,
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.window {
	return {
		// --- Properties ---
		get state() {
			return WindowService.state;
		},
		get activeTextEditor() {
			return WorkSpaceService.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkSpaceService.visibleTextEditors;
		},
		get activeTerminal() {
			// Stub: Would be provided by a TerminalService
			return undefined;
		},
		get terminals() {
			// Stub: Would be provided by a TerminalService
			return [];
		},
		get activeColorTheme() {
			// Stub: Would be provided by a ThemeService
			return { kind: 1 }; // Light
		},

		// --- Events ---
		onDidChangeWindowState: AsEvent(WindowService.onDidChangeWindowState),
		onDidChangeActiveTextEditor: AsEvent(
			WorkSpaceService.onDidChangeActiveTextEditor,
		),
		onDidChangeVisibleTextEditors: AsEvent(
			WorkSpaceService.onDidChangeVisibleTextEditors,
		),
		// ... other events would be wrapped here ...

		// --- Methods from other services ---
		createStatusBarItem: (alignmentOrId, priorityOrAlignment, priority) => {
			let id: string | undefined;
			let alignment: VSCode.StatusBarAlignment | undefined;
			let prio: number | undefined;

			if (typeof alignmentOrId === "string") {
				id = alignmentOrId;
				alignment = priorityOrAlignment;
				prio = priority;
			} else {
				alignment = alignmentOrId;
				prio = priorityOrAlignment;
			}

			return Effect.runSync(
				StatusBarService.CreateStatusBarItem(
					Extension,
					id,
					alignment,
					prio,
				),
			);
		},
		createTreeView: (viewId, options) =>
			Effect.runSync(
				TreeViewService.CreateTreeView(viewId, options, Extension),
			),
		createWebviewPanel: (viewType, title, showOptions, options) =>
			Effect.runSync(
				WebViewPanelService.CreateWebViewPanel(
					Extension,
					viewType,
					title,
					showOptions,
					options,
				),
			),
		registerWebviewPanelSerializer: (viewType, serializer) =>
			Effect.runSync(
				WebViewPanelService.RegisterWebviewPanelSerializer(
					Extension,
					viewType,
					serializer,
				),
			),
		// ... other methods like showQuickPick, showInformationMessage are delegated ...
		// These are typically added to the final object in the APIFactory itself
		// or accessed via the corresponding service.
	} as any;
}
