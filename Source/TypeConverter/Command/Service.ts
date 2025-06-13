/**
 * @module Service (Commands/TypeConverter)
 * @description Defines the interface for the CommandsConverter.
 */
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type * as Vscode from "vscode";

export interface Interface {
	ToInternal(command: Vscode.Command, disposables: IDisposable[]): any;
	FromInternal(dto: any): Vscode.Command | undefined;
}
