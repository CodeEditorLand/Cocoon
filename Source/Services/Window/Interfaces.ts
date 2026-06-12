/**
 * @module Services/Window/Interfaces
 * @description
 * All interface and type declarations for the Window service.
 * Mirrors the VS Code window API surface with Effect-TS integration.
 *
 * Source: src/vs/workbench/api/common/extHostWindow.ts (ExtHostWindowShape)
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

/**
 * Logger interface for Window service logging.
 */
export interface Logger {
	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;

	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;

	readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;

	readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;

	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
}

/**
 * Workspace interface for accessing active and visible text editors.
 */
export interface Workspace {
	readonly activeTextEditor: VSCode.TextEditor | undefined;

	readonly visibleTextEditors: readonly VSCode.TextEditor[];
}

/**
 * The contract for the Window service, mirroring `vscode.window` API surface
 * with Effect-TS integration and PascalCase method names.
 *
 * Specification: src/vs/workbench/api/common/extHostWindow.ts (ExtHostWindowShape)
 */
export interface Window {
	readonly state: VSCode.WindowState;

	readonly activeTextEditor: VSCode.TextEditor | undefined;

	readonly visibleTextEditors: readonly VSCode.TextEditor[];

	readonly onDidChangeWindowState: VSCode.Event<VSCode.WindowState>;

	readonly ShowTextDocument: (
		DocumentOrUri: VSCode.Uri | VSCode.TextDocument,

		ColumnOrOptions?: VSCode.ViewColumn | VSCode.TextDocumentShowOptions,

		PreserveFocus?: boolean,
	) => Effect.Effect<VSCode.TextEditor, Error>;

	readonly ShowInformationMessage: (
		Message: string,
		...Items: string[]
	) => Effect.Effect<string | undefined, Error>;

	readonly ShowWarningMessage: (
		Message: string,
		...Items: string[]
	) => Effect.Effect<string | undefined, Error>;

	readonly ShowErrorMessage: (
		Message: string,
		...Items: string[]
	) => Effect.Effect<string | undefined, Error>;

	readonly ShowQuickPick: <T extends string>(
		Items: readonly T[] | VSCode.QuickPickItem[],

		Options?: VSCode.QuickPickOptions,
	) => Effect.Effect<T | VSCode.QuickPickItem | undefined, Error>;

	readonly ShowInputBox: (
		Options?: VSCode.InputBoxOptions,
	) => Effect.Effect<string | undefined, Error>;

	readonly ShowOpenDialog: (
		Options?: VSCode.OpenDialogOptions,
	) => Effect.Effect<VSCode.Uri[] | undefined, Error>;

	readonly ShowSaveDialog: (
		Options?: VSCode.SaveDialogOptions,
	) => Effect.Effect<VSCode.Uri | undefined, Error>;

	readonly WithProgress: <T>(
		Options: VSCode.ProgressOptions,

		Task: (
			Progress: VSCode.Progress<{ message?: string; increment?: number }>,

			Token: VSCode.CancellationToken,
		) => Promise<T>,
	) => Effect.Effect<T, Error>;

	readonly CreateStatusBarItem: (
		Id?: string,

		Alignment?: VSCode.StatusBarAlignment,

		Priority?: number,
	) => Effect.Effect<VSCode.StatusBarItem, Error>;

	readonly CreateOutputChannel: (
		Name: string,
	) => Effect.Effect<VSCode.OutputChannel, Error>;

	readonly CreateWebviewPanel: (
		ViewType: string,

		Title: string,

		ShowOptions:
			| VSCode.ViewColumn
			| { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean },

		Options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions,
	) => Effect.Effect<VSCode.WebviewPanel, Error>;
}

/**
 * Window interface compatible with the public VSCode extension API.
 * This is what extensions see when they access `vscode.window`.
 *
 * TODO: Implement this as a namespace factory in APIFactoryService.
 */
export interface VSCodeWindowAPI {
	readonly activeTextEditor: VSCode.TextEditor | undefined;

	readonly visibleTextEditors: readonly VSCode.TextEditor[];

	readonly activeColorTheme: VSCode.ColorTheme;

	readonly state: VSCode.WindowState;

	readonly onDidChangeActiveTextEditor: VSCode.Event<
		VSCode.TextEditor | undefined
	>;

	readonly onDidChangeVisibleTextEditors: VSCode.Event<VSCode.TextEditor[]>;

	readonly onDidChangeWindowState: VSCode.Event<VSCode.WindowState>;

	showTextDocument(
		documentOrUri: VSCode.Uri | VSCode.TextDocument,

		column?: VSCode.ViewColumn,

		preserveFocus?: boolean,
	): Thenable<VSCode.TextEditor>;

	showInformationMessage(
		message: string,
		...items: string[]
	): Thenable<string>;

	showWarningMessage(message: string, ...items: string[]): Thenable<string>;

	showErrorMessage(message: string, ...items: string[]): Thenable<string>;

	showQuickPick<T extends string>(
		items: readonly T[],

		options?: VSCode.QuickPickOptions,
	): Thenable<T | undefined>;

	showInputBox(
		options?: VSCode.InputBoxOptions,
	): Thenable<string | undefined>;

	createStatusBarItem(
		id?: string,

		alignment?: VSCode.StatusBarAlignment,

		priority?: number,
	): VSCode.StatusBarItem;

	createOutputChannel(name: string): VSCode.OutputChannel;

	createWebviewPanel(
		viewType: string,

		title: string,

		showOptions:
			| VSCode.ViewColumn
			| { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean },

		options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions,
	): VSCode.WebviewPanel;
}
