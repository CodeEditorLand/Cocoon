/**
 * @module Command (TypeConverter)
 * @description This module provides the `CommandConverter` for marshalling `vscode.Command`
 * objects for IPC, and the `APICommand` structure for defining built-in commands.
 */

import { Definition as CommandConverterDefinition } from "./Definition.js";
import type { Interface as CommandConverterInterface } from "./Service.js";
import * as Type from "./Type.js";

export const Definition = CommandConverterDefinition;
export type Interface = CommandConverterInterface;
export const APICommand = Type.APICommand;
export const APICommandArgument = Type.APICommandArgument;
export const APICommandResult = Type.APICommandResult;
