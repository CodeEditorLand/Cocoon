/**
 * @module WebviewPanel
 * @description This module provides the `vscode.window.createWebviewPanel` API,
 * allowing extensions to create and manage webview-based UI panels.
 */

import { Layer } from "effect";

import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { WebviewPanel } from "vscode";

/**
 * The live implementation Layer for the WebviewPanel service.
 * It depends on the Ipc service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
