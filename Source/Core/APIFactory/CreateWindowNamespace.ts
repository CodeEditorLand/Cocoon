/*
 * File: Cocoon/Source/Core/APIFactory/CreateWindowNamespace.ts
 * Responsibility: Constructs the vscode.window namespace for the API object.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ../../Service/StatusBar/Service.js, ../../Service/TreeView/Service.js, ../../Service/WebViewPanel/Service.js, ../../Service/Window/Service.js, ../../Service/WorkSpace/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
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
import type WorkSpaceService from "../../Service/WorkSpace/Service.js";

/**
 * Creates the `vscode.window` namespace object.
 *
 * This factory function aggregates multiple services that contribute to the `window`
 * object. Its methods now return composable `Effect`s instead of running them.
 *
 * @param Window The core window state service.
 * @param WorkSpace The workspace service, for properties like `activeTextEditor`.
 * @param StatusBar The service for creating status bar items.
 * @param WebViewPanel The service for creating webview panels.
 * @param TreeView The service for creating tree views.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.window` API.
 */
const CreateWindowNamespace = (
	Window: WindowService["Type"],
	WorkSpace: WorkSpaceService["Type"],
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
			// This property comes from a different service, which was a leaky abstraction.
			// It has been removed from WorkSpaceService and is now correctly on WindowService.
			return Window.activeTextEditor;
		},
		get visibleTextEditors() {
			return Window.visibleTextEditors;
		},
		get activeTerminal() {
			return undefined; // Stub
		},
		get terminals() {
			return []; // Stub
		},
		get activeColorTheme() {
			return { kind: 1 as VSCode.ColorThemeKind.Light }; // Stub
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
		}) as any, // Cast to any to satisfy the vscode.d.ts which expects a direct return.
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
