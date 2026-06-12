/**
 * @module Services/Window/TextDocument
 * @description
 * Text document display and message dialog implementations for the Window
 * service.  Delegates to Mountain's native UI via gRPC.
 *
 * Source: src/vs/workbench/api/common/extHostWindow.ts
 * (showTextDocument, showInformationMessage, showWarningMessage, showErrorMessage)
 */

import type * as VSCode from "vscode";

import { FromAPI as ViewColumnFromAPI } from "../../../TypeConverter/Main/View/Column.js";

import type { Workspace } from "../Interfaces.js";

/**
 * Show a text document in the editor.
 *
 * Extracts the URI, converts ViewColumn/options via TypeConverter, and
 * delegates the actual display to Mountain's showTextDocument gRPC call.
 *
 * @param GRPCClient - Mountain gRPC client with showTextDocument support
 * @param Logger - Logger for info/debug output
 * @param Workspace_ - Workspace to look up the opened editor
 * @param DocumentOrUri - URI or TextDocument to display
 * @param ColumnOrOptions - Optional ViewColumn or TextDocumentShowOptions
 * @param PreserveFocus - Whether to keep focus in the current editor
 */
export const ShowTextDocument = (
	GRPCClient: {
		showTextDocument: (
			Uri: string,

			Options: {
				viewColumn: number | undefined;

				preserveFocus: boolean;

				preview: boolean;

				selection: { line: number; character: number } | undefined;
			},
		) => Promise<void>;
	},

	Logger: {
		Info: (Message: string, ...Data: unknown[]) => Promise<void>;

		Debug: (Message: string, ...Data: unknown[]) => Promise<void>;
	},

	Workspace_: Workspace,

	DocumentOrUri: VSCode.Uri | VSCode.TextDocument,

	ColumnOrOptions?: VSCode.ViewColumn | VSCode.TextDocumentShowOptions,

	PreserveFocus?: boolean,
): Promise<VSCode.TextEditor> =>
	async function() {

		// Extract URI from either Uri or TextDocument
		const Uri = "uri" in DocumentOrUri ? DocumentOrUri.uri : DocumentOrUri;

		await Logger.Info(
			`[WindowService] Showing text document: ${Uri.toString()}` +
				(ColumnOrOptions ? ` with options` : ""),
		;

		let ViewColumnDTO: number | undefined;

		let PreserveFocusValue = PreserveFocus ?? false;

		let Selection: any = undefined;

		let Preview: boolean | undefined;

		if (typeof ColumnOrOptions === "number") {
			ViewColumnDTO = ViewColumnFromAPI(ColumnOrOptions;
		} else if (ColumnOrOptions) {
			const Options = ColumnOrOptions;

			ViewColumnDTO = ViewColumnFromAPI(Options.viewColumn;

			PreserveFocusValue = Options.preserveFocus ?? false;

			Preview = Options.preview;

			if (Options.selection) {
				Selection = Options.selection;
			}
		}

		// Delegate to Mountain's native showTextDocument via gRPC
		await GRPCClient.showTextDocument(Uri.toString(), {
			viewColumn: ViewColumnDTO ? ViewColumnDTO + 2 : undefined,
			preserveFocus: PreserveFocusValue === true,
			preview: Preview === true,
			selection: Selection
				? {
						line: Selection.start.line,
						character: Selection.start.character,
					}

				: undefined,
		};

		const EditorId = "editor-" + Uri.toString().slice(-8;

		await Logger.Debug(
			`[WindowService] Showed text document with ID: ${EditorId}`,
		;

		const Editor = Workspace_.visibleTextEditors.find(
			(E) => (E as any).id === EditorId,
		;

		if (!Editor) {
			throw new Error(
					`[WindowService] Could not find text editor with ID ${EditorId} after Mountain confirmation`,
				),
			;
		}

		return Editor;
	};

/**
 * Show an information message dialog.
 *
 * Delegates to Mountain's showInformation gRPC request.
 * Returns the selected item text or undefined if dismissed.
 *
 * @param GRPCClient - Mountain gRPC client with sendRequest support
 * @param Logger - Logger for debug output
 * @param Message - Message text
 * @param Items - Optional action button labels
 */
export const ShowInformationMessage = (
	GRPCClient: {
		sendRequest: (method: string, params: unknown) => Promise<unknown>;
	},

	Logger: { Debug: (Message: string) => Promise<void> },

	Message: string,
	...Items: string[]
): Promise<string | undefined> =>
	async function() {
		await Logger.Debug(
			`[WindowService] Showing information message: ${Message}`,
		;

		let InfoResponse;
try {
	InfoResponse = await GRPCClient.sendRequest("Window.ShowMessage", [
					{
						message: Message,
						level: "info",
						items: Items.map((I) => ({ title: I;
} catch (_e) {
	// error handled below
}),

						options: {},
					},
				]),

			catch: () => null,
		};

		// Mountain returns the selected action title string or null.
		const InfoSelected =
			typeof InfoResponse === "string"
				? InfoResponse
				: ((InfoResponse as any)?.title ?? null;

		return InfoSelected
			? (Items.find((I) => I === InfoSelected) ?? InfoSelected)
			: undefined;
	};

/**
 * Show a warning message dialog.
 *
 * Delegates to Mountain's showWarning gRPC request.
 * Returns the selected item text or undefined if dismissed.
 *
 * @param GRPCClient - Mountain gRPC client with sendRequest support
 * @param Logger - Logger for debug output
 * @param Message - Message text
 * @param Items - Optional action button labels
 */
export const ShowWarningMessage = (
	GRPCClient: {
		sendRequest: (method: string, params: unknown) => Promise<unknown>;
	},

	Logger: { Debug: (Message: string) => Promise<void> },

	Message: string,
	...Items: string[]
): Promise<string | undefined> =>
	async function() {
		await Logger.Debug(
			`[WindowService] Showing warning message: ${Message}`,
		;

		let WarnResponse;
try {
	WarnResponse = await GRPCClient.sendRequest("Window.ShowMessage", [
					{
						message: Message,
						level: "warn",
						items: Items.map((I) => ({ title: I;
} catch (_e) {
	// error handled below
}),

						options: {},
					},
				]),

			catch: () => null,
		};

		const WarnSelected =
			typeof WarnResponse === "string"
				? WarnResponse
				: ((WarnResponse as any)?.title ?? null;

		return WarnSelected
			? (Items.find((I) => I === WarnSelected) ?? WarnSelected)
			: undefined;
	};

/**
 * Show an error message dialog.
 *
 * Delegates to Mountain's showError gRPC request.
 * Returns the selected item text or undefined if dismissed.
 *
 * @param GRPCClient - Mountain gRPC client with sendRequest support
 * @param Logger - Logger for debug output
 * @param Message - Message text
 * @param Items - Optional action button labels
 */
export const ShowErrorMessage = (
	GRPCClient: {
		sendRequest: (method: string, params: unknown) => Promise<unknown>;
	},

	Logger: { Debug: (Message: string) => Promise<void> },

	Message: string,
	...Items: string[]
): Promise<string | undefined> =>
	async function() {
		await Logger.Debug(
			`[WindowService] Showing error message: ${Message}`,
		;

		let ErrorResponse;
try {
	ErrorResponse = await GRPCClient.sendRequest("Window.ShowMessage", [
					{
						message: Message,
						level: "error",
						items: Items.map((I) => ({ title: I;
} catch (_e) {
	// error handled below
}),

						options: {},
					},
				]),

			catch: () => null,
		};

		const ErrorSelected =
			typeof ErrorResponse === "string"
				? ErrorResponse
				: ((ErrorResponse as any)?.title ?? null;

		return ErrorSelected
			? (Items.find(
					(I) =>
						(typeof I === "string" ? I : (I as any).title) ===
						ErrorSelected,
				) ?? undefined)
			: undefined;
	};
