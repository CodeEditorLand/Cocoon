/**
 * @module Task
 * @description This module provides the `vscode.tasks` API implementation, allowing
 * extensions to define, provide, and execute custom build/run tasks.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Task/Definition.js";
import { Tag } from "./Task/Service.js";

export { Tag, type Interface } from "./Task/Service.js";
export * from "./Task/Type.js";

/**
 * The live implementation Layer for the Tasks service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
