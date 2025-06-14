/**
 * @module Command (TypeConverter)
 * @description This module provides the `CommandConverter` for marshalling `vscode.Command`
 * objects for IPC, and the `APICommand` structure for defining built-in commands.
 * It serves as the main entry point for command-related type conversion.
 */

import Definition from "./Command/Definition.js";
import Service from "./Command/Service.js";
import * as Type from "./Command/Type.js";

export default {
	Definition,
	Service,
	APICommand: Type.APICommand,
	APICommandArgument: Type.APICommandArgument,
	APICommandResult: Type.APICommandResult,
};
