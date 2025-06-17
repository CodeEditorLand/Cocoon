/*
 * File: Cocoon/Source/Service/Message/Service.ts
 * Responsibility: Defines the Message service interface for Cocoon's sidecar, proxying notification requests to the Mountain backend via the Vine IPC layer to enable VS Code extension compatibility within the Land editor.
 * Modified: 2025-06-17 10:32:26 UTC
 * Dependency: effect, vscode
 * Export: MessageService
 */

/**
 * @module Service (Message)
 * @description Defines the interface and Context.Tag for the Message service.
 * This service proxies requests to show notifications to the Mountain host.
 */

import { Context, type Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

export default class MessageService extends Context.Tag("Service/Message")<
	MessageService,
	{
		/**
		 * Shows an information message to the user.
		 * @param message The message to show.
		 * @param args A set of items or options for the message.
		 * @returns An `Effect` that resolves with the selected item or `undefined`.
		 */
		readonly ShowInformationMessage: <T extends MessageItem>(
			message: string,
			...args: (T | MessageOptions)[]
		) => Effect.Effect<T | undefined, Error>;

		/**
		 * Shows a warning message to the user.
		 * @param message The message to show.
		 * @param args A set of items or options for the message.
		 * @returns An `Effect` that resolves with the selected item or `undefined`.
		 */
		readonly ShowWarningMessage: <T extends MessageItem>(
			message: string,
			...args: (T | MessageOptions)[]
		) => Effect.Effect<T | undefined, Error>;

		/**
		 * Shows an error message to the user.
		 * @param message The message to show.
		 * @param args A set of items or options for the message.
		 * @returns An `Effect` that resolves with the selected item or `undefined`.
		 */
		readonly ShowErrorMessage: <T extends MessageItem>(
			message: string,
			...args: (T | MessageOptions)[]
		) => Effect.Effect<T | undefined, Error>;
	}
>() {}
