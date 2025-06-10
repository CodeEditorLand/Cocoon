/**
 * @module Service (Message)
 * @description Defines the interface and Context.Tag for the Message service.
 */

import { Context, Effect } from "effect";
import type { MessageItem } from "vscode";

export interface Interface {
	readonly ShowInformationMessage: (
		message: string,
		...args: any[]
	) => Effect.Effect<MessageItem | string | undefined, Error>;

	readonly ShowWarningMessage: (
		message: string,
		...args: any[]
	) => Effect.Effect<MessageItem | string | undefined, Error>;

	readonly ShowErrorMessage: (
		message: string,
		...args: any[]
	) => Effect.Effect<MessageItem | string | undefined, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Message");
