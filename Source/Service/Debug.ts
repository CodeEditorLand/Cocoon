/**
 * @module Debug
 * @description This module provides the `vscode.debug` API implementation, managing
 * debug configurations, adapter factories, and debugging sessions.
 */

import { Layer } from "effect";

import { Definition } from "./Debug/Definition.js";
import { Tag } from "./Debug/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";

export { Tag, type Interface } from "./Debug/Service.js";
export * from "./Debug/Type.js";
export * from "./Debug/Error.js";

/**
 * The live implementation Layer for the Debug service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
