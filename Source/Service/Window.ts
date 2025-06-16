/*
 * File: Cocoon/Source/Service/Window.ts
 * Responsibility:
 * Modified: 2025-06-16 14:46:10 UTC
 * Dependency: ./IPC.js, ./IPC/Configuration.js, ./Window/Definition.js, ./Window/Service.js, ./WorkSpace.js, effect
 * Export: Live, default
 */

/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "./IPC.js";
import { type IPCConfiguration } from "./IPC/Configuration.js";
import Definition from "./Window/Definition.js";
import Service from "./Window/Service.js";
import { Live as WorkSpaceLive } from "./WorkSpace.js";

export { default as Service } from "./Window/Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Configuration The IPC Configuration.
 */
export const Live = (Configuration: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Configuration), WorkSpaceLive(Configuration))),
	);
