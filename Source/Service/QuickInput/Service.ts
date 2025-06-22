/**
 * @module Service (QuickInput)
 * @description Defines the interface and Context.Tag for the QuickInput service.
 * This service implements the `vscode.window.showQuickPick` and `showInputBox` APIs.
 */

import { Context, type Effect } from "effect";
import type {
	CancellationToken,
	InputBox,
	InputBoxOptions,
	QuickPick,
	QuickPickItem,
	QuickPickOptions,
} from "vscode";

export default class QuickInputService extends Context.Tag(
	"Service/QuickInput",
)<
	QuickInputService,
	{
		/**
		 * Shows a selection list.
		 * @param Items An array of items to show in the pick list.
		 * @param Option Configures the behavior of the pick list.
		 * @param Token A token that can be used to cancel the pick list.
		 */
		readonly ShowQuickPick: <T extends QuickPickItem>(
			Items: readonly T[] | Promise<readonly T[]>,

			Option?: QuickPickOptions,

			Token?: CancellationToken,
		) => Effect.Effect<T | T[] | undefined, Error>;

		/**
		 * Opens an input box to ask the user for input.
		 * @param Option Configures the behavior of the input box.
		 * @param Token A token that can be used to cancel the input box.
		 */
		readonly ShowInputBox: (
			Option?: InputBoxOptions,

			Token?: CancellationToken,
		) => Effect.Effect<string | undefined, Error>;

		/**
		 * Creates a new quick pick.
		 * Note: This is for the controller-based QuickInput and is more complex.
		 */
		readonly CreateQuickPick: <T extends QuickPickItem>() => QuickPick<T>;

		/**
		 * Creates a new input box.
		 * Note: This is for the controller-based QuickInput and is more complex.
		 */
		readonly CreateInputBox: () => InputBox;
	}
>() {}
