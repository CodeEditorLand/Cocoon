/*
 * File: Cocoon/Source/Core/APIFactory/CreateWindowNamespace.ts
 * Responsibility: Constructs the vscode.window namespace for the API object.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module CreateWindowNamespace
 * @description Constructs the `vscode.window` namespace for the API object.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type StatusBarService from "../../Service/StatusBar/Service.js";
import type TreeViewService from "../../Service/TreeView/Service.js";
import type WebViewPanelService from "../../Service/WebViewPanel/Service.js";
import type WindowService from "../../Service/Window/Service.js";

/**
 * Creates the `vscode.window` namespace object.
 */
const CreateWindowNamespace = (
	Window: WindowService["Type"],
	// FIX: Removed unused parameter `WorkSpace`
	// WorkSpace: WorkSpaceService["Type"],
	StatusBar: StatusBarService["Type"],
	WebViewPanel: WebViewPanelService["Type"],
	TreeView: TreeViewService["Type"],
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.window => {
	const WindowNamespace: Partial<typeof VSCode.window> = {
		// --- Properties ---
		get state() {
			return Window.state;
		},
		get activeTextEditor() {
			return Window.activeTextEditor;
		},
		get visibleTextEditors() {
			return Window.visibleTextEditors;
		},
		get activeTerminal() {
			return undefined;
		},
		get terminals() {
			return [];
		},
		get activeColorTheme() {
			return { kind: 1 as VSCode.ColorThemeKind.Light };
		},

		// --- Events ---
		onDidChangeWindowState: AsEvent(Window.onDidChangeWindowState),
		onDidChangeActiveTextEditor: AsEvent(
			Window.onDidChangeActiveTextEditor,
		),
		onDidChangeVisibleTextEditors: AsEvent(
			Window.onDidChangeVisibleTextEditors,
		),

		// --- Methods from other services (now return Effects) ---
		createStatusBarItem: ((...args: any[]) => {
			let id: string | undefined;
			let alignment: VSCode.StatusBarAlignment | undefined;
			let prio: number | undefined;
			if (typeof args[0] === "string") {
				id = args[0];
				alignment = args[1];
				prio = args[2];
			} else {
				alignment = args[0];
				prio = args[1];
			}
			return StatusBar.CreateStatusBarItem(
				Extension,
				id,
				alignment,
				prio,
			);
		}) as any,
		createTreeView: (viewId, options) =>
			TreeView.CreateTreeView(viewId, options, Extension) as any,
		createWebviewPanel: (viewType, title, showOptions, options) =>
			WebViewPanel.CreateWebviewPanel(
				Extension,
				viewType,
				title,
				showOptions,
				options,
			) as any,
		registerWebviewPanelSerializer: (viewType, serializer) =>
			WebViewPanel.RegisterWebviewPanelSerializer(
				Extension,
				viewType,
				serializer,
			) as any,
	};

	return WindowNamespace as typeof VSCode.window;
};

export default CreateWindowNamespace;
