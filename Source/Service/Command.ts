/*
 * File: Cocoon/Source/Service/Command.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Command/Live.js, ./Command/Service.js
 * Export: Live, Service, type CommandHandler, type CommandHandlerEntry, type TextEditorCommandHandler
 */

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
