/**
 * @module Debug
 * @description This module provides the `vscode.debug` API implementation, managing
 * debug configurations, adapter factories, and debugging sessions.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Live as LiveLog } from "../Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js";
export * from "./Error.js";

/**
 * The live implementation Layer for the Debug service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
