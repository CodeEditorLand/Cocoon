/**
 * @module Services/Window/Types
 * @description
 * Type definitions for Window service operations.
 * Following Wind Effect-TS atomic module pattern.
 */

import type * as VSCode from "vscode";

/**
 * Window state configuration
 */
export interface WindowStateConfig {
	focused: boolean;
	active: boolean;
}

/**
 * Status bar item state
 */
export interface StatusBarState {
	id: string;
	name: string | undefined;
	text: string;
	tooltip: string | VSCode.MarkdownString | undefined;
	command: string | VSCode.Command | undefined;
	alignment: VSCode.StatusBarAlignment;
	priority: number | undefined;
	backgroundColor: string | VSCode.ThemeColor | undefined;
	color: string | VSCode.ThemeColor | undefined;
	isVisible: boolean;
}

/**
 * Output channel state
 */
export interface OutputChannelState {
	name: string;
	output: string[];
	isVisible: boolean;
	isVisibleToUser: boolean;
	appendLineCount: number;
}

/**
 * Webview panel state
 */
export interface WebviewPanelState {
	viewType: string;
	title: string;
	column: VSCode.ViewColumn;
	preserveFocus: boolean;
	options: VSCode.WebviewPanelOptions & VSCode.WebviewOptions;
	isVisible: boolean;
	isActive: boolean;
	webviewOptions: VSCode.WebviewOptions;
}

/**
 * Progress operation state
 */
export interface ProgressState {
	location: VSCode.ProgressLocation;
	title?: string;
	cancellable: boolean;
	totalWork?: number;
	currentWork: number;
	increment: number;
	reportedMessages: string[];
}

/**
 * Text document display options
 */
export interface TextDocumentOptions {
	uri: string;
	viewColumn?: number;
	preserveFocus?: boolean;
	preview?: boolean;
	selection?: VSCode.Range;
}

/**
 * Dialog options payload
 */
export interface DialogOptionsPayload {
	message: string;
	buttons?: string[];
	items?: string[];
	icon?: VSCode.MessageBoxOptions["icon"];
	modal?: boolean;
}

/**
 * Quick pick options payload
 */
export interface QuickPickOptionsPayload {
	items: readonly (string | VSCode.QuickPickItem)[];
	placeholder?: string;
	title?: string;
	matchOnDescription?: boolean;
	matchOnDetail?: boolean;
	ignoreFocusOut?: boolean;
	canPickMany?: boolean;
}

/**
 * Input box options payload
 */
export interface InputBoxOptionsPayload {
	value?: string;
	valueSelection?: [number, number];
	prompt?: string;
 placeHolder?: string;
	password?: boolean;
	ignoreFocusOut?: boolean;
	validateInput?: (value: string) => string | undefined | null;
	title?: string;
}

/**
 * File dialog options payload
 */
export interface FileDialogOptionsPayload {
	title?: string;
	defaultUri?: string;
	buttonLabel?: string;
	filters?: VSCode.FileFilter;
	canSelectFiles?: boolean;
	canSelectFolders?: boolean;
	canSelectMany?: boolean;
	openLabel?: string;
	saveLabel?: string;
}

/**
 * Webview panel creation options payload
 */
export interface WebviewPanelOptionsPayload {
	viewType: string;
	title: string;
	showOptions:
		| VSCode.ViewColumn
		| { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean };
	webviewOptions?: VSCode.WebviewOptions;
	panelOptions?: VSCode.WebviewPanelOptions;
}

/**
 * Progress options payload
 */
export interface ProgressOptionsPayload {
	location: VSCode.ProgressLocation;
	title?: string;
	cancellable?: boolean;
}

/**
 * Logger interface for Window service
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
 * Workspace interface for accessing text editors
 */
export interface Workspace {
	readonly activeTextEditor: VSCode.TextEditor | undefined;
	readonly visibleTextEditors: readonly VSCode.TextEditor[];
}

/**
 * Window service interface
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
		Options?: VSCode.InputBox{