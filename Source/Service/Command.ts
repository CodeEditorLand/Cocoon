/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import { Definition } from "./Command/Definition.js";
import { Tag } from "./Command/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveTelemetry } from "./Telemetry.js";
import { Live as LiveWorkSpace } from "./WorkSpace.js";

export { Tag, type Interface } from "./Command/Service.js";
export type { CommandHandler, CommandHandlerEntry } from "./Command/Type.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and WorkSpace services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.mergeAll(LiveIPC, LiveTelemetry, LiveWorkSpace)),
);
