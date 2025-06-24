/*
 * File: Cocoon/Source/Service/Dialog/Service.ts
 * Role: Defines the service interface and Effect.Service for the Dialog service.
 * Responsibilities:
 *   - Declare the contract for the service that provides `vscode.window` dialog
 *     functions like `showOpenDialog` and `showSaveDialog`.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { CancellationToken, Uri } from "vscode";
import type { DialogProblem } from "./Error.js";
import type { OpenDialogOptions, SaveDialogOptions } from "./Type.js";

/**
 * The `Effect.Service` for the Dialog service.
 * This service is responsible for creating and managing native file dialogs.
 */
export class Dialog extends Effect.Service<Dialog>("Service/Dialog")<{
	/**
	 * Shows an open file dialog to the user.
	 * @param Options - Options to configure the open dialog.
	 * @param Token - An optional `CancellationToken`.
	 * @returns An `Effect` that resolves with an array of selected `Uri`s, or `undefined` if cancelled.
	 */
	readonly ShowOpenDialog: (
		Options?: OpenDialogOptions,
		Token?: CancellationToken,
	) => Effect.Effect<Uri[] | undefined, DialogProblem>;

	/**
	 * Shows a save file dialog to the user.
	 * @param Options - Options to configure the save dialog.
	 * @param Token - An optional `CancellationToken`.
	 * @returns An `Effect` that resolves with the selected `Uri`, or `undefined` if cancelled.
	 */
	readonly ShowSaveDialog: (
		Options?: SaveDialogOptions,
		Token?: CancellationToken,
	) => Effect.Effect<Uri | undefined, DialogProblem>;
}>() {}
