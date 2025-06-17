/*
 * File: Cocoon/Source/Service/Dialog/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:27 UTC
 * Dependency: ./Error/DialogError.js, ./Type.js, effect, vscode
 * Export: DialogService
 */

/**
 * @module Service (Dialog)
 * @description Defines the interface and Context.Tag for the Dialog service,
 * which provides `vscode.window` dialog functions like `showOpenDialog`.
 */

import { Context, type Effect } from "effect";
import type { CancellationToken, Uri } from "vscode";

import type DialogError from "./Error/DialogError.js";
import type { OpenDialogOptions, SaveDialogOptions } from "./Type.js";

export default class DialogService extends Context.Tag("Service/Dialog")<
	DialogService,
	{
		/**
		 * Shows an open file dialog to the user.
		 * @param Options Options for the open dialog.
		 * @param Token An optional cancellation token.
		 * @returns An `Effect` that resolves with an array of selected URIs, or `undefined` if cancelled.
		 */
		readonly ShowOpenDialog: (
			Options?: OpenDialogOptions,
			Token?: CancellationToken,
		) => Effect.Effect<Uri[] | undefined, DialogError>;

		/**
		 * Shows a save file dialog to the user.
		 * @param Options Options for the save dialog.
		 * @param Token An optional cancellation token.
		 * @returns An `Effect` that resolves with the selected URI, or `undefined` if cancelled.
		 */
		readonly ShowSaveDialog: (
			Options?: SaveDialogOptions,
			Token?: CancellationToken,
		) => Effect.Effect<Uri | undefined, DialogError>;
	}
>() {}
