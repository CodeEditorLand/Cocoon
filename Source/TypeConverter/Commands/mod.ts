/**
 * @module Commands (TypeConverter)
 * @description This module provides the `CommandsConverter` for marshalling `vscode.Command`
 * objects for IPC, and the `ApiCommand` structure for defining built-in commands.
 */

import { Definition as CommandsConverterDefinition } from "./Definition.js";
import type { Interface as CommandsConverterInterface } from "./Service.js";
import * as Type from "./Type.js";

export const Definition = CommandsConverterDefinition;
export type Interface = CommandsConverterInterface;
export const ApiCommand = Type.ApiCommand;
export const ApiCommandArgument = Type.ApiCommandArgument;
export const ApiCommandResult = Type.ApiCommandResult;
