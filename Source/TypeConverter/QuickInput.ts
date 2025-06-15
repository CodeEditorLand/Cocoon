/**
 * @module QuickInput (TypeConverter)
 * @description Type converters for the QuickInput APIs (`showQuickPick`, `showInputBox`).
 */

import { URI, type QuickInputButton, type QuickPickItem } from "vscode";

const QuickPick = {
	/**
	 * Serializes `QuickPickItem` or string arrays for IPC transport.
	 * It attaches a temporary index to map results back to the original objects.
	 * @param Items The array of items to serialize.
	 * @returns A serializable representation of the items.
	 */
	SerializeItems: <T extends QuickPickItem | string>(Items: readonly T[]) => {
		return Items.map((Item, Index) => {
			const Base =
				typeof Item === "string"
					? { label: Item }
					: (Item as QuickPickItem);
			// Attach our own index to map the result back later.
			return { ...Base, handle: Index };
		});
	},

	/**
	 * Serializes `QuickInputButton` arrays for IPC transport.
	 * @param Buttons The array of buttons to serialize.
	 * @returns A serializable representation of the buttons.
	 */
	SerializeButtons: (Buttons?: readonly QuickInputButton[]) => {
		return Buttons?.map((Button, Index) => ({
			iconPath: (Button as any).iconPath
				? "dark" in (Button as any).iconPath &&
					"light" in (Button as any).iconPath
					? {
							dark: URI.revive(
								(Button as any).iconPath.dark,
							).toJSON(),
							light: URI.revive(
								(Button as any).iconPath.light,
							).toJSON(),
						}
					: undefined
				: undefined,
			tooltip: Button.tooltip,
			handle: Index,
		}));
	},
};

export default { QuickPick };
