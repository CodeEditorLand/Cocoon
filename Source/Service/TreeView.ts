/**
 * @module TreeView
 * @description This module provides the `vscode.window.createTreeView` API, allowing
 * extensions to contribute custom tree views to the sidebar.
 */

import { Live as CommandLive } from "./Command.js";
import type IPCConfiguration from "./IPC/Configuration.js";
import { Live as IPCLive } from "./IPC.js";
import Live from "./TreeView/Live.js";
import Service from "./TreeView/Service.js";
import { Layer } from "effect";

export { Service };

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 * @param Config The IPC configuration.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Live).pipe(
		Layer.provide(Layer.merge(IPCLive(Config), CommandLive(Config))),
	);
