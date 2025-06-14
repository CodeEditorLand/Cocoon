/**
 * @module ShowInformationMessage
 * @description An Effect-based wrapper for the `vscode.window.showInformationMessage` API.
 * This is an internal helper that uses the central Message service.
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

import MessageService from "../Message/Service.js";

/**
 * An Effect that displays an informational message to the user.
 * It delegates to the central `Message.Service`.
 */
function ShowInformationMessage<T extends VSCode.MessageItem>(
	message: string,
	...items: T[]
): Effect.Effect<T | undefined, Error, typeof MessageService>;
function ShowInformationMessage(
	message: string,
	options: VSCode.MessageOptions,
	...items: VSCode.MessageItem[]
): Effect.Effect<VSCode.MessageItem | undefined, Error, typeof MessageService>;
function ShowInformationMessage(
	message: string,
	...itemsOrOptions: any[]
): Effect.Effect<VSCode.MessageItem | undefined, Error, typeof MessageService> {
	return Effect.flatMap(MessageService, (service) =>
		service.ShowInformationMessage(message, ...itemsOrOptions),
	);
}

export default ShowInformationMessage;
