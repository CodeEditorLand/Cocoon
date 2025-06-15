/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import Definition from "./Command/Definition.js";
import Service from "./Command/Service.js";
import type { CommandHandler, CommandHandlerEntry } from "./Command/Type.js";
import { Live as IPCLive } from "./IPC.js";
import type IPCConfigurationService from "./IPC/Configuration.js";
import { Live as TelemetryLive } from "./Telemetry.js";
import { Live as WorkSpaceLive } from "./WorkSpace.js";

export { type CommandHandler, type CommandHandlerEntry };
export { default as Service } from "./Command/Service.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and WorkSpace services.
 * @param Config The IPC configuration.
 */
export const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Config),
				TelemetryLive(Config),
				WorkSpaceLive(Config),
			),
		),
	);
