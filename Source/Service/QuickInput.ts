/**
 * @module QuickInput
 * @description This module provides the `vscode.window.showQuickPick` and
 * `showInputBox` APIs.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the QuickInput service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
