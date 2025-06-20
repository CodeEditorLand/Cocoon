

/**
 * @module QuickInput (TypeConverter)
 * @description Type converters for the QuickInput APIs (`showQuickPick`, `showInputBox`).
 */

import { Uri, type QuickInputButton, type QuickPickItem } from "vscode";

export default {
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
		return Buttons?.map((Button, Index) => {
			// VS Code's internal quick input buttons have an iconPath property
			// which can be a dark/light theme URI object. We need to handle this.
			const iconPath = (Button as any).iconPath;
			return {
				// FIX: `Uri.revive` does not exist on the public API.
				// The DTO should be built from the raw URI data.
				// Assuming the `iconPath` in the DTO is a string or has `dark`/`light` string properties.
				iconPath: iconPath
					? "dark" in iconPath && "light" in iconPath
						? {
								dark: Uri.parse(iconPath.dark).toJSON(),
								light: Uri.parse(iconPath.light).toJSON(),
							}
						: Uri.parse(iconPath.toString()).toJSON()
					: undefined,
				tooltip: Button.tooltip,
				handle: Index,
			};
		});
	},
};
