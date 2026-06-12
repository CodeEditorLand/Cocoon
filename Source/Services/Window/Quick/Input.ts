/**
 * @module Services/Window/QuickInput
 * @description
 * Quick pick and input box implementations for the Window service.
 * Delegates to Mountain's native UI implementation via gRPC.
 *
 * Source: src/vs/workbench/api/common/extHostWindow.ts (showQuickPick, showInputBox)
 */

import type * as VSCode from "vscode";

import {
	SerializeButtons,
	SerializeItems,
} from "../../../TypeConverter/Quick/Input.js";

/**
 * Show a quick pick selection dialog.
 *
 * Serializes items via TypeConverter/QuickInput and delegates to Mountain's
 * native quick pick UI via gRPC. Returns the selected item or undefined if
 * the user cancelled.
 *
 * @param MountainClient - gRPC client for Mountain communication
 * @param Logger - Logger for debug output
 * @param Items - String array or QuickPickItem array to display
 * @param Options - Optional quick pick configuration
 */
export const ShowQuickPick = <T extends string>(
	MountainClient: {
		sendRequest: (method: string, params: unknown[]) => Promise<unknown>;
	},

	Logger: { Debug: (Message: string) => Promise<void> },

	Items: readonly T[] | VSCode.QuickPickItem[],

	Options?: VSCode.QuickPickOptions,
): Promise<T | VSCode.QuickPickItem | undefined> =>
	async function() {

		await Logger.Debug(
			`[WindowService] Showing quick pick with ${Items.length} items`,
		;

		// Serialize items using TypeConverter
		const ItemsDTO = SerializeItems(Items;

		const ButtonsDTO = Options?.buttons
			? SerializeButtons(Options.buttons)
			: undefined;

		// Construct request payload
		const RequestPayload = {
			items: ItemsDTO,
			options: Options
				? {
						placeHolder: Options.placeHolder,
						matchOnDescription: Options.matchOnDescription,
						matchOnDetail: Options.matchOnDetail,
						ignoreFocusLost: Options.ignoreFocusLost,
						canPickMany: Options.canPickMany,
					}

				: undefined,
			buttons: ButtonsDTO,
		};

		// Delegates to Mountain's native quick pick implementation via gRPC
		let SelectedItems: string[] | undefined;
		try {
			const Response = await MountainClient.sendRequest(
				"UserInterface.ShowQuickPick",

				[RequestPayload.items, RequestPayload.options],
			);

			if (Response === null || Response === undefined) {
				SelectedItems = undefined;
			} else {
				SelectedItems = Response as string[];
			}
		} catch (Error_) {
			throw new Error(
				`Failed to show quick pick: ${(Error_ as Error).message}`,
			);
		}

		// Return the first selected item (single selection mode)
		if (!SelectedItems || SelectedItems.length === 0) {
			return undefined;
		}

		const SelectedValue = SelectedItems[0];

		// If items are strings, return the selected string
		if (typeof Items[0] === "string") {
			return SelectedValue as T;
		}

		// If items are QuickPickItem[], find the matching item by label
		return (Items as VSCode.QuickPickItem[]).find(
			(Item) => Item.label === SelectedValue,
		;
	};

/**
 * Show an input box for free-form text entry.
 *
 * Delegates to Mountain's native input box implementation via gRPC.
 * Returns the user input string or undefined if cancelled.
 *
 * @param MountainClient - gRPC client for Mountain communication
 * @param Logger - Logger for debug output
 * @param Options - Optional input box configuration
 */
export const ShowInputBox = (
	MountainClient: {
		sendRequest: (method: string, params: unknown[]) => Promise<unknown>;
	},

	Logger: {
		Debug: (Message: string, ...Data: unknown[]) => Promise<void>;
	},

	Options?: VSCode.InputBoxOptions,
): Promise<string | undefined> =>
	async function() {
		await Logger.Debug(
			`[WindowService] Showing input box${Options ? ` with placeholder: ${Options.placeholder}` : ""}`,
		;

		// Construct request payload - options serialized directly
		const RequestPayload = Options
			? {
					title: Options.title,
					value: Options.value,
					valueSelection: Options.valueSelection,
					prompt: Options.prompt,
					placeHolder: Options.placeHolder,
					password: Options.password,
					ignoreFocusLost: Options.ignoreFocusLost,
					validateInput: Options.validateInput
						? Options.validateInput.toString()

						: undefined,
				}
			: undefined;

		// Delegates to Mountain's native input box implementation via gRPC
		let Result: string | undefined;
		try {
			const Response = await MountainClient.sendRequest(
				"UserInterface.ShowInputBox",

				[RequestPayload],
			);

			if (Response === null || Response === undefined) {
				Result = undefined;
			} else {
				Result = Response as string;
			}
		} catch (Error_) {
			throw new Error(
				`Failed to show input box: ${(Error_ as Error).message}`,
			);
		}

		return Result;
	};
