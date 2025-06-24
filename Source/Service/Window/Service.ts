/*
 * File: Cocoon/Source/Service/Window/Service.ts
 * Role: Defines the interface and Effect.Service for the core Window service.
 * Responsibilities:
 *   - Declare the contract for the service that manages window-level state and
 *     orchestrates calls to sub-services like dialogs, messages, and quick input.
 *   - Provide the `Effect.Service` for dependency injection.
 */

import { Effect } from "effect";
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
 * The `Effect.Service` for the core `vscode.window` properties and methods.
 *
 * This service focuses on window state (`focused`, `active`) and the primary
 * action of showing a text document. Other `vscode.window` functionalities
 * (like `showQuickPick`, `showInformationMessage`) are handled by their own
 * dedicated services (`QuickInput`, `Message`) to maintain separation of concerns.
 * The `APIFactory` is responsible for assembling these into the final `vscode.window` object.
 */
export class Window extends Effect.Service<Window>("Service/Window")<{
	readonly state: WindowState;
	readonly onDidChangeWindowState: Event<WindowState>;
	readonly ShowTextDocument: (
		documentOrURI: Uri | TextDocument,
		columnOrOptions?: ViewColumn | TextDocumentShowOptions,
		preserveFocus?: boolean,
	) => Effect.Effect<TextEditor, Error>;
}>() {}
