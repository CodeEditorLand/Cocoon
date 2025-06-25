/**
 * @module StatusBar
 * @description Type converters for the `vscode.StatusBarItem` API.
 */
import type { StatusBarItem as VSCodeStatusBarItem } from "vscode";
import { Command as CommandConverter } from "./Command.js";
interface IStatusbarEntry {
    id: string;
    name: string | undefined;
    text: string;
    tooltip: string | any | undefined;
    command: any | undefined;
    priority: number | undefined;
    alignment: number;
    backgroundColor: string | undefined;
    color: string | undefined;
    accessibilityInformation: any | undefined;
}
/**
 * @description Converts a `vscode.StatusBarItem` object into a plain DTO for IPC.
 * @param From The `vscode.StatusBarItem` instance to convert.
 * @param EntryId The internal UUID for this status bar item instance.
 * @param _ExtensionId The identifier of the extension that owns this item.
 * @param CommandConverter An instance of the command converter.
 * @returns The `IStatusbarEntry` DTO.
 */
export declare const FromAPI: (From: VSCodeStatusBarItem, EntryId: string, _ExtensionId: string, CommandConverter: CommandConverter) => IStatusbarEntry;
export {};
