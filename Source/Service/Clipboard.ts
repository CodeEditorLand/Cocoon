/**
 * @module Clipboard
 * @description This module provides the `vscode.env.clipboard` API implementation,
 * proxying all clipboard operations to the Mountain host.
 */

import { Layer } from "effect";

import { Definition } from "./Clipboard/Definition.js";
import { Tag } from "./Clipboard/Service.js";
import { Live as LiveIPC } from "./IPC.js";

export { Tag, type Interface } from "./Clipboard/Service.js";

/**
 * The live implementation Layer for the Clipboard service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
