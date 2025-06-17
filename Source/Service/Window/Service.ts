/*
 * File: Cocoon/Source/Service/Window/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:16 UTC
 * Dependency: effect
 * Export: WindowService
 */

/**
 * @module Service (Window)
 * @description Defines the interface and Context.Tag for the core Window service.
 * This service manages properties like window state and orchestrates calls to
 * sub-services like dialogs, messages, and quick input.
 */

import { Context, type Effect } from "effect";
import type {
	Event,
	TextDocument,
	TextDocumentShowOptions,
	TextEditor,
	Uri,
	ViewColumn,
	WindowState,
} from "vscode";

/**
 * The `Context.Tag` for the core `vscode.window` properties and methods.
 * Note: Does NOT include methods handled by other services (e.g., `showQuickPick`).
 * The final `vscode.window` object is assembled in the APIFactory.
 */
export default class WindowService extends Context.Tag("Service/Window")<
	WindowService,
	{
		readonly state: WindowState;
		readonly onDidChangeWindowState: Event<WindowState>;

		readonly activeTextEditor: TextEditor | undefined;
		readonly visibleTextEditors: readonly TextEditor[];
		readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
		readonly onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;

		/**
		 * Shows a text document in an editor.
		 * @param documentOrURI The document or URI to show.
		 * @param columnOrOptions The column or options for showing the document.
		 * @param preserveFocus When `true`, the editor will not take focus.
		 * @returns An `Effect` that resolves with the opened `TextEditor`.
		 */
		readonly ShowTextDocument: (
			documentOrURI: Uri | TextDocument,
			columnOrOptions?: ViewColumn | TextDocumentShowOptions,
			preserveFocus?: boolean,
		) => Effect.Effect<TextEditor, Error>;
	}
>() {}
