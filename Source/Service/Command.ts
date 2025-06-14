/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import { Definition } from "./Command/Definition.js";
import { Tag } from "./Command/Service.js";
import { Live as LiveIPC, type Configuration } from "./IPC.js";
import { Live as LiveTelemetry } from "./Telemetry.js";
import { Live as LiveWorkSpace } from "./WorkSpace.js";

export { Tag, type Interface } from "./Command/Service.js";
export type { CommandHandler, CommandHandlerEntry } from "./Command/Type.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and WorkSpace services.
 * This is a factory that takes IPC configuration.
 * @param Config The IPC configuration.
 */
export const Live = (Config: Configuration) =>
	Layer.effect(Tag, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				LiveIPC(Config),
				LiveTelemetry(Config),
				LiveWorkSpace(Config),
			),
		),
	);
