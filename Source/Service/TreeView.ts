/**
 * @module TreeView
 * @description This module provides the `vscode.window.createTreeView` API, allowing
 * extensions to contribute custom tree views to the sidebar.
 */

import { Layer } from "effect";

import { Live as LiveCommands } from "../Commands.js";
import { Live as LiveIpc } from "../Ipc.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { TreeView } from "vscode";

/**
 * The live implementation Layer for the TreeView service.
 * It depends on the Ipc and Commands services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIpc, LiveCommands)),
);
