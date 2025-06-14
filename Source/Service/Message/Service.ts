/**
 * @module Service (Message)
 * @description Defines the interface and Context.Tag for the Message service.
 * This service proxies requests to show notifications to the Mountain host.
 */

import { Context, type Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

export interface Interface {
	/**
	 * Shows an information message to the user.
	 * @param message The message to show.
	 * @param args A set of items or options for the message.
	 * @returns An `Effect` that resolves with the selected item or `undefined`.
	 */
	readonly ShowInformationMessage: (
		message: string,
		...args: any[]
	) => Effect.Effect<MessageItem | string | undefined, Error>;

	/**
	 * Shows a warning message to the user.
	 * @param message The message to show.
	 * @param args A set of items or options for the message.
	 * @returns An `Effect` that resolves with the selected item or `undefined`.
	 */
	readonly ShowWarningMessage: (
		message: string,
		...args: any[]
	) => Effect.Effect<MessageItem | string | undefined, Error>;

	/**
	 * Shows an error message to the user.
	 * @param message The message to show.
	 * @param args A set of items or options for the message.
	 * @returns An `Effect` that resolves with the selected item or `undefined`.
	 */
	readonly ShowErrorMessage: (
		message: string,
		...args: any[]
	) => Effect.Effect<MessageItem | string | undefined, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Message");
