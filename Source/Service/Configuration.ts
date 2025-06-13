/**
 * @module Configuration
 * @description This module provides the `vscode.workspace.getConfiguration` API
 * implementation, managing access to configuration settings.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js"; // For WorkSpaceConfiguration
export * from "./Error.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
