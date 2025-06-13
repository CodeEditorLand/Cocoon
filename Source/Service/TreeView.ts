/**
 * @module TreeView
 * @description This module provides the `vscode.window.createTreeView` API, allowing
 * extensions to contribute custom tree views to the sidebar.
 */

import { Layer } from "effect";

import { Live as LiveCommand } from "../Command.js";
import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { TreeView } from "vscode";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the IPC and Command services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveCommand)),
);
