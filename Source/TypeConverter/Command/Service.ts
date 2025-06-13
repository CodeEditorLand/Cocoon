/**
 * @module Service (Command/TypeConverter)
 * @description Defines the interface for the CommandConverter.
 */
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type * as VSCode from "vscode";

export interface Interface {
	ToInternal(command: VSCode.Command, disposables: IDisposable[]): any;
	FromInternal(dto: any): VSCode.Command | undefined;
}
