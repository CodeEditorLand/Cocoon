/**
 * @module StatusBar
 * @description This module provides the `vscode.window.createStatusBarItem` API
 * implementation, allowing extensions to add items to the status bar.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { StatusBarItem } from "vscode";

/**
 * The live implementation Layer for the StatusBar service.
 * It depends on the Ipc service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
