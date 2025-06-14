/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import { Layer } from "effect";

import type IPCConfiguration from "./IPC/Configuration.js";
import IPCLive from "./IPC/Live.js";
import Definition from "./Window/Definition.js";
import Service from "./Window/Service.js";
import WorkSpaceLive from "./WorkSpace/Live.js";

export { default as Service } from "./Window/Service.js";

/**
 * The live implementation Layer for the Window service.
 * @param Config The IPC Configuration.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), WorkSpaceLive(Config))),
	);
