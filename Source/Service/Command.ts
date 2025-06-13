/**
 * @module Commands
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc.js";
import { Live as LiveTelemetry } from "../Telemetry.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { CommandHandler, CommandHandlerEntry } from "./Type.js";

/**
 * The live implementation Layer for the Commands service.
 * It depends on the Ipc and Telemetry services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIpc, LiveTelemetry)),
);
