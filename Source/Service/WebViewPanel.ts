/**
 * @module WebViewPanel
 * @description This module provides the `vscode.window.createWebViewPanel` API,
 * allowing extensions to create and manage webview-based UI panels.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./WebViewPanel/Definition.js";
import { Tag } from "./WebViewPanel/Service.js";

export { Tag, type Interface } from "./WebViewPanel/Service.js";
export type { WebviewPanel } from "vscode";

/**
 * The live implementation Layer for the WebViewPanel service.
 * It depends on the IPC service for communication and Log for diagnostics.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveIPC, LiveLog)),
);
