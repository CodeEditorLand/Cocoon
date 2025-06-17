/*
 * File: Cocoon/Source/Service/Command/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Definition.js, ./Service.js, ./Type.js, effect
 * Export: type CommandHandler, type CommandHandlerEntry
 */

/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";
import type { CommandHandler, CommandHandlerEntry } from "./Type.js";

export { type CommandHandler, type CommandHandlerEntry };

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and WorkSpace services.
 */
export default Layer.effect(Service, Definition);
