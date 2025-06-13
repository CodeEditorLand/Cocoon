/**
 * @module Service (Dialog)
 * @description Defines the interface and Context.Tag for the Dialog service,
 * which provides `vscode.window` dialog functions like `showOpenDialog`.
 */

import { Context, Effect } from "effect";
import type { CancellationToken, Uri } from "vscode";

import type { DialogError } from "./Error.js";
import type { OpenDialogOption, SaveDialogOption } from "./Type.js";

export interface Interface {
	/**
	 * Shows an open file dialog to the user.
	 * @param Option Options for the open dialog.
	 * @param Token An optional cancellation token.
	 * @returns An `Effect` that resolves with an array of selected URIs, or `undefined` if cancelled.
	 */
	readonly ShowOpenDialog: (
		Option?: OpenDialogOption,
		Token?: CancellationToken,
	) => Effect.Effect<Uri[] | undefined, DialogError>;

	/**
	 * Shows a save file dialog to the user.
	 * @param Option Options for the save dialog.
	 * @param Token An optional cancellation token.
	 * @returns An `Effect` that resolves with the selected URI, or `undefined` if cancelled.
	 */
	readonly ShowSaveDialog: (
		Option?: SaveDialogOption,
		Token?: CancellationToken,
	) => Effect.Effect<Uri | undefined, DialogError>;
}

export const Tag = Context.Tag<Interface>("Service/Dialog");
