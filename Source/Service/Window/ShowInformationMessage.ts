/**
 * @module ShowInformationMessage
 * @description An Effect-based wrapper for the `vscode.window.showInformationMessage` API.
 */

import { Effect } from "effect";
import * as Vscode from "vscode";

/**
 * An Effect that displays an informational message to the user.
 *
 * This function is an Effect-ful, overloaded wrapper around `vscode.window.showInformationMessage`.
 * It handles both simple string messages and messages with action items (buttons).
 *
 * @param Message - The informational message to display.
 * @param ItemsOrOptions - Either an array of `MessageItem` objects (buttons) or `MessageOptions`.
 * @param Items - An array of `MessageItem` objects if the second argument was `MessageOptions`.
 *
 * @returns An `Effect` that resolves with the selected `MessageItem` or `undefined` if
 *   the message was dismissed. It will fail if the underlying VS Code API call throws an error.
 */
export function ShowInformationMessage<T extends Vscode.MessageItem>(
	Message: string,
	...Items: T[]
): Effect.Effect<T | undefined>;
export function ShowInformationMessage(
	Message: string,
	Options: Vscode.MessageOptions,
	...Items: Vscode.MessageItem[]
): Effect.Effect<Vscode.MessageItem | undefined>;
export function ShowInformationMessage(
	Message: string,
	...ItemsOrOptions: any[]
): Effect.Effect<Vscode.MessageItem | undefined> {
	return Effect.tryPromise({
		try: () =>
			Vscode.window.showInformationMessage(Message, ...ItemsOrOptions),
		catch: (error) =>
			new Error(`Failed to show information message: ${error}`),
	});
}
