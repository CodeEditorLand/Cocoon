/**
 * @module ShowInformationMessage
 * @description An Effect-based wrapper for the `vscode.window.showInformationMessage` API.
 */

import { Effect } from "effect";
import * as VSCode from "vscode";

/**
 * An Effect that displays an informational message to the user.
 *
 * This function is an Effect-ful, overloaded wrapper around `vscode.window.showInformationMessage`.
 * It handles both simple string messages and messages with action items (buttons).
 *
 * @param Message - The informational message to display.
 * @param ItemsOrOption - Either an array of `MessageItem` objects (buttons) or `MessageOption`.
 * @param Items - An array of `MessageItem` objects if the second argument was `MessageOption`.
 *
 * @returns An `Effect` that resolves with the selected `MessageItem` or `undefined` if
 *   the message was dismissed. It will fail if the underlying VS Code API call throws an error.
 */
export function ShowInformationMessage<T extends VSCode.MessageItem>(
	Message: string,
	...Items: T[]
): Effect.Effect<T | undefined>;
export function ShowInformationMessage(
	Message: string,
	Option: VSCode.MessageOption,
	...Items: VSCode.MessageItem[]
): Effect.Effect<VSCode.MessageItem | undefined>;
export function ShowInformationMessage(
	Message: string,
	...ItemsOrOption: any[]
): Effect.Effect<VSCode.MessageItem | undefined> {
	return Effect.tryPromise({
		try: () =>
			VSCode.window.showInformationMessage(Message, ...ItemsOrOption),
		catch: (error) =>
			new Error(`Failed to show information message: ${error}`),
	});
}
