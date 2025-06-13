/**
 * @module Dialog
 * @description This module provides the `vscode.window` dialog APIs, such as
 * `showOpenDialog` and `showSaveDialog`.
 */

import { Layer } from "effect";

import { Definition } from "./Dialog/Definition.js";
import { Tag } from "./Dialog/Service.js";
import { Live as LiveIPC } from "./IPC.js";

export { Tag, type Interface } from "./Dialog/Service.js";
export * from "./Dialog/Type.js";
export * from "./Dialog/Error.js";

/**
 * The live implementation Layer for the Dialog service.
 * It depends on the IPC service for all communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
