/*
 * File: Cocoon/Source/Core/APIFactory/CreateWindowNamespace.ts
 * Role: Constructs the `vscode.window` namespace for the public API object.
 * Responsibilities:
 *   - Assembles the `vscode.window` object by sourcing properties and methods
 *     from their respective, decoupled services (e.g., `Window`, `StatusBar`,
 *     `TreeView`, `Workspace`).
 *   - Adapts the `Effect`-based service methods to the promise-based or
 *     synchronous signatures expected by the `vscode.d.ts` API contract.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import { StatusBar } from "../../Service/StatusBar/Service.js";
import { TreeView } from "../../Service/TreeView/Service.js";
import { WebViewPanel } from "../../Service/WebViewPanel/Service.js";
import { Window } from "../../Service/Window/Service.js";
import { Workspace } from "../../Service/WorkSpace/Service.js";

/**
 * Creates the `vscode.window` namespace object.
 *
 * @param WindowService - The core `Window` service.
 * @param StatusBarService - The `StatusBar` service.
 * @param WebViewPanelService - The `WebViewPanel` service.
 * @param TreeViewService - The `TreeView` service.
 * @param AsEvent - A function to create a safe event subscription for an extension.
 * @param Extension - The description of the extension this API is for.
 * @param WorkspaceService - The `Workspace` service, which is the source of truth for editor state.
 * @returns An object that implements the `vscode.window` API.
 */
export const CreateWindowNamespace = (
	WindowService: Window["Type"],
	StatusBarService: StatusBar["Type"],
	WebViewPanelService: WebViewPanel["Type"],
	TreeViewService: TreeView["Type"],
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
	WorkspaceService: Workspace["Type"],
): typeof VSCode.window => {
	const RunEffectAndReturnPromise = <T, E>(TheEffect: Effect.Effect<T, E>) =>
		Effect.runPromise(Effect.mapError(TheEffect, (e) => e as Error));

	const WindowNamespace: Partial<typeof VSCode.window> = {
		// --- Properties from WindowService ---
		get state() {
			return WindowService.state;
		},
		get onDidChangeWindowState() {
			return AsEvent(WindowService.onDidChangeWindowState);
		},

		// --- Properties from WorkspaceService (Source of Truth for Editor State) ---
		get activeTextEditor() {
			return WorkspaceService.activeTextEditor;
		},
		get visibleTextEditors() {
			return WorkspaceService.visibleTextEditors;
		},
		get onDidChangeActiveTextEditor() {
			return AsEvent(WorkspaceService.onDidChangeActiveTextEditor);
		},
		get onDidChangeVisibleTextEditors() {
			return AsEvent(WorkspaceService.onDidChangeVisibleTextEditors);
		},

		// --- Methods from WindowService ---
		showTextDocument: (DocumentOrURI, ColumnOrOptions, PreserveFocus) =>
			RunEffectAndReturnPromise(
				WindowService.ShowTextDocument(
					DocumentOrURI,
					ColumnOrOptions,
					PreserveFocus,
				),
			),

		// --- Methods from other services ---
		createStatusBarItem: ((...args: any[]) => {
			let id: string | undefined;
			let alignment: VSCode.StatusBarAlignment | undefined;
			let priority: number | undefined;
			if (typeof args[0] === "string") {
				[id, alignment, priority] = args;
			} else {
				[alignment, priority] = args;
			}
			return Effect.runSync(
				StatusBarService.CreateStatusBarItem(
					Extension,
					id,
					alignment,
					priority,
				),
			);
		}) as any,

		createTreeView: (ViewId, Options) =>
			RunEffectAndReturnPromise(
				TreeViewService.CreateTreeView(ViewId, Options, Extension),
			),

		createWebviewPanel: (ViewType, Title, ShowOptions, Options) =>
			RunEffectAndReturnPromise(
				WebViewPanelService.CreateWebviewPanel(
					Extension,
					ViewType,
					Title,
					ShowOptions,
					Options,
				),
			),

		registerWebviewPanelSerializer: (ViewType, Serializer) =>
			Effect.runSync(
				WebViewPanelService.RegisterWebviewPanelSerializer(
					Extension,
					ViewType,
					Serializer,
				),
			),

		// --- Stubbed properties and events for completeness ---
		activeTerminal: undefined,
		terminals: [],
		activeColorTheme: { kind: 1 as VSCode.ColorThemeKind.Light },
		onDidChangeActiveTerminal: new Emitter<any>().event,
		onDidOpenTerminal: new Emitter<any>().event,
		onDidCloseTerminal: new Emitter<any>().event,
		onDidChangeTerminalState: new Emitter<any>().event,
		onDidChangeTextEditorSelection: new Emitter<any>().event,
		onDidChangeTextEditorVisibleRanges: new Emitter<any>().event,
		onDidChangeTextEditorOptions: new Emitter<any>().event,
		onDidChangeTextEditorViewColumn: new Emitter<any>().event,
		// ... other stubs
	};

	// Add getters for Message/Dialog/QuickInput methods. This avoids
	// making them dependencies of this factory directly. The final `vscode.window`
	// object will have these merged on by the main APIFactory.
	return WindowNamespace as typeof VSCode.window;
};
