/**
 * @module Message
 * @description This module provides the `vscode.window.show...Message` APIs,
 * proxying requests to the Mountain host to display notifications.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Message/Definition.js";
import { Tag } from "./Message/Service.js";

export { Tag, type Interface } from "./Message/Service.js";
export type { ExtensionSource } from "./Message/Type.js";

/**
 * The live implementation Layer for the Message service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
