/**
 * @module QuickInput
 * @description Type converters for the QuickInput APIs (`showQuickPick`, `showInputBox`).
 */
import type { QuickInputButton, QuickPickItem } from "vscode";
/**
 * @description Serializes `QuickPickItem` or string arrays for IPC transport.
 * @param Items The array of items to serialize.
 * @returns A serializable representation of the items.
 */
export declare const SerializeItems: <T extends QuickPickItem | string>(Items: readonly T[]) => any[];
/**
 * @description Serializes `QuickInputButton` arrays for IPC transport.
 * @param Buttons The array of buttons to serialize.
 * @returns A serializable representation of the buttons.
 */
export declare const SerializeButtons: (Buttons?: readonly QuickInputButton[]) => {
    iconPath: any;
    tooltip: any;
    handle: number;
}[] | undefined;
//# sourceMappingURL=QuickInput.d.ts.map