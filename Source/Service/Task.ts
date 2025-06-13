/**
 * @module Tasks
 * @description This module provides the `vscode.tasks` API implementation, allowing
 * extensions to define, provide, and execute custom build/run tasks.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export * from "./Type.js"; // Task, TaskExecution, etc.

/**
 * The live implementation Layer for the Tasks service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
