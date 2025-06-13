/**
 * @module Configuration
 * @description This module provides the `vscode.workspace.getConfiguration` API
 * implementation, managing access to configuration settings.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js"; // For WorkspaceConfiguration
export * from "./Error.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the Ipc and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIpc, LiveLog)),
);
