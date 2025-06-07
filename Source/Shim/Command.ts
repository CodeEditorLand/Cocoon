/*
 * File: Cocoon/Source/Shim/Command.ts
 * Responsibility: Models the structure of VS Code commands, enabling the `Shim` layer in `Cocoon` to intercept and route extension commands to the `Mountain` backend via `Vine` IPC.
 * Modified: 2025-06-07 00:57:46 UTC
 * Export: Command
 */

// Defines the `Command` class for the `vscode` API shim. This is a simple
// data-holding class used to represent a command to be executed.

/**
 * Represents a command to be executed.
 * This class is a straightforward data container, mirroring the `vscode.Command` interface.
 */
export class Command {
	/**
	 * The title of the command, e.g., 'Save File'.
	 */
	public Title: string;
	/**
	 * The identifier of the command to be executed.
	 */
	public CommandIdentifier: string;
	/**
	 * An optional tooltip or description for the command.
	 */
	public Tooltip?: string;
	/**
	 * An optional array of arguments to pass to the command handler.
	 */
	public Argument?: any[];

	constructor(
		Title: string,
		CommandIdentifier: string,
		Tooltip?: string,
		...RestArgument: any[]
	) {
		this.Title = Title;
		this.CommandIdentifier = CommandIdentifier;
		this.Tooltip = Tooltip;
		this.Argument = RestArgument;
	}
}
c;
