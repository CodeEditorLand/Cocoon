/**
 * @module Configuration
 * @description This module provides the `vscode.workspace.getConfiguration` API
 * implementation, managing access to configuration settings.
 */

import { Layer } from "effect";

import { Definition } from "./Configuration/Definition.js";
import { Tag } from "./Configuration/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";

export { Tag, type Interface } from "./Configuration/Service.js";
export * from "./Configuration/Type.js";
export * from "./Configuration/Error.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
