/**
 * @module Dialog
 * @description This module provides the `vscode.window` dialog APIs, such as
 * `showOpenDialog` and `showSaveDialog`.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js"; // For dialog option types
export * from "./Error.js";

/**
 * The live implementation Layer for the Dialog service.
 * It depends on the IPC service for all communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
