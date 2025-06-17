/*
 * File: Cocoon/Source/Core/APIFactory/CreateWindowNamespace.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:56 UTC
 * Dependency: ../../Service/StatusBar/Service.js, ../../Service/TreeView/Service.js, ../../Service/WebViewPanel/Service.js, ../../Service/Window/Service.js, ../../Service/WorkSpace/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module CreateWindowNamespace
 * @description Constructs the `vscode.window` namespace for the API object.
 */

import { Effect } from "effect";
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
 * object (e.g., `StatusBarService`, `WebViewPanelService`) and wraps their event
 * emitters for safety.
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
	const PartialWindowNamespace: Partial<typeof VSCode.window> = {
		// --- Properties ---
		get state() {
			return Window.state;
		},
		get activeTextEditor() {
			return WorkSpace.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkSpace.visibleTextEditors;
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
			return { kind: 1 as VSCode.ColorThemeKind.Light };
		},

		// --- Events ---
		onDidChangeWindowState: AsEvent(Window.onDidChangeWindowState),
		onDidChangeActiveTextEditor: AsEvent(
			WorkSpace.onDidChangeActiveTextEditor,
		),
		onDidChangeVisibleTextEditors: AsEvent(
			WorkSpace.onDidChangeVisibleTextEditors,
		),
		// ... other events would be wrapped here ...

		// --- Methods from other services ---
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

			return Effect.runSync(
				StatusBar.CreateStatusBarItem(Extension, id, alignment, prio),
			);
		}) as typeof VSCode.window.createStatusBarItem,
		createTreeView: (viewId, options) =>
			Effect.runSync(TreeView.CreateTreeView(viewId, options, Extension)),
		createWebviewPanel: (viewType, title, showOptions, options) =>
			Effect.runSync(
				WebViewPanel.CreateWebviewPanel(
					Extension,
					viewType,
					title,
					showOptions,
					options,
				),
			),
		registerWebviewPanelSerializer: (viewType, serializer) =>
			Effect.runSync(
				WebViewPanel.RegisterWebviewPanelSerializer(
					Extension,
					viewType,
					serializer,
				),
			),
		// ... other methods like showQuickPick, showInformationMessage are delegated ...
		// These are typically added to the final object in the APIFactory itself
		// or accessed via the corresponding service.
	};

	return PartialWindowNamespace as typeof VSCode.window;
};
export default CreateWindowNamespace;
