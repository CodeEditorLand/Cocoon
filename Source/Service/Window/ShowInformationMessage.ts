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
const ShowInformationMessage = <T extends VSCode.MessageItem>(
	Message: string,
	...ItemsOrOptions: Array<T | VSCode.MessageOptions>
): Effect.Effect<T | undefined, Error, MessageService> =>
	Effect.flatMap(MessageService, (Service) =>
		Service.ShowInformationMessage(Message, ...ItemsOrOptions),
	);

export default ShowInformationMessage;
