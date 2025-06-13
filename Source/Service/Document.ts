/**
 * @module Document
 * @description This module provides the Document service, which is the single
 * source of truth for the state of all open text documents in the extension host.
 */

import { Layer } from "effect";

import { Definition } from "./Document/Definition.js";
import { Tag } from "./Document/Service.js";
import { Live as LiveIPC } from "./IPC.js";

export { Tag, type Interface } from "./Document/Service.js";
export * from "./Document/Type.js";

/**
 * The live implementation Layer for the Document service.
 * It depends on the IPC service to receive updates from the host.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
