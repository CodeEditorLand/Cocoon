/**
 * @module Message
 * @description This module provides the `vscode.window.show...Message` APIs,
 * proxying requests to the Mountain host to display notifications.
 */

import { Layer } from "effect";

import type IPCConfiguration from "./IPC/Configuration.js";
import IPCLive from "./IPC/Live.js";
import Definition from "./Message/Definition.js";
import Service from "./Message/Service.js";

export { default as Service } from "./Message/Service.js";
export type { default as ExtensionSource } from "./Message/Type.js";

/**
 * The live implementation Layer for the Message service.
 * It depends on the IPC service for communication.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));
