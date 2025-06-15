/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "./IPC.js";
import type IPCConfigurationService from "./IPC/Configuration.js";
import Definition from "./Window/Definition.js";
import Service from "./Window/Service.js";
import { Live as WorkSpaceLive } from "./WorkSpace.js";

export { default as Service } from "./Window/Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Config The IPC Configuration.
 */
export const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), WorkSpaceLive(Config))),
	);
