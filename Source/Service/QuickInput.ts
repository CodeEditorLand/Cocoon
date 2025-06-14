/**
 * @module QuickInput
 * @description This module provides the `vscode.window.showQuickPick` and
 * `showInputBox` APIs.
 */

import { Layer } from "effect";

import type IPCConfiguration from "./IPC/Configuration.js";
import IPCLive from "./IPC/Live.js";
import Definition from "./QuickInput/Definition.js";
import Service from "./QuickInput/Service.js";

export { default as Service } from "./QuickInput/Service.js";

/**
 * The live implementation Layer for the QuickInput service.
 * It depends on the IPC service for communication.
 */
export const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));
