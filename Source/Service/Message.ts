/**
 * @module Message
 * @description This module provides the `vscode.window.show...Message` APIs,
 * proxying requests to the Mountain host to display notifications.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "./IPC.js";
import type IPCConfigurationService from "./IPC/Configuration.js";
import Definition from "./Message/Definition.js";
import Service from "./Message/Service.js";

export { default as Service } from "./Message/Service.js";
export type { default as ExtensionSource } from "./Message/Type.js";

/**
 * The live implementation Layer for the Message service.
 * It depends on the IPC service for communication.
 */
export const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));
