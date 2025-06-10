/**
 * @module QuickInput (TypeConverter)
 * @description Type converters for the QuickInput APIs.
 */

import type { QuickInputButton, QuickPickItem } from "vscode";

import { Uri } from "../Type/ExtHostTypes.js";

export namespace QuickPick {
	export const SerializeItems = <T extends QuickPickItem | string>(
		Items: readonly T[],
	) =>
		Items.map((Item, Index) => {
			const Base =
				typeof Item === "string"
					? { label: Item }
					: (Item as QuickPickItem);
			// Attach our own index to map the result back later.
			return { ...Base, data: { _cocoonOriginalIndex: Index } };
		});

	export const SerializeButtons = (Buttons?: readonly QuickInputButton[]) =>
		Buttons?.map((Button, Index) => ({
			iconPath: (Button as any).iconPath
				? Uri.revive((Button as any).iconPath).toJSON()
				: undefined,
			tooltip: Button.tooltip,
			handle: Index,
		}));
}
