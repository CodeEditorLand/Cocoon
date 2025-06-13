/**
 * @module Service (QuickInput)
 * @description Defines the interface and Context.Tag for the QuickInput service.
 */

import { Context, Effect } from "effect";
import type {
	CancellationToken,
	InputBox,
	InputBoxOption,
	QuickInputButton,
	QuickPick,
	QuickPickItem,
} from "vscode";

export interface Interface {
	readonly ShowQuickPick: <T extends QuickPickItem | string>(
		Items: ReadonlyArray<T> | Promise<ReadonlyArray<T>>,
		Option?: any,
		Token?: CancellationToken,
	) => Effect.Effect<T | T[] | undefined, Error>;

	readonly ShowInputBox: (
		Option?: InputBoxOption,
		Token?: CancellationToken,
	) => Effect.Effect<string | undefined, Error>;

	readonly CreateQuickPick: <T extends QuickPickItem>() => QuickPick<T>;
	readonly CreateInputBox: () => InputBox;
}

export const Tag = Context.Tag<Interface>("Service/QuickInput");
