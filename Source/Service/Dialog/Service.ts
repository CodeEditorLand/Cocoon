/**
 * @module Service (Dialog)
 * @description Defines the interface and Context.Tag for the Dialog service.
 */

import { Context, Effect } from "effect";
import type { CancellationToken, Uri } from "vscode";

import type { OpenDialogOption, SaveDialogOption } from "./Type.js";

export interface Interface {
	readonly ShowOpenDialog: (
		Option?: OpenDialogOption,
		Token?: CancellationToken,
	) => Effect.Effect<Uri[] | undefined, Error>;

	readonly ShowSaveDialog: (
		Option?: SaveDialogOption,
		Token?: CancellationToken,
	) => Effect.Effect<Uri | undefined, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Dialog");
