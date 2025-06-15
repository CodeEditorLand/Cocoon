/**
 * @module QuickInput
 * @description This module provides the `vscode.window.showQuickPick` and
 * `showInputBox` APIs.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "./IPC.js";
import type IPCConfigurationService from "./IPC/Configuration.js";
import Definition from "./QuickInput/Definition.js";
import Service from "./QuickInput/Service.js";

export { default as Service } from "./QuickInput/Service.js";

/**
 * The live implementation Layer for the QuickInput service.
 * It depends on the IPC service for communication.
 */
export const Live = (Config: IPCConfigurationService) =>
	Layer.effect(Service, Definition).pipe(Layer.provide(IPCLive(Config)));
