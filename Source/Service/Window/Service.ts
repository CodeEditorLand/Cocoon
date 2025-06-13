/**
 * @module Service (Window)
 * @description Defines the interface and Context.Tag for the core Window service.
 */

import { Context, Effect, Stream } from "effect";
import type {
	Event,
	TextDocumentShowOption,
	TextEditor,
	ViewColumn,
	WindowState,
} from "vscode";

/**
 * The service interface for the core `vscode.window` properties and methods.
 * Note: Does NOT include methods handled by other services like `showQuickPick`
 * or `createStatusBarItem`. This interface is for internal composition. The
 * final `vscode.window` object is assembled in the APIFactory.
 */
export interface Interface {
	readonly state: WindowState;
	readonly onDidChangeWindowState: Stream.Stream<WindowState, never>;

	readonly activeTextEditor: TextEditor | undefined;
	readonly visibleTextEditors: readonly TextEditor[];
	readonly onDidChangeActiveTextEditor: Stream.Stream<
		TextEditor | undefined,
		never
	>;
	readonly onDidChangeVisibleTextEditors: Stream.Stream<
		readonly TextEditor[],
		never
	>;

	readonly ShowTextDocument: (
		documentOrUri: any,
		columnOrOption?: ViewColumn | TextDocumentShowOption,
		preserveFocus?: boolean,
	) => Effect.Effect<TextEditor, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Window");
