/**
 * @module Service (Dialog)
 * @description Defines the interface and Context.Tag for the Dialog service,
 * which provides `vscode.window` dialog functions like `showOpenDialog`.
 */

import { Context, type Effect } from "effect";
import type { CancellationToken, Uri } from "vscode";

import type DialogError from "./Error/DialogError.js";
import type { OpenDialogOptions, SaveDialogOptions } from "./Type.js";

export default class extends Context.Tag("Service/Dialog")<
	any,
	{
		/**
		 * Shows an open file dialog to the user.
		 * @param Option Options for the open dialog.
		 * @param Token An optional cancellation token.
		 * @returns An `Effect` that resolves with an array of selected URIs, or `undefined` if cancelled.
		 */
		readonly ShowOpenDialog: (
			Option?: OpenDialogOptions,
			Token?: CancellationToken,
		) => Effect.Effect<Uri[] | undefined, DialogError>;

		/**
		 * Shows a save file dialog to the user.
		 * @param Option Options for the save dialog.
		 * @param Token An optional cancellation token.
		 * @returns An `Effect` that resolves with the selected URI, or `undefined` if cancelled.
		 */
		readonly ShowSaveDialog: (
			Option?: SaveDialogOptions,
			Token?: CancellationToken,
		) => Effect.Effect<Uri | undefined, DialogError>;
	}
>() {}
