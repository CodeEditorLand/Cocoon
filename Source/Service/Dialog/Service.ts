/**
 * @module Service (Dialog)
 * @description Defines the interface and Context.Tag for the Dialog service.
 */

import { Context, Effect } from "effect";
import type { CancellationToken, Uri } from "vscode";

import type { OpenDialogOptions, SaveDialogOptions } from "./Type.js";

export interface Interface {
	readonly ShowOpenDialog: (
		Options?: OpenDialogOptions,
		Token?: CancellationToken,
	) => Effect.Effect<Uri[] | undefined, Error>;

	readonly ShowSaveDialog: (
		Options?: SaveDialogOptions,
		Token?: CancellationToken,
	) => Effect.Effect<Uri | undefined, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Dialog");
