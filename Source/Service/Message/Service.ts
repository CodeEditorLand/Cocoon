/*
 * File: Cocoon/Source/Service/Message/Service.ts
 * Role: Defines the service interface and Effect.Service for the Message service.
 * Responsibilities:
 *   - Declare the contract for the service that proxies requests to show
 *     notifications (`showInformationMessage`, etc.) to the `Mountain` host.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

/**
 * The `Effect.Service` for the Message service.
 * This service is responsible for displaying information, warning, and error
 * messages to the user through the host's native notification system.
 */
export class Message extends Effect.Service<Message>("Service/Message")<{
	/**
	 * Shows an information message to the user.
	 * @param TheMessage - The message to show.
	 * @param Arguments - A set of items or options for the message.
	 * @returns An `Effect` that resolves with the selected item or `undefined`.
	 */
	readonly ShowInformationMessage: <T extends MessageItem>(
		TheMessage: string,
		...Arguments: (T | MessageOptions)[]
	) => Effect.Effect<T | undefined, Error>;

	/**
	 * Shows a warning message to the user.
	 */
	readonly ShowWarningMessage: <T extends MessageItem>(
		TheMessage: string,
		...Arguments: (T | MessageOptions)[]
	) => Effect.Effect<T | undefined, Error>;

	/**
	 * Shows an error message to the user.
	 */
	readonly ShowErrorMessage: <T extends MessageItem>(
		TheMessage: string,
		...Arguments: (T | MessageOptions)[]
	) => Effect.Effect<T | undefined, Error>;
}>() {}
