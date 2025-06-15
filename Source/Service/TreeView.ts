/**
 * @module TreeView
 * @description This module provides the `vscode.window.createTreeView` API, allowing
 * extensions to contribute custom tree views to the sidebar.
 */

import { Layer } from "effect";

import { Live as CommandLive } from "./Command.js";
import { Live as IPCLive } from "./IPC.js";
import type IPCConfigurationService from "./IPC/Configuration.js";
import Definition from "./TreeView/Definition.js";
import Service from "./TreeView/Service.js";

export { default as Service } from "./TreeView/Service.js";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 * @param Config The IPC configuration.
 */
export const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), CommandLive(Config))),
	);
