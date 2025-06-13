/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Live as LiveTelemetry } from "../Telemetry.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { CommandHandler, CommandHandlerEntry } from "./Type.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC and Telemetry services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveTelemetry)),
);
