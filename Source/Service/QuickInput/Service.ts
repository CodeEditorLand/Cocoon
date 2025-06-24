/*
 * File: Cocoon/Source/Service/QuickInput/Service.ts
 * Role: Defines the service interface and Effect.Service for the QuickInput service.
 * Responsibilities:
 *   - Declare the contract for the service that implements the `vscode.window.showQuickPick`
 *     and `showInputBox` APIs.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type {
	CancellationToken,
	InputBox,
	InputBoxOptions,
	QuickPick,
	QuickPickItem,
	QuickPickOptions,
} from "vscode";

/**
 * The `Effect.Service` for the QuickInput service.
 * This service provides methods for showing quick pick selection lists and
 * free-text input boxes to the user.
 */
export class QuickInput extends Effect.Service<QuickInput>(
	"Service/QuickInput",
)<{
	/**
	 * Shows a selection list to the user.
	 * @param Items - An array of items to show in the pick list.
	 * @param Option - Configuration options for the pick list.
	 * @param Token - A token that can be used to cancel the operation.
	 */
	readonly ShowQuickPick: <T extends QuickPickItem>(
		Items: readonly T[] | Promise<readonly T[]>,
		Option?: QuickPickOptions,
		Token?: CancellationToken,
	) => Effect.Effect<T | T[] | undefined, Error>;

	/**
	 * Opens an input box to ask the user for input.
	 * @param Option - Configuration options for the input box.
	 * @param Token - A token that can be used to cancel the operation.
	 */
	readonly ShowInputBox: (
		Option?: InputBoxOptions,
		Token?: CancellationToken,
	) => Effect.Effect<string | undefined, Error>;

	/**
	 * Creates a new quick pick controller.
	 * @note This is for the more complex, stateful QuickInput API and is stubbed.
	 */
	readonly CreateQuickPick: <T extends QuickPickItem>() => QuickPick<T>;

	/**
	 * Creates a new input box controller.
	 * @note This is for the more complex, stateful QuickInput API and is stubbed.
	 */
	readonly CreateInputBox: () => InputBox;
}>() {}
