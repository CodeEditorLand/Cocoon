/*
 * File: Cocoon/Source/TypeConverter/Command/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:07 UTC
 * Dependency: vs/base/common/lifecycle.js, vs/platform/commands/common/commands.js, vscode
 * Export: Interface
 */

/**
 * @module Service (Command/TypeConverter)
 * @description Defines the interface for the CommandConverter. This service is
 * responsible for marshalling `vscode.Command` objects into a serializable
 * format for IPC and unmarshalling them back.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { ICommand } from "vs/platform/commands/common/commands.js";
import type * as VSCode from "vscode";

/**
 * The service interface for the CommandConverter.
 */
export default interface Interface {
	/**
	 * Converts a `vscode.Command` into a serializable internal representation.
	 * This handles argument marshalling and the delegation of complex commands.
	 * @param Command The `vscode.Command` to convert.
	 * @param Disposables A list to which any necessary disposables can be added.
	 * @returns The internal `ICommand` DTO, or undefined if the input is undefined.
	 */
	readonly ToInternal: (
		Command: VSCode.Command,
		Disposables: IDisposable[],
	) => ICommand | undefined;

	/**
	 * Converts an internal `ICommand` DTO back into a `vscode.Command`.
	 * @param CommandDTO The internal `ICommand` DTO.
	 * @returns The revived `vscode.Command` or `undefined`.
	 */
	readonly FromInternal: (CommandDTO: ICommand) => VSCode.Command | undefined;
}
