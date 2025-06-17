/*
 * File: Cocoon/Source/Service/Window/ShowInformationMessage.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ../Message/Service.js, effect, vscode
 */

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
	...ItemsOrOptions: (T | VSCode.MessageOptions)[]
): Effect.Effect<T | undefined, Error, MessageService> =>
	Effect.flatMap(MessageService, (Service) =>
		Service.ShowInformationMessage<T>(Message, ...ItemsOrOptions),
	);

export default ShowInformationMessage;
