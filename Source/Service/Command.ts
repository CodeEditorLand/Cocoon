/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import Live from "./Command/Live.js";
import Service from "./Command/Service.js";
import type {
	CommandHandler,
	CommandHandlerEntry,
	TextEditorCommandHandler,
} from "./Command/Type.js";

export {
	Service,
	Live,
	type CommandHandler,
	type CommandHandlerEntry,
	type TextEditorCommandHandler,
};
