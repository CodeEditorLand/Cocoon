/**
 * @module WebViewPanel
 * @description This module provides the `vscode.window.createWebViewPanel` API,
 * allowing extensions to create and manage webview-based UI panels.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";
export type { WebViewPanel } from "vscode";

/**
 * The live implementation Layer for the WebViewPanel service.
 * It depends on the IPC service for communication.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
