/**
 * @module QuickInput
 * @description Type converters for the QuickInput APIs (`showQuickPick`, `showInputBox`).
 */

import type { QuickInputButton, QuickPickItem, Uri } from "vscode";

/**
 * @description Serializes `QuickPickItem` or string arrays for IPC transport.
 * @param Items The array of items to serialize.
 * @returns A serializable representation of the items.
 */
export const SerializeItems = <T extends QuickPickItem | string>(
	Items: readonly T[],
) => {
	return Items.map((Item, Index) => {
		const Base =
			typeof Item === "string"
				? { label: Item }
				: (Item as QuickPickItem);

		return { ...Base, handle: Index };
	});
};

/**
 * @description Serializes `QuickInputButton` arrays for IPC transport.
 * @param Buttons The array of buttons to serialize.
 * @returns A serializable representation of the buttons.
 */
export const SerializeButtons = (Buttons?: readonly QuickInputButton[]) => {
	return Buttons?.map((Button, Index) => {
		const iconPath = (Button as any).iconPath;

		return {
			iconPath: iconPath
				? "dark" in iconPath && "light" in iconPath
					? {
							dark: (iconPath.dark as Uri).toJSON(),
							light: (iconPath.light as Uri).toJSON(),
						}
					: (iconPath as Uri).toJSON()
				: undefined,
			tooltip: Button.tooltip,
			handle: Index,
		};
	});
};
