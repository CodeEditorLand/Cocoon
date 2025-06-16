/*
 * File: Cocoon/Source/Service/Command.ts
 * Responsibility:
 * Modified: 2025-06-16 14:46:10 UTC
 * Dependency: ./Command/Definition.js, ./Command/Service.js, ./Command/Type.js, ./IPC.js, ./IPC/Configuration.js, ./Telemetry.js, ./WorkSpace.js, effect
 * Export: Live, default, type CommandHandler, type CommandHandlerEntry
 */

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
import { type IPCConfiguration } from "./IPC/Configuration.js";
import { Live as TelemetryLive } from "./Telemetry.js";
import { Live as WorkSpaceLive } from "./WorkSpace.js";

export { type CommandHandler, type CommandHandlerEntry };
export { default as Service } from "./Command/Service.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and WorkSpace services.
 * @param Configuration The IPC configuration.
 */
export const Live = (Configuration: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Configuration),
				TelemetryLive(Configuration),
				WorkSpaceLive(Configuration),
			),
		),
	);
